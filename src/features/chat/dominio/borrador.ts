// The borrador of an evento the asistente proposes (issue #148): what the model
// asks for with the herramienta "proponer_evento", checked with the same rules
// as the form of an evento. Nothing here saves: the app saves the borrador
// only when the person taps Confirmar (#149).
//
// This file and everything it imports run in Deno too, in the Edge Runtime:
// imports stay relative, never use the `@/` alias and name the file with its
// `.ts` extension, which the Edge Runtime needs.

import type { Cargo } from '../../sesion/dominio/cargo.ts';
import type { Duenio, Enfasis, Repeticion } from '../../eventos/dominio/evento.ts';
import { getCategoria } from '../../eventos/dominio/categoria.ts';
import { validarFormulario } from '../../eventos/dominio/formularioDeEvento.ts';
import {
  getDuenioId,
  getDuenioInicial,
  getOpcionDeDuenio,
  getOpcionesDeDuenio,
  type EstructuraConNombres,
  type OpcionDeDuenio,
  type OpcionesDeDuenio,
} from '../../eventos/dominio/opcionesDeDuenio.ts';
import { getHastaSugerido } from '../../eventos/dominio/repeticion.ts';

/** An evento the asistente proposes, ready for the app to draw its card. */
export type BorradorDeEvento = {
  titulo: string;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** `HH:MM:SS`, local to the evento. */
  hora: string;
  /** Last day of an evento that lasts several days. */
  fechaFin: string | null;
  /** Written by the person: it is not one of the lugares of the list. */
  lugar: string | null;
  descripcion: string | null;
  /** Null means "Actividad regular". */
  enfasis: Enfasis | null;
  duenio: Duenio;
  /** "Iglesia Central", "Distrito Centro" or the nombre of the asociacion. */
  duenioNombre: string;
  repeticion: Repeticion;
  /** "Hasta" of a series; null when it does not repeat. */
  finDeSerie: string | null;
};

/**
 * What the model has to fix or ask before proposing. `falta` names the dato
 * the person has to give, when that is the problem: the model asks for it.
 */
export type ErrorDePropuesta = { error: string; falta?: 'duenio' | 'enfasis' };

/** The cargos of the usuario and the structure, to know which duenios they can use. */
export type CargosDelUsuario = {
  cargos: readonly Cargo[];
  estructura: EstructuraConNombres;
};

const ENFASIS: readonly Enfasis[] = [
  'identidad',
  'liderazgo',
  'nuevas_generaciones',
  'discipulado',
];

/** What the model writes for an evento without enfasis. */
const ACTIVIDAD_REGULAR = 'actividad_regular';

const REPETICIONES: readonly Repeticion[] = ['ninguna', 'semanal', 'mensual'];

const FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Characters of the texts the model writes, as the form allows them. */
const MAX_LARGO_DE_TITULO = 120;
const MAX_LARGO_DE_LUGAR = 120;
const MAX_LARGO_DE_DESCRIPCION = 1000;

/** The herramienta the model calls to propose an evento, described for any provider. */
export const HERRAMIENTA_PROPONER_EVENTO = {
  nombre: 'proponer_evento',
  descripcion:
    'Propone un evento nuevo para que la persona lo revise y lo confirme en una tarjeta. ' +
    'No guarda nada. Devuelve el evento listo o lo que hay que corregir o preguntar.',
  parametros: {
    type: 'object',
    properties: {
      titulo: { type: 'string', description: 'Título del evento.' },
      fecha: { type: 'string', description: 'Primer día, en formato AAAA-MM-DD.' },
      hora: { type: 'string', description: 'Hora de inicio, en formato HH:MM (24 horas).' },
      fecha_fin: {
        type: ['string', 'null'],
        description: 'Último día de un evento de varios días, AAAA-MM-DD. Null si dura un día.',
      },
      lugar: { type: ['string', 'null'], description: 'Lugar, tal como lo dijo la persona.' },
      descripcion: { type: ['string', 'null'], description: 'Descripción, si la dio.' },
      enfasis: {
        type: ['string', 'null'],
        enum: [...ENFASIS, ACTIVIDAD_REGULAR, null],
        description:
          'Énfasis del evento, o "actividad_regular" si no tiene. Null si la persona no lo dijo.',
      },
      duenio: {
        type: ['string', 'null'],
        description: 'Id del dueño elegido de la lista. Null si la persona no lo dijo.',
      },
      repeticion: {
        type: 'string',
        enum: REPETICIONES,
        description:
          '"semanal" (el mismo día todas las semanas), "mensual" (el mismo día de la semana y la misma posición en el mes) o "ninguna".',
      },
      hasta: {
        type: ['string', 'null'],
        description:
          'Último día en que se repite, AAAA-MM-DD. Null si no se repite o la persona no lo dijo.',
      },
    },
    required: [
      'titulo',
      'fecha',
      'hora',
      'fecha_fin',
      'lugar',
      'descripcion',
      'enfasis',
      'duenio',
      'repeticion',
      'hasta',
    ],
    additionalProperties: false,
  },
} as const;

function isDia(value: unknown): value is string {
  const match = typeof value === 'string' ? FECHA.exec(value) : null;
  if (!match) {
    return false;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function isTextoONull(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/** An optional text, trimmed and cut to its length; null when nothing is left. */
function optionalText(value: string | null, largo: number): string | null {
  const trimmed = value?.trim().slice(0, largo) ?? '';
  return trimmed === '' ? null : trimmed;
}

function allOpciones(opciones: OpcionesDeDuenio): OpcionDeDuenio[] {
  return [...opciones.asociaciones, ...opciones.distritos, ...opciones.iglesias];
}

/** The duenios a usuario can give an evento, with the rule of the form. */
export function getDueniosDelUsuario({ cargos, estructura }: CargosDelUsuario): OpcionDeDuenio[] {
  return allOpciones(getOpcionesDeDuenio(cargos, estructura));
}

/** The list of duenios the model chooses from: "- i1: Iglesia Central". */
export function describirDuenios(duenios: readonly OpcionDeDuenio[]): string {
  return duenios.map(({ duenio, nombre }) => `- ${getDuenioId(duenio)}: ${nombre}`).join('\n');
}

/** The duenio of the propuesta, or what the model has to ask or fix. */
function resolverDuenio(
  pedido: unknown,
  opciones: OpcionesDeDuenio,
): OpcionDeDuenio | ErrorDePropuesta {
  const todas = allOpciones(opciones);

  if (todas.length === 0) {
    return { error: 'La persona no tiene ningún dueño posible: no puede crear eventos.' };
  }
  if (pedido === null) {
    const inicial = getDuenioInicial(opciones);
    return inicial === null
      ? {
          error:
            'Preguntá de quién es el evento antes de proponerlo. Puede ser de:\n' +
            describirDuenios(todas),
          falta: 'duenio',
        }
      : (getOpcionDeDuenio(opciones, inicial) as OpcionDeDuenio);
  }

  // A cargo covers its duenio or not: an id outside the list is never used.
  const elegida = todas.find(({ duenio }) => getDuenioId(duenio) === pedido);
  return (
    elegida ?? {
      error:
        'Ese dueño no está entre los que la persona puede usar. Puede ser de:\n' +
        describirDuenios(todas),
    }
  );
}

/**
 * Reads what the model asked for with "proponer_evento": the borrador, checked
 * with the rules of the form, or what the model has to ask or fix, written for
 * it. `hoy` is the day in the zona horaria of the asociacion.
 */
export function leerPropuesta(
  argumentos: unknown,
  cargos: CargosDelUsuario,
  hoy: string,
): { borrador: BorradorDeEvento } | ErrorDePropuesta {
  const pedido =
    typeof argumentos === 'object' && argumentos !== null
      ? (argumentos as Record<string, unknown>)
      : null;

  if (
    pedido === null ||
    typeof pedido.titulo !== 'string' ||
    typeof pedido.hora !== 'string' ||
    !isTextoONull(pedido.fecha_fin) ||
    !isTextoONull(pedido.lugar) ||
    !isTextoONull(pedido.descripcion) ||
    !isTextoONull(pedido.duenio) ||
    !isTextoONull(pedido.hasta) ||
    !REPETICIONES.includes(pedido.repeticion as Repeticion)
  ) {
    return { error: 'Los datos del evento no tienen el formato de la herramienta.' };
  }
  if (!isDia(pedido.fecha)) {
    return { error: 'La fecha tiene que ser un día real en formato AAAA-MM-DD.' };
  }
  if (pedido.fecha_fin !== null && !isDia(pedido.fecha_fin)) {
    return { error: 'La fecha de fin tiene que ser un día real en formato AAAA-MM-DD.' };
  }
  if (pedido.hasta !== null && !isDia(pedido.hasta)) {
    return { error: '"hasta" tiene que ser un día real en formato AAAA-MM-DD.' };
  }

  const { enfasis } = pedido;
  if (enfasis !== ACTIVIDAD_REGULAR && !ENFASIS.includes(enfasis as Enfasis)) {
    return {
      error:
        'Falta el énfasis. Preguntá si es de Identidad, Liderazgo, Nuevas Generaciones, ' +
        'Discipulado o una actividad regular, y no lo propongas hasta saberlo.',
      falta: 'enfasis',
    };
  }

  const opcion = resolverDuenio(
    pedido.duenio,
    getOpcionesDeDuenio(cargos.cargos, cargos.estructura),
  );
  if ('error' in opcion) {
    return opcion;
  }

  const repeticion = pedido.repeticion as Repeticion;
  // A series without "Hasta" takes the one the form suggests: a year.
  const finDeSerie =
    repeticion === 'ninguna' ? null : (pedido.hasta ?? getHastaSugerido(pedido.fecha));
  const resultado = validarFormulario(
    {
      titulo: pedido.titulo.slice(0, MAX_LARGO_DE_TITULO),
      duenio: opcion.duenio,
      fecha: pedido.fecha,
      hora: pedido.hora,
      fechaFin: pedido.fecha_fin,
      repeticion,
      finDeSerie,
      lugar: null,
      descripcion: '',
      categoria: getCategoria(enfasis === ACTIVIDAD_REGULAR ? null : (enfasis as Enfasis)),
      iglesiasSumadas: [],
    },
    { hoy, editando: false },
  );

  if (!resultado.ok) {
    return { error: Object.values(resultado.errores).join(' ') };
  }

  const { evento } = resultado;
  return {
    borrador: {
      titulo: evento.titulo,
      fecha: pedido.fecha,
      hora: evento.hora,
      fechaFin: evento.fechaFin,
      lugar: optionalText(pedido.lugar, MAX_LARGO_DE_LUGAR),
      descripcion: optionalText(pedido.descripcion, MAX_LARGO_DE_DESCRIPCION),
      enfasis: evento.enfasis,
      duenio: evento.duenio,
      duenioNombre: opcion.nombre,
      repeticion: evento.repeticion,
      finDeSerie: evento.finDeSerie,
    },
  };
}

function isDuenio(value: unknown): value is Duenio {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { alcance, iglesiaId, distritoId, asociacionId } = value as Record<string, unknown>;
  switch (alcance) {
    case 'iglesia':
      return typeof iglesiaId === 'string';
    case 'distrito':
      return typeof distritoId === 'string';
    case 'asociacion':
      return typeof asociacionId === 'string';
    default:
      return false;
  }
}

/** Whether a value is a borrador as the server sends it, for the app to trust it. */
export function isBorrador(value: unknown): value is BorradorDeEvento {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const borrador = value as Record<string, unknown>;
  return (
    typeof borrador.titulo === 'string' &&
    typeof borrador.fecha === 'string' &&
    typeof borrador.hora === 'string' &&
    isTextoONull(borrador.fechaFin) &&
    isTextoONull(borrador.lugar) &&
    isTextoONull(borrador.descripcion) &&
    (borrador.enfasis === null || ENFASIS.includes(borrador.enfasis as Enfasis)) &&
    isDuenio(borrador.duenio) &&
    typeof borrador.duenioNombre === 'string' &&
    REPETICIONES.includes(borrador.repeticion as Repeticion) &&
    isTextoONull(borrador.finDeSerie)
  );
}
