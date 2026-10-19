// The conversacion of the chat, kept in memory only: neither the server nor
// the phone saves it. Every change goes through `reducirConversacion`, so the
// screen only draws what this file decides.

import { formatDayHeading, formatTime } from '@/features/calendario/dominio/calendarioTexts';
import { getCategoria, type Categoria } from '@/features/eventos/dominio/categoria';

import {
  MAX_LARGO_DE_MENSAJE,
  MAX_MENSAJES_DEL_TRAMO,
  type EventoDeChat,
  type MensajeDelTramo,
  type RespuestaDeConsulta,
} from './consulta';
import { getEstadoDeFalla, type Falla } from './fallas';

/**
 * A mensaje of the conversacion. New kinds (the vista previa of #149) are new
 * members of this union.
 * - `pregunta`: what the usuario wrote.
 * - `respuesta`: what the asistente answered, with the eventos it found.
 * - `falla`: the pregunta before it got no respuesta, and can be retried.
 */
export type MensajeDeChat =
  | { tipo: 'pregunta'; id: string; texto: string }
  | { tipo: 'respuesta'; id: string; texto: string; eventos: EventoDeChat[] }
  | { tipo: 'falla'; id: string; falla: 'sin-conexion' | 'caido' };

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
  | { tipo: 'nueva'; id: number };

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
      const { texto, eventos, aviso } = accion.respuesta;
      return {
        ...conversacion,
        mensajes: [...conversacion.mensajes, { tipo: 'respuesta', id: accion.id, texto, eventos }],
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
  }
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
    if (mensaje.tipo === 'pregunta' && siguiente?.tipo === 'respuesta') {
      tramo.push({ autor: 'usuario', texto: mensaje.texto });
    } else if (mensaje.tipo === 'respuesta') {
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
