import type { Duenio } from '@/features/eventos/dominio/evento';
import type { Database } from '@/shared/database.types';

import type { Lugar } from '../dominio/lugar';

type LugarRow = Pick<
  Database['public']['Tables']['lugares']['Row'],
  'id' | 'nombre' | 'duenio_iglesia_id' | 'duenio_distrito_id' | 'duenio_asociacion_id'
>;

/** The columns every read of a lugar selects. */
export const LUGAR_COLUMNS =
  'id, nombre, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id';

/**
 * The database guarantees that exactly one duenio column is set (constraint
 * lugares_single_duenio), but the generated types cannot know it.
 */
function toDuenio(row: LugarRow): Duenio {
  if (row.duenio_iglesia_id) {
    return { alcance: 'iglesia', iglesiaId: row.duenio_iglesia_id };
  }

  if (row.duenio_distrito_id) {
    return { alcance: 'distrito', distritoId: row.duenio_distrito_id };
  }

  if (row.duenio_asociacion_id) {
    return { alcance: 'asociacion', asociacionId: row.duenio_asociacion_id };
  }

  throw new Error(`Lugar ${row.id} has no duenio`);
}

/** A lugar as read from the database, in the shape of the domain. */
export function toLugar(row: LugarRow): Lugar {
  return { id: row.id, nombre: row.nombre, duenio: toDuenio(row) };
}

/** The duenio as the three columns of the database: the one of its alcance, the rest left out. */
export function toDuenioColumns(duenio: Duenio) {
  return {
    duenio_iglesia_id: duenio.alcance === 'iglesia' ? duenio.iglesiaId : undefined,
    duenio_distrito_id: duenio.alcance === 'distrito' ? duenio.distritoId : undefined,
    duenio_asociacion_id: duenio.alcance === 'asociacion' ? duenio.asociacionId : undefined,
  };
}
