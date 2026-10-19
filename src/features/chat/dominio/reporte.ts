// "Reportar respuesta" on each respuesta of the asistente (issue #147). A
// reporte keeps who, when and the motivo, never a word of the conversacion, and
// it does not count as a consulta.

import type { Conversacion } from './conversacion';

/** Why a respuesta is reported, as the database keeps it. */
export type MotivoDeReporte = 'incorrecta' | 'ofensiva' | 'otro';

/** The motivos of the hoja, in its order and words (diseno/capturas/7i). */
export const MOTIVOS_DE_REPORTE: readonly { motivo: MotivoDeReporte; texto: string }[] = [
  { motivo: 'incorrecta', texto: 'Es incorrecta' },
  { motivo: 'ofensiva', texto: 'Es ofensiva' },
  { motivo: 'otro', texto: 'Otro motivo' },
];

/** The motivo chosen when the hoja opens. */
export const MOTIVO_INICIAL: MotivoDeReporte = 'incorrecta';

export function isMotivoDeReporte(valor: string): valor is MotivoDeReporte {
  return MOTIVOS_DE_REPORTE.some(({ motivo }) => motivo === valor);
}

/**
 * Where the reporte of a respuesta stands: not sent, being sent, or sent,
 * after which the respuesta cannot be reported again.
 */
export type EstadoDeReporte = 'sin-reportar' | 'enviando' | 'enviado';

export type Reporte = {
  estado: EstadoDeReporte;
  /**
   * The id the reporte is saved with, a UUID, chosen on the first try: a
   * reporte sent again after a lost answer is saved once.
   */
  id: string | null;
  /** The motivo of the last try: the hoja opens on it again after a failure. */
  motivo: MotivoDeReporte | null;
  /** Why the last try failed. */
  error: string | null;
};

export const REPORTE_INICIAL: Reporte = {
  estado: 'sin-reportar',
  id: null,
  motivo: null,
  error: null,
};

export const ERROR_DE_REPORTE =
  'No se pudo enviar el reporte. Revisá la conexión y probá de nuevo.';

/** The motivo chosen when the hoja opens: the one of a try that failed, if any. */
export function getMotivoDeLaHoja(reporte: Reporte): MotivoDeReporte {
  return reporte.motivo ?? MOTIVO_INICIAL;
}

/**
 * The id a try is sent with. A try before may have been saved with its answer
 * lost: the same motivo keeps its id, so it is saved once; another motivo
 * takes `nuevoId`, since reusing the id would keep the first motivo.
 */
export function getIdDelIntento(
  reporte: Reporte,
  motivo: MotivoDeReporte,
  nuevoId: string,
): string {
  return reporte.id !== null && reporte.motivo === motivo ? reporte.id : nuevoId;
}

export function puedeReportar(reporte: Reporte): boolean {
  return reporte.estado === 'sin-reportar';
}

/** The reporte of the respuesta `id`; null when `id` is not a respuesta. */
export function getReporte(conversacion: Conversacion, id: string): Reporte | null {
  const mensaje = conversacion.mensajes.find((m) => m.id === id);
  return mensaje?.tipo === 'respuesta' || mensaje?.tipo === 'propuesta' ? mensaje.reporte : null;
}
