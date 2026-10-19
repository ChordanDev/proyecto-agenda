// A consulta to the chat, from the pedido of the app to its respuesta, without
// knowing the provider of the model or the database: both come in as ports.
// The server function (supabase/functions/chat-consulta) wires the real ones;
// the tests use fakes, so none of them reaches OpenAI.
//
// This file and everything it imports run in Deno too, in the Edge Runtime:
// imports stay relative, never use the `@/` alias and name the file with its
// `.ts` extension, which the Edge Runtime needs.

import type { Alcance, Enfasis } from '../../eventos/dominio/evento.ts';
import { decidirBusqueda } from './ambiguedad.ts';
import {
  HERRAMIENTA_PROPONER_EVENTO,
  describirDuenios,
  getDueniosDelUsuario,
  leerPropuesta,
  type BorradorDeEvento,
  type CargosDelUsuario,
} from './borrador.ts';
import {
  decidirConsulta,
  getAvisoDeConsultasRestantes,
  type ContadorDeConsultas,
  type GastoDelMes,
} from './limites.ts';
import { getPeriodo } from './periodo.ts';

/** Characters a mensaje can have. */
export const MAX_LARGO_DE_MENSAJE = 500;

/** Mensajes of the conversation before this one that go to the model. */
export const MAX_MENSAJES_DEL_TRAMO = 6;

/** Characters of each mensaje of the tramo that go to the model. */
const MAX_LARGO_DEL_TRAMO = 2000;

/** Rounds of herramientas (busquedas and propuestas) the model can ask for in one consulta. */
export const MAX_BUSQUEDAS = 3;

/** Herramientas the model can call at once, in one round. */
export const MAX_LLAMADAS_POR_RONDA = 3;

/** Days a busqueda can span, so one cannot read the whole calendario. */
export const MAX_DIAS_DE_BUSQUEDA = 366;

/** Characters of the texto of a busqueda. */
const MAX_LARGO_DE_TEXTO = 100;

/**
 * Why a consulta has no respuesta. Only a respuesta counts as a consulta: none
 * of these adds to the consultas of the dia or to the gasto of the mes.
 * - `sin_sesion`: the call has no usuario with a sesion.
 * - `pedido_invalido`: the body is not a pedido of the app.
 * - `mensaje_largo`: the mensaje has more than 500 characters.
 * - `sin_consentimiento`, `limite_diario`, `presupuesto_agotado`: the limits
 *   of the chat (limites.ts).
 * - `proveedor_caido`: the provider of the model failed or answered nothing.
 * - `error_servidor`: anything else failed (the database).
 */
export type FallaDeConsulta =
  | 'sin_sesion'
  | 'pedido_invalido'
  | 'mensaje_largo'
  | 'sin_consentimiento'
  | 'limite_diario'
  | 'presupuesto_agotado'
  | 'proveedor_caido'
  | 'error_servidor';

/** A mensaje of the conversation before this one. The server does not keep them: the app sends them. */
export type MensajeDelTramo = { autor: 'usuario' | 'asistente'; texto: string };

/** An evento found by a busqueda, for the app to draw it with its shape and color. */
export type EventoDeChat = {
  id: string;
  titulo: string;
  /** The day of this date of the evento, `YYYY-MM-DD`; a series has one per date. */
  fecha: string;
  /** Last day of an evento that lasts several days. */
  fechaFin: string | null;
  /** `HH:MM:SS`, local to the evento. */
  hora: string;
  lugar: string | null;
  descripcion: string | null;
  /** Null means "Actividad regular". */
  enfasis: Enfasis | null;
  alcance: Alcance;
  /** Nombre of the iglesia, distrito or asociacion the evento belongs to. */
  duenio: string;
};

/**
 * The respuesta of a consulta.
 * - `tipo`: `repregunta` when the pregunta has to be narrowed (too many
 *   coincidencias) or an evento cannot be proposed until the person says
 *   whose it is or its enfasis; `respuesta` otherwise.
 * - `eventos`: the coincidencias to draw, at most three; empty on a repregunta.
 * - `aviso`: "Te quedan 3 consultas por hoy", when few are left.
 * - `borrador`: the evento the asistente proposes, for the app to draw its
 *   card; nothing is saved until the person taps Confirmar. Null when none.
 */
export type RespuestaDeConsulta = {
  tipo: 'respuesta' | 'repregunta';
  texto: string;
  eventos: EventoDeChat[];
  aviso: string | null;
  borrador: BorradorDeEvento | null;
};

export type ResultadoDeConsulta =
  { ok: true; respuesta: RespuestaDeConsulta } | { ok: false; falla: FallaDeConsulta };

/** What the chat knows about the usuario and the mes before calling the model. */
export type EstadoDelChat = {
  consentimiento: boolean;
  consultas: ContadorDeConsultas | null;
  gasto: GastoDelMes | null;
  /** IANA name of the zona horaria of the asociacion of the usuario. */
  zonaHoraria: string;
};

/** A busqueda of eventos between two days, both included. */
export type Busqueda = { desde: string; hasta: string; texto: string | null };

/** The first coincidencias of a busqueda, in order of fecha, and how many there are. */
export type ResultadoDeBusqueda = { eventos: EventoDeChat[]; total: number };

/** The herramientas the model can call. None of them writes. */
export type NombreDeHerramienta = 'buscar_eventos' | 'proponer_evento';

/**
 * A herramienta the model calls: a busqueda, unless `herramienta` says
 * otherwise. Its arguments are whatever the model wrote.
 */
export type LlamadaABusqueda = {
  id: string;
  herramienta?: NombreDeHerramienta;
  argumentos: unknown;
};

/** The conversation as the provider receives it, in its neutral form. */
export type MensajeParaProveedor =
  | { rol: 'sistema' | 'usuario' | 'asistente'; texto: string }
  | { rol: 'pedido_de_busqueda'; llamadas: LlamadaABusqueda[] }
  | { rol: 'busqueda'; llamadaId: string; contenido: string };

/** What the model can do in a round: search, and propose an evento when the cargos allow it. */
export type OpcionesDeRonda = { conBusqueda: boolean; conPropuesta: boolean };

/** What a call to the model returns, with what it cost. */
export type RespuestaDelProveedor =
  | { tipo: 'texto'; texto: string; costoUsd: number }
  | { tipo: 'busqueda'; llamadas: LlamadaABusqueda[]; costoUsd: number };

/** The model. Changing it is writing another one of these. */
export type Proveedor = {
  /** Throws when the provider fails. */
  responder(
    mensajes: readonly MensajeParaProveedor[],
    opciones: OpcionesDeRonda,
  ): Promise<RespuestaDelProveedor>;
};

/**
 * What the database answers to a reserva: `reservada`, or why not. It counts
 * the consulta at once, so consultas sent at the same time cannot all pass the
 * limite diario.
 */
export type ResultadoDeReserva = 'reservada' | 'limite_diario' | 'presupuesto_agotado';

/** Everything a consulta reaches outside the domain, bound to the usuario who asks. */
export type PuertosDeConsulta = {
  ahora(): Date;
  leerEstado(): Promise<EstadoDelChat>;
  /** Reads the cargos of the usuario and the structure, to know whose eventos they can propose. */
  leerCargos(): Promise<CargosDelUsuario>;
  /** Runs with the identity of the usuario: it only finds what their calendario shows. */
  buscarEventos(busqueda: Busqueda): Promise<ResultadoDeBusqueda>;
  /** Counts the consulta before the model is called, unless the limits are reached. */
  reservarConsulta(reserva: {
    usuarioId: string;
    dia: string;
    mes: string;
  }): Promise<ResultadoDeReserva>;
  /** Adds the costo of an answered consulta and returns the consultas of the dia. */
  confirmarConsulta(registro: {
    usuarioId: string;
    dia: string;
    mes: string;
    costoUsd: number;
  }): Promise<{ consultasDelDia: number }>;
  /** Takes back the reserva of a consulta whose respuesta failed. */
  liberarConsulta(reserva: { usuarioId: string; dia: string }): Promise<void>;
  proveedor: Proveedor;
  /**
   * Reports why a consulta failed, for whoever runs the server. It gets the
   * cause only (the status of the provider, the error of the database), never
   * the mensaje or the tramo.
   */
  informarError(causa: string): void;
};

/** The busqueda the model can call, described for any provider. */
export const HERRAMIENTA_BUSCAR_EVENTOS = {
  nombre: 'buscar_eventos',
  descripcion:
    'Busca eventos del calendario del usuario entre dos fechas (incluidas). ' +
    'Devuelve el total de coincidencias y, si son pocas, los eventos.',
  parametros: {
    type: 'object',
    properties: {
      desde: { type: 'string', description: 'Primer día, en formato AAAA-MM-DD.' },
      hasta: {
        type: 'string',
        description: `Último día, en formato AAAA-MM-DD. Como mucho ${MAX_DIAS_DE_BUSQUEDA} días después de "desde".`,
      },
      texto: {
        type: ['string', 'null'],
        description:
          'Palabras a buscar en el título, el lugar, la descripción o la iglesia del evento. Null para traer todos.',
      },
    },
    required: ['desde', 'hasta', 'texto'],
    additionalProperties: false,
  },
} as const;

/** The herramientas of a round, described for any provider. None of them writes. */
export function getHerramientas({
  conBusqueda,
  conPropuesta,
}: OpcionesDeRonda): readonly (
  typeof HERRAMIENTA_BUSCAR_EVENTOS | typeof HERRAMIENTA_PROPONER_EVENTO
)[] {
  return [
    ...(conBusqueda ? [HERRAMIENTA_BUSCAR_EVENTOS] : []),
    ...(conPropuesta ? [HERRAMIENTA_PROPONER_EVENTO] : []),
  ];
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The UTC midnight of a `YYYY-MM-DD` day; null when it is not a real day. */
function toDia(value: unknown): number | null {
  const match = typeof value === 'string' ? FECHA.exec(value) : null;
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const time = Date.UTC(year, month - 1, day);
  const date = new Date(time);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? time
    : null;
}

/** "sábado 17 de octubre de 2026". */
function describirDia(dia: string): string {
  const date = new Date(toDia(dia) ?? NaN);

  return `${DIAS[date.getUTCDay()]} ${date.getUTCDate()} de ${MESES[date.getUTCMonth()]} de ${date.getUTCFullYear()}`;
}

/** What the model is told about proposing eventos, with the duenios it can use. */
function getInstruccionesDeCarga(duenios: ReturnType<typeof getDueniosDelUsuario>): string[] {
  if (duenios.length === 0) {
    return ['Esta persona no puede crear eventos: si lo pide, decile que su cargo no lo permite.'];
  }
  return [
    'Para cargar un evento nuevo usá proponer_evento. Nunca digas que el evento quedó guardado: la persona lo revisa en una tarjeta y lo guarda con Confirmar.',
    'Antes de proponer, preguntá lo que falte y no lo inventes: el énfasis (Identidad, Liderazgo, Nuevas Generaciones, Discipulado o actividad regular) y, si hay más de un dueño posible y la persona no lo dijo, de quién es el evento.',
    'Por el chat solo se crean eventos. Para editar o borrar uno, indicá que lo haga desde el detalle del evento.',
    `Dueños que puede usar (id: nombre):\n${describirDuenios(duenios)}`,
  ];
}

function getInstrucciones(
  hoy: string,
  zonaHoraria: string,
  duenios: ReturnType<typeof getDueniosDelUsuario>,
): string {
  return [
    'Sos el asistente del calendario de la iglesia. Respondés en español, breve y claro: te leen personas de todas las edades.',
    'Solo hablás del calendario. Ante cualquier otra cosa respondé que solo podés ayudar con el calendario.',
    `Hoy es ${describirDia(hoy)} (${hoy}), en la zona horaria ${zonaHoraria}. Las fechas relativas ("el sábado que viene") se cuentan desde hoy.`,
    'Para saber qué eventos hay, usá buscar_eventos. Nunca inventes eventos ni datos: respondé solo con lo que devuelve.',
    'Si a un evento le falta la información que te piden (por ejemplo, no tiene descripción o lugar), decilo y no la rellenes.',
    'Cuando nombres un evento, decí su fecha y su iglesia.',
    'Si buscar_eventos te indica que hay demasiadas coincidencias, no las enumeres: pedí que precise la fecha o la iglesia.',
    ...getInstruccionesDeCarga(duenios),
  ].join('\n');
}

type Pedido = { mensaje: string; tramo: MensajeDelTramo[] };

function isMensajeDelTramo(value: unknown): value is MensajeDelTramo {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { autor, texto } = value as Record<string, unknown>;
  return (autor === 'usuario' || autor === 'asistente') && typeof texto === 'string';
}

/** The pedido of the app, or the falla that rejects it. */
function leerPedido(body: unknown): Pedido | FallaDeConsulta {
  if (typeof body !== 'object' || body === null) {
    return 'pedido_invalido';
  }
  const { mensaje, tramo = [] } = body as Record<string, unknown>;

  if (typeof mensaje !== 'string' || mensaje.trim() === '') {
    return 'pedido_invalido';
  }
  // Characters as people count them: an emoji is one.
  if ([...mensaje].length > MAX_LARGO_DE_MENSAJE) {
    return 'mensaje_largo';
  }
  if (!Array.isArray(tramo)) {
    return 'pedido_invalido';
  }

  // Only the recent tramo goes to the model, so older mensajes are not read.
  const reciente = tramo.slice(-MAX_MENSAJES_DEL_TRAMO);
  if (!reciente.every(isMensajeDelTramo)) {
    return 'pedido_invalido';
  }

  return {
    mensaje: mensaje.trim(),
    tramo: reciente.map(({ autor, texto }) => ({
      autor,
      texto: texto.slice(0, MAX_LARGO_DEL_TRAMO),
    })),
  };
}

/** The busqueda the model asked for, or what is wrong with it, for the model to fix it. */
function leerBusqueda(argumentos: unknown): Busqueda | { error: string } {
  const { desde, hasta, texto } =
    typeof argumentos === 'object' && argumentos !== null
      ? (argumentos as Record<string, unknown>)
      : ({} as Record<string, unknown>);
  const inicio = toDia(desde);
  const fin = toDia(hasta);

  if (inicio === null || fin === null) {
    return {
      error: 'Las fechas "desde" y "hasta" tienen que ser días reales en formato AAAA-MM-DD.',
    };
  }
  if (fin < inicio) {
    return { error: '"hasta" no puede ser anterior a "desde".' };
  }
  if ((fin - inicio) / 86_400_000 > MAX_DIAS_DE_BUSQUEDA) {
    return { error: `La búsqueda abarca como mucho ${MAX_DIAS_DE_BUSQUEDA} días.` };
  }
  if (texto !== undefined && texto !== null && typeof texto !== 'string') {
    return { error: '"texto" tiene que ser un texto o null.' };
  }

  const palabras = typeof texto === 'string' ? texto.trim().slice(0, MAX_LARGO_DE_TEXTO) : '';

  return {
    desde: desde as string,
    hasta: hasta as string,
    texto: palabras === '' ? null : palabras,
  };
}

/**
 * The coincidencias of every busqueda of a consulta. The ambiguity rule counts
 * them together: a consulta that found four or more, in one busqueda or adding
 * several, asks to narrow the pregunta.
 */
type Coincidencias = { repreguntar: boolean; eventos: Map<string, EventoDeChat> };

/** A date of an evento: a series found twice on the same date is one coincidencia. */
function getClave(evento: EventoDeChat): string {
  return `${evento.id}|${evento.fecha}`;
}

/**
 * Adds a busqueda to the coincidencias of the consulta and returns what the
 * model reads back from it: never eventos it should not list.
 */
function sumarBusqueda(
  coincidencias: Coincidencias,
  { eventos, total }: ResultadoDeBusqueda,
): string {
  const juntas = new Map(coincidencias.eventos);
  for (const evento of eventos) {
    juntas.set(getClave(evento), evento);
  }

  // A busqueda of up to three returns all of them, so `juntas` holds every
  // coincidencia found so far.
  if (decidirBusqueda(total) === 'repreguntar' || decidirBusqueda(juntas.size) === 'repreguntar') {
    coincidencias.repreguntar = true;
    return JSON.stringify({
      total,
      eventos: [],
      indicacion: `Hay ${Math.max(total, juntas.size)} coincidencias: no las enumeres; pedí que precise la fecha o la iglesia.`,
    });
  }

  coincidencias.eventos = juntas;
  return JSON.stringify({ total, eventos });
}

/** The eventos a respuesta shows, in order of fecha and hora. */
function getEventosDeRespuesta({ repreguntar, eventos }: Coincidencias): EventoDeChat[] {
  if (repreguntar) {
    return [];
  }
  return [...eventos.values()].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora),
  );
}

/** The provider failed: the consulta fails as proveedor_caido. */
class ProveedorCaido extends Error {}

function getCausa(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The evento the model proposed: the last valid propuesta, and whether the
 * last one it tried lacks a dato the person has to give.
 */
type Propuesta = { borrador: BorradorDeEvento | null; faltaDato: boolean };

/** What a consulta needs to check a propuesta. */
type ContextoDePropuesta = { cargos: CargosDelUsuario; hoy: string; puedeProponer: boolean };

/**
 * Checks a propuesta of the model and returns what it reads back from it. A
 * valid one becomes the borrador of the respuesta; nothing is saved.
 */
function sumarPropuesta(
  propuesta: Propuesta,
  argumentos: unknown,
  contexto: ContextoDePropuesta,
): string {
  if (!contexto.puedeProponer) {
    return JSON.stringify({ error: 'Esta persona no puede crear eventos.' });
  }

  const resultado = leerPropuesta(argumentos, contexto.cargos, contexto.hoy);
  if ('error' in resultado) {
    propuesta.faltaDato = resultado.falta !== undefined;
    return JSON.stringify({ error: resultado.error });
  }

  propuesta.borrador = resultado.borrador;
  propuesta.faltaDato = false;
  return JSON.stringify({
    estado: 'propuesto',
    indicacion:
      'La app muestra el evento en una tarjeta. No está guardado: la persona lo revisa y lo guarda con Confirmar. Decíselo en una frase.',
  });
}

/** What the model answered, with what all its calls cost and what its herramientas found. */
type Conversacion = {
  texto: string;
  costoUsd: number;
  coincidencias: Coincidencias;
  propuesta: Propuesta;
};

/** Talks with the model, running the herramientas it asks for, until it answers. */
async function conversar(
  mensajes: MensajeParaProveedor[],
  puertos: PuertosDeConsulta,
  contexto: ContextoDePropuesta,
): Promise<Conversacion> {
  let costoUsd = 0;
  const coincidencias: Coincidencias = { repreguntar: false, eventos: new Map() };
  const propuesta: Propuesta = { borrador: null, faltaDato: false };

  for (let ronda = 0; ; ronda++) {
    const conBusqueda = ronda < MAX_BUSQUEDAS;
    const conPropuesta = conBusqueda && contexto.puedeProponer;
    const respuesta = await puertos.proveedor
      .responder(mensajes, { conBusqueda, conPropuesta })
      .catch((error: unknown) => {
        throw new ProveedorCaido(`The provider failed: ${getCausa(error)}`);
      });
    costoUsd += respuesta.costoUsd;

    if (respuesta.tipo === 'texto') {
      if (respuesta.texto.trim() === '') {
        throw new ProveedorCaido('The provider answered with no text');
      }
      return { texto: respuesta.texto.trim(), costoUsd, coincidencias, propuesta };
    }

    if (!conBusqueda || respuesta.llamadas.length === 0) {
      throw new ProveedorCaido('The provider kept searching without the busqueda');
    }

    mensajes.push({ rol: 'pedido_de_busqueda', llamadas: respuesta.llamadas });
    for (const [indice, llamada] of respuesta.llamadas.entries()) {
      if (indice < MAX_LLAMADAS_POR_RONDA && llamada.herramienta === 'proponer_evento') {
        mensajes.push({
          rol: 'busqueda',
          llamadaId: llamada.id,
          contenido: sumarPropuesta(propuesta, llamada.argumentos, contexto),
        });
        continue;
      }

      // Every llamada needs its result, so the extra ones get an error.
      const busqueda =
        indice < MAX_LLAMADAS_POR_RONDA
          ? leerBusqueda(llamada.argumentos)
          : { error: `Solo se hacen ${MAX_LLAMADAS_POR_RONDA} búsquedas a la vez.` };

      if ('error' in busqueda) {
        mensajes.push({
          rol: 'busqueda',
          llamadaId: llamada.id,
          contenido: JSON.stringify(busqueda),
        });
        continue;
      }

      const resultado = await puertos.buscarEventos(busqueda);
      mensajes.push({
        rol: 'busqueda',
        llamadaId: llamada.id,
        contenido: sumarBusqueda(coincidencias, resultado),
      });
    }
  }
}

/**
 * Answers a consulta of the chat. `usuarioId` is null when the call has no
 * valid sesion. The order matters: nothing reaches the model before the limits
 * allow it and the consulta is reserved, and a reserva whose respuesta fails is
 * freed, so it counts nothing.
 */
export async function responderConsulta(
  body: unknown,
  usuarioId: string | null,
  puertos: PuertosDeConsulta,
): Promise<ResultadoDeConsulta> {
  if (usuarioId === null) {
    return { ok: false, falla: 'sin_sesion' };
  }

  const pedido = leerPedido(body);
  if (typeof pedido === 'string') {
    return { ok: false, falla: pedido };
  }

  try {
    const ahora = puertos.ahora();
    const estado = await puertos.leerEstado();
    const decision = decidirConsulta({ ahora, ...estado });

    if (decision !== 'permitida') {
      const fallas = {
        'sin-consentimiento': 'sin_consentimiento',
        'limite-diario': 'limite_diario',
        'presupuesto-agotado': 'presupuesto_agotado',
      } as const;
      return { ok: false, falla: fallas[decision] };
    }

    // The counters read above can be already old: the reserva is what holds
    // the limits when consultas arrive at the same time.
    const { dia, mes } = getPeriodo(ahora, estado.zonaHoraria);
    const reserva = await puertos.reservarConsulta({ usuarioId, dia, mes });
    if (reserva !== 'reservada') {
      return { ok: false, falla: reserva };
    }

    try {
      const cargos = await puertos.leerCargos();
      const duenios = getDueniosDelUsuario(cargos);
      const { texto, costoUsd, coincidencias, propuesta } = await conversar(
        [
          { rol: 'sistema', texto: getInstrucciones(dia, estado.zonaHoraria, duenios) },
          ...pedido.tramo.map(({ autor, texto: contenido }) => ({ rol: autor, texto: contenido })),
          { rol: 'usuario', texto: pedido.mensaje },
        ],
        puertos,
        { cargos, hoy: dia, puedeProponer: duenios.length > 0 },
      );
      const { consultasDelDia } = await puertos.confirmarConsulta({
        usuarioId,
        dia,
        mes,
        costoUsd,
      });

      return {
        ok: true,
        respuesta: {
          tipo:
            coincidencias.repreguntar || (propuesta.faltaDato && propuesta.borrador === null)
              ? 'repregunta'
              : 'respuesta',
          texto,
          eventos: getEventosDeRespuesta(coincidencias),
          aviso: getAvisoDeConsultasRestantes(consultasDelDia),
          borrador: propuesta.borrador,
        },
      };
    } catch (error) {
      await puertos.liberarConsulta({ usuarioId, dia }).catch((causa: unknown) => {
        puertos.informarError(`Could not free the reserva: ${getCausa(causa)}`);
      });
      throw error;
    }
  } catch (error) {
    puertos.informarError(getCausa(error));
    return {
      ok: false,
      falla: error instanceof ProveedorCaido ? 'proveedor_caido' : 'error_servidor',
    };
  }
}
