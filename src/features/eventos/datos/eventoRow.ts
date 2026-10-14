import type { Database } from '@/shared/database.types';

import type { Duenio, Evento } from '../dominio/evento';

type EventoRow = Database['public']['Tables']['eventos']['Row'];

/**
 * The database guarantees that the column of the alcance is the one that is
 * set (constraint eventos_duenio_matches_alcance), but the generated types
 * cannot know it.
 */
export function toDuenio(
  row: Pick<
    EventoRow,
    'id' | 'alcance' | 'duenio_iglesia_id' | 'duenio_distrito_id' | 'duenio_asociacion_id'
  >,
): Duenio {
  if (row.alcance === 'iglesia' && row.duenio_iglesia_id) {
    return { alcance: 'iglesia', iglesiaId: row.duenio_iglesia_id };
  }

  if (row.alcance === 'distrito' && row.duenio_distrito_id) {
    return { alcance: 'distrito', distritoId: row.duenio_distrito_id };
  }

  if (row.alcance === 'asociacion' && row.duenio_asociacion_id) {
    return { alcance: 'asociacion', asociacionId: row.duenio_asociacion_id };
  }

  throw new Error(`Evento ${row.id} has no duenio for its alcance (${row.alcance})`);
}

/** The columns of an evento every read of it selects, with its iglesias sumadas. */
type EventoColumns = Pick<
  EventoRow,
  | 'id'
  | 'titulo'
  | 'lugar'
  | 'descripcion'
  | 'enfasis'
  | 'alcance'
  | 'duenio_iglesia_id'
  | 'duenio_distrito_id'
  | 'duenio_asociacion_id'
  | 'hora'
  | 'fecha_fin'
  | 'repeticion'
  | 'fin_de_serie'
> & { iglesias_sumadas: { iglesia_id: string }[] };

/** An evento as read from the database, in the shape of the domain. */
export function toEvento(row: EventoColumns): Evento {
  return {
    id: row.id,
    titulo: row.titulo,
    lugar: row.lugar,
    descripcion: row.descripcion,
    enfasis: row.enfasis,
    duenio: toDuenio(row),
    hora: row.hora,
    fechaFin: row.fecha_fin,
    repeticion: row.repeticion,
    finDeSerie: row.fin_de_serie,
    iglesiasSumadas: row.iglesias_sumadas.map((sumada) => sumada.iglesia_id),
  };
}
