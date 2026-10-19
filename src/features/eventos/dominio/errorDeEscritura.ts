/** Why saving or deleting an evento failed, as far as the person can act on it. */
export type TipoDeError = 'sin-conexion' | 'sin-permiso' | 'no-existe' | 'otro';

/**
 * Why a write of a single date of a series failed: as any write, or because
 * the date changed meanwhile.
 */
export type TipoDeErrorDeFecha = TipoDeError | 'fecha-cambiada';

// What public.guardar_evento and public.borrar_evento raise when no row of the
// evento is visible to write: the policy hides it, or it was deleted meanwhile.
const NO_VISIBLE_CODE = 'P0002';

// A policy that rejects the row.
const SIN_PERMISO_CODE = '42501';

// What public.guardar_excepcion and public.borrar_fecha raise for a date that
// is no longer one of the series, or a day another date of it took meanwhile.
const FECHA_CAMBIADA_CODE = '23514';

// What public.borrar_fecha raises for the last date left of a series: the
// dates the app had were old, as another write left only that one.
const ULTIMA_FECHA_CODE = '22023';

// What fetch says when the request never reached the server.
const SIN_CONEXION_PATTERN = /network request failed|failed to fetch|network error/i;

/**
 * Whether the error leaves open if the evento still exists. Reading eventos is
 * open to everyone, so a read tells a deleted evento from a hidden one.
 */
export function necesitaReleerElEvento(code: string | undefined): boolean {
  return code === NO_VISIBLE_CODE;
}

/**
 * Classifies an error of the API by its Postgres code and its message. For the
 * errors that `necesitaReleerElEvento`, it needs whether the evento exists; if
 * that is unknown it takes the cargos as the reason.
 */
export function clasificarError(
  code: string | undefined,
  message: string,
  { eventoExiste = true }: { eventoExiste?: boolean } = {},
): TipoDeError {
  if (code === NO_VISIBLE_CODE) {
    return eventoExiste ? 'sin-permiso' : 'no-existe';
  }

  if (code === SIN_PERMISO_CODE) {
    return 'sin-permiso';
  }

  return SIN_CONEXION_PATTERN.test(message) ? 'sin-conexion' : 'otro';
}

/**
 * Classifies an error of a write of a single date of a series: a date that is
 * no longer one of the series, a day another date took, or a last date left
 * that another write left alone, is told apart.
 */
export function clasificarErrorDeFecha(
  code: string | undefined,
  message: string,
  contexto: { eventoExiste?: boolean } = {},
): TipoDeErrorDeFecha {
  return code === FECHA_CAMBIADA_CODE || code === ULTIMA_FECHA_CODE
    ? 'fecha-cambiada'
    : clasificarError(code, message, contexto);
}

const MENSAJES: Record<TipoDeErrorDeFecha, string> = {
  'sin-conexion': 'Hace falta conexión a internet. Revisá la conexión y probá de nuevo.',
  'sin-permiso': 'Tus cargos no te permiten cambiar este evento.',
  'no-existe': 'Este evento ya no existe: lo borraron mientras lo tenías abierto.',
  'fecha-cambiada':
    'Esta fecha de la serie cambió mientras la tenías abierta. Volvé al evento y probá de nuevo.',
  otro: 'No se pudo guardar. Probá de nuevo en un momento.',
};

/** What the screen tells when a write fails. */
export function getMensajeDeError(tipo: TipoDeErrorDeFecha): string {
  return MENSAJES[tipo];
}
