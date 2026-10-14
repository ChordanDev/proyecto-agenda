/** Why saving or deleting an evento failed, as far as the person can act on it. */
export type TipoDeError = 'sin-conexion' | 'sin-permiso' | 'otro';

// The errors of public.guardar_evento and public.borrar_evento that mean the
// cargos do not cover the evento: a policy that rejects the row, and an evento
// the policy hides.
const SIN_PERMISO_CODES = new Set(['42501', 'P0002']);

// What fetch says when the request never reached the server.
const SIN_CONEXION_PATTERN = /network request failed|failed to fetch|network error/i;

/** Classifies an error of the API by its Postgres code and its message. */
export function clasificarError(code: string | undefined, message: string): TipoDeError {
  if (code !== undefined && SIN_PERMISO_CODES.has(code)) {
    return 'sin-permiso';
  }

  return SIN_CONEXION_PATTERN.test(message) ? 'sin-conexion' : 'otro';
}

const MENSAJES: Record<TipoDeError, string> = {
  'sin-conexion': 'Hace falta conexión a internet. Revisá la conexión y probá de nuevo.',
  'sin-permiso': 'Tus cargos no te permiten cambiar este evento.',
  otro: 'No se pudo guardar. Probá de nuevo en un momento.',
};

/** What the screen tells when a write fails. */
export function getMensajeDeError(tipo: TipoDeError): string {
  return MENSAJES[tipo];
}
