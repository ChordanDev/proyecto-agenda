/** Whether the query of the iglesias is reading them, waiting for the connection, or neither. */
export type EstadoLectura = 'fetching' | 'paused' | 'idle';

/**
 * With no iglesias downloaded yet, "Cargando iglesias…" shows only while they
 * are really being read. Waiting for the connection, or after a failed reading,
 * the hermano sees that they could not be loaded, with "Reintentar": never a
 * loading text that does not end.
 */
export function estadoSinIglesias(lectura: EstadoLectura): 'cargando' | 'error' {
  return lectura === 'fetching' ? 'cargando' : 'error';
}
