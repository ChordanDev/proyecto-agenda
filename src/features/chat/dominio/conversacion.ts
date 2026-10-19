// The conversacion of the chat, kept in memory only: neither the server nor
// the phone saves it. Every change goes through `reducirConversacion`, so the
// screen only draws what this file decides.

import { formatDayHeading, formatTime } from '@/features/calendario/dominio/calendarioTexts';
import { getCategoria, type Categoria } from '@/features/eventos/dominio/categoria';

import type { BorradorDeEvento } from './borrador';
import {
  MAX_LARGO_DE_MENSAJE,
  MAX_MENSAJES_DEL_TRAMO,
  type EventoDeChat,
  type MensajeDelTramo,
  type RespuestaDeConsulta,
} from './consulta';
import { getEstadoDeFalla, type Falla } from './fallas';
import { getIdDelIntento, REPORTE_INICIAL, type MotivoDeReporte, type Reporte } from './reporte';

/**
 * Where the vista previa of a borrador stands: waiting for Confirmar or
 * Editar, being saved, or saved once, which it cannot be again.
 */
export type EstadoDePropuesta = 'pendiente' | 'guardando' | 'guardado';

/**
 * A mensaje of the conversacion. New kinds are new members of this union.
 * - `pregunta`: what the usuario wrote.
 * - `respuesta`: what the asistente answered, with the eventos it found.
 * - `falla`: the pregunta before it got no respuesta, and can be retried.
 * - `propuesta`: a respuesta with the borrador of an evento, drawn as its
 *   vista previa. Its `id`, a UUID, is the id its evento is created with: a
 *   save tried again, from Confirmar or from Editar, saves that one evento.
 *   `error` is why the last Confirmar failed. `eventos` are the ones found
 *   in the same respuesta, as "¿Qué hay el sábado? Si está libre, cargame…".
 * Both kinds of respuesta carry their `reporte`: either can be reported once.
 */
export type MensajeDeChat =
  | { tipo: 'pregunta'; id: string; texto: string }
  | { tipo: 'respuesta'; id: string; texto: string; eventos: EventoDeChat[]; reporte: Reporte }
  | { tipo: 'falla'; id: string; falla: 'sin-conexion' | 'caido' }
  | {
      tipo: 'propuesta';
      id: string;
      texto: string;
      eventos: EventoDeChat[];
      borrador: BorradorDeEvento;
      estado: EstadoDePropuesta;
      error: string | null;
      reporte: Reporte;
    };

/**
 * Why the usuario cannot write: the limite diario closes the cuadro de texto,
 * the presupuesto agotado the whole chat.
 */
export type Bloqueo = 'limite-diario' | 'presupuesto-agotado';

export type Conversacion = {
  /** Tells this conversacion from the one "Nueva conversación" starts, so a late respuesta is dropped. */
  id: number;
  mensajes: MensajeDeChat[];
  /** Whether a pregunta is waiting for its respuesta: one at a time. */
  enviando: boolean;
  /** "Te quedan 5 consultas por hoy", from the last respuesta. */
  aviso: string | null;
  bloqueo: Bloqueo | null;
  /** With the presupuesto agotado, the dia the chat works again, `YYYY-MM-DD`. */
  vuelta: string | null;
};

export type AccionDeConversacion =
  | { tipo: 'preguntar'; id: string; texto: string }
  | { tipo: 'responder'; conversacionId: number; id: string; respuesta: RespuestaDeConsulta }
  | {
      tipo: 'fallar';
      conversacionId: number;
      id: string;
      falla: Falla;
      /** For `presupuesto_agotado`: the dia the chat works again. */
      vuelta?: string;
    }
  | { tipo: 'reintentar' }
  /** Opens the chat again once `hoy`, of the asociacion, reaches the dia of vuelta. */
  | { tipo: 'reabrir'; hoy: string }
  | { tipo: 'nueva'; id: number }
  /** Confirmar on the propuesta `id`: it starts saving. */
  | { tipo: 'confirmar'; id: string }
  /** The evento of the propuesta `id` was saved, from Confirmar or from Editar. */
  | { tipo: 'guardar'; id: string }
  /** Confirmar on the propuesta `id` failed: the card keeps its buttons with `error`. */
  | { tipo: 'fallarGuardado'; id: string; error: string }
  /**
   * "Enviar reporte" on the respuesta `id` with its `motivo`: it starts
   * sending, with `reporteId` unless an earlier try with the same motivo
   * already chose one.
   */
  | { tipo: 'reportar'; id: string; reporteId: string; motivo: MotivoDeReporte }
  /** The reporte of the respuesta `id` was saved: it cannot be reported again. */
  | { tipo: 'reporteEnviado'; id: string }
  /** The reporte of the respuesta `id` failed: it can be sent again. */
  | { tipo: 'fallarReporte'; id: string; error: string };

/** What the app sends to the server function: the mensaje and the tramo before it. */
export type PedidoDeConsulta = { mensaje: string; tramo: MensajeDelTramo[] };

export function crearConversacion(id: number): Conversacion {
  return { id, mensajes: [], enviando: false, aviso: null, bloqueo: null, vuelta: null };
}

export function hasMensajes(conversacion: Conversacion): boolean {
  return conversacion.mensajes.length > 0;
}

/** Characters as people count them: an emoji is one, as the server counts them. */
function getLargo(texto: string): number {
  return [...texto].length;
}

/**
 * The texto the cuadro de texto keeps: at most 500 characters, counted as the
 * server counts them. The `maxLength` of a TextInput counts UTF-16 units, so
 * it would stop at 250 emoji.
 */
export function recortarMensaje(texto: string): string {
  return getLargo(texto) <= MAX_LARGO_DE_MENSAJE
    ? texto
    : [...texto].slice(0, MAX_LARGO_DE_MENSAJE).join('');
}

/** Whether the usuario can send this texto now. */
export function puedeEnviar(conversacion: Conversacion, texto: string): boolean {
  const limpio = texto.trim();

  return (
    !conversacion.enviando &&
    conversacion.bloqueo === null &&
    limpio !== '' &&
    getLargo(limpio) <= MAX_LARGO_DE_MENSAJE
  );
}

/**
 * The pregunta "Reintentar" sends again: the one of the falla that closes the
 * conversacion. Once the usuario asked something else, the falla stays as it
 * is, without retry.
 */
export function getPreguntaAReintentar(conversacion: Conversacion): string | null {
  const { mensajes } = conversacion;
  const ultimo = mensajes.at(-1);
  const anterior = mensajes.at(-2);

  if (conversacion.enviando || ultimo?.tipo !== 'falla' || anterior?.tipo !== 'pregunta') {
    return null;
  }
  return anterior.id;
}

export function reducirConversacion(
  conversacion: Conversacion,
  accion: AccionDeConversacion,
): Conversacion {
  switch (accion.tipo) {
    case 'preguntar': {
      if (!puedeEnviar(conversacion, accion.texto)) {
        return conversacion;
      }
      return {
        ...conversacion,
        mensajes: [
          ...conversacion.mensajes,
          { tipo: 'pregunta', id: accion.id, texto: accion.texto.trim() },
        ],
        enviando: true,
      };
    }

    case 'responder': {
      // Only the pregunta waiting gets an answer: a late one, or a second one, is dropped.
      if (accion.conversacionId !== conversacion.id || !conversacion.enviando) {
        return conversacion;
      }
      const { texto, eventos, aviso, borrador } = accion.respuesta;
      const mensaje: MensajeDeChat =
        borrador === null
          ? { tipo: 'respuesta', id: accion.id, texto, eventos, reporte: REPORTE_INICIAL }
          : {
              tipo: 'propuesta',
              id: accion.id,
              texto,
              eventos,
              borrador,
              estado: 'pendiente',
              error: null,
              reporte: REPORTE_INICIAL,
            };
      return {
        ...conversacion,
        mensajes: [...conversacion.mensajes, mensaje],
        enviando: false,
        aviso,
      };
    }

    case 'fallar': {
      // Only the pregunta waiting gets an answer: a late one, or a second one, is dropped.
      if (accion.conversacionId !== conversacion.id || !conversacion.enviando) {
        return conversacion;
      }
      const estado = getEstadoDeFalla(accion.falla);
      if (estado === 'limite-diario' || estado === 'presupuesto-agotado') {
        // The aviso of the consultas left gives way to the one of the bloqueo.
        return {
          ...conversacion,
          enviando: false,
          aviso: null,
          bloqueo: estado,
          vuelta: estado === 'presupuesto-agotado' ? (accion.vuelta ?? null) : null,
        };
      }
      return {
        ...conversacion,
        mensajes: [...conversacion.mensajes, { tipo: 'falla', id: accion.id, falla: estado }],
        enviando: false,
      };
    }

    case 'reintentar': {
      if (getPreguntaAReintentar(conversacion) === null) {
        return conversacion;
      }
      return { ...conversacion, mensajes: conversacion.mensajes.slice(0, -1), enviando: true };
    }

    case 'reabrir': {
      const { bloqueo, vuelta } = conversacion;
      // Both are `YYYY-MM-DD`, so they compare as text.
      if (bloqueo !== 'presupuesto-agotado' || vuelta === null || accion.hoy < vuelta) {
        return conversacion;
      }
      return { ...conversacion, bloqueo: null, vuelta: null };
    }

    case 'nueva':
      return crearConversacion(accion.id);

    // A tap while it is saved, or once it was, changes nothing: one evento.
    case 'confirmar':
      return cambiarPropuesta(conversacion, accion.id, ['pendiente'], {
        estado: 'guardando',
        error: null,
      });

    case 'guardar':
      return cambiarPropuesta(conversacion, accion.id, ['pendiente', 'guardando'], {
        estado: 'guardado',
        error: null,
      });

    case 'fallarGuardado':
      return cambiarPropuesta(conversacion, accion.id, ['guardando'], {
        estado: 'pendiente',
        error: accion.error,
      });

    // A tap while it is sent, or once it was, changes nothing: one reporte.
    case 'reportar':
      return cambiarReporte(conversacion, accion.id, 'sin-reportar', (reporte) => ({
        estado: 'enviando',
        id: getIdDelIntento(reporte, accion.motivo, accion.reporteId),
        motivo: accion.motivo,
        error: null,
      }));

    case 'reporteEnviado':
      return cambiarReporte(conversacion, accion.id, 'enviando', (reporte) => ({
        ...reporte,
        estado: 'enviado',
      }));

    case 'fallarReporte':
      return cambiarReporte(conversacion, accion.id, 'enviando', (reporte) => ({
        ...reporte,
        estado: 'sin-reportar',
        error: accion.error,
      }));
  }
}

/**
 * Changes the reporte of the respuesta `id` when it is in the estado `desde`.
 * Any other case, such as a respuesta of a conversacion started again, is
 * left as it is.
 */
function cambiarReporte(
  conversacion: Conversacion,
  id: string,
  desde: Reporte['estado'],
  cambiar: (reporte: Reporte) => Reporte,
): Conversacion {
  const indice = conversacion.mensajes.findIndex(
    (mensaje) =>
      mensaje.id === id &&
      (mensaje.tipo === 'respuesta' || mensaje.tipo === 'propuesta') &&
      mensaje.reporte.estado === desde,
  );
  const respuesta = conversacion.mensajes[indice];
  if (respuesta?.tipo !== 'respuesta' && respuesta?.tipo !== 'propuesta') {
    return conversacion;
  }

  const mensajes = [...conversacion.mensajes];
  mensajes[indice] = { ...respuesta, reporte: cambiar(respuesta.reporte) };
  return { ...conversacion, mensajes };
}

/**
 * Changes the propuesta `id` when it is in one of the `desde` estados. Any
 * other case, such as a propuesta of a conversacion started again, is left
 * as it is.
 */
function cambiarPropuesta(
  conversacion: Conversacion,
  id: string,
  desde: readonly EstadoDePropuesta[],
  cambios: { estado: EstadoDePropuesta; error: string | null },
): Conversacion {
  const indice = conversacion.mensajes.findIndex(
    (mensaje) =>
      mensaje.id === id && mensaje.tipo === 'propuesta' && desde.includes(mensaje.estado),
  );
  const propuesta = conversacion.mensajes[indice];
  if (propuesta?.tipo !== 'propuesta') {
    return conversacion;
  }

  const mensajes = [...conversacion.mensajes];
  mensajes[indice] = { ...propuesta, ...cambios };
  return { ...conversacion, mensajes };
}

/**
 * The pedido of a pregunta of the conversacion: its texto and the last
 * mensajes before it, so the asistente knows what "¿y el otro?" refers to.
 * Only preguntas with their respuesta go: one left without it would read as
 * a pregunta still to answer. Null when the pregunta is not in it.
 */
export function getPedido(conversacion: Conversacion, preguntaId: string): PedidoDeConsulta | null {
  const indice = conversacion.mensajes.findIndex(
    (mensaje) => mensaje.tipo === 'pregunta' && mensaje.id === preguntaId,
  );
  const pregunta = conversacion.mensajes[indice];
  if (pregunta?.tipo !== 'pregunta') {
    return null;
  }

  const anteriores = conversacion.mensajes.slice(0, indice);
  const tramo: MensajeDelTramo[] = [];
  anteriores.forEach((mensaje, i) => {
    const siguiente = anteriores[i + 1];
    const respondida = siguiente?.tipo === 'respuesta' || siguiente?.tipo === 'propuesta';
    if (mensaje.tipo === 'pregunta' && respondida) {
      tramo.push({ autor: 'usuario', texto: mensaje.texto });
    } else if (mensaje.tipo === 'respuesta' || mensaje.tipo === 'propuesta') {
      tramo.push({ autor: 'asistente', texto: mensaje.texto });
    }
  });

  return { mensaje: pregunta.texto, tramo: tramo.slice(-MAX_MENSAJES_DEL_TRAMO) };
}

/** An evento of a respuesta as the chat lists it (diseno/capturas/7 · Chat IA.png). */
export type LineaDeEvento = {
  /** Unique within a respuesta: a series can be found on several dates. */
  clave: string;
  categoria: Categoria;
  /** "09:30", or "Sábado 17 de octubre · 09:30" when the eventos fall on different days. */
  cuando: string;
  titulo: string;
  /** "(distrito)" or "(asociación)"; null for an evento of an iglesia. */
  alcance: string | null;
};

const ALCANCES = { iglesia: null, distrito: '(distrito)', asociacion: '(asociación)' } as const;

/**
 * The eventos of a respuesta, with their shape and color. The texto of the
 * respuesta names the day when they all share it, so only the hora is listed;
 * otherwise each one says its day.
 */
export function getLineasDeEventos(eventos: readonly EventoDeChat[]): LineaDeEvento[] {
  const conFecha = new Set(eventos.map(({ fecha }) => fecha)).size > 1;

  return eventos.map(({ id, fecha, hora, titulo, enfasis, alcance }) => ({
    clave: `${id}|${fecha}`,
    categoria: getCategoria(enfasis),
    cuando: conFecha ? `${formatDayHeading(fecha)} · ${formatTime(hora)}` : formatTime(hora),
    titulo,
    alcance: ALCANCES[alcance],
  }));
}
