import type { Database } from '@/shared/database.types';

import type { Duenio, Evento } from '../dominio/evento';
import type { Excepcion } from '../dominio/excepcion';

type EventoRow = Database['public']['Tables']['eventos']['Row'];

/**
 * The database guarantees that the column of the alcance is the one that is
 * set (constraint eventos_duenio_matches_alcance), but the generated types
 * cannot know it.
 */
function toDuenio(
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
  | 'lugar_id'
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
> & {
  iglesias_sumadas: { iglesia_id: string }[];
  /** The lugar of the list; null when the evento has none or its lugar is written by hand. */
  lugares: { nombre: string } | null;
};

/** An evento as read from the database, in the shape of the domain. */
export function toEvento(row: EventoColumns): Evento {
  return {
    id: row.id,
    titulo: row.titulo,
    // An evento has a lugar of the list or a written one, never both.
    lugar: row.lugares?.nombre ?? row.lugar,
    lugarId: row.lugar_id,
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

type ExcepcionRow = Database['public']['Tables']['excepciones']['Row'];

/** The columns of an excepcion every read of it selects, with the nombre of its lugar. */
type ExcepcionColumns = Pick<
  ExcepcionRow,
  | 'fecha'
  | 'fecha_nueva'
  | 'titulo'
  | 'hora'
  | 'cambia_lugar'
  | 'lugar'
  | 'lugar_id'
  | 'cambia_descripcion'
  | 'descripcion'
  | 'cambia_enfasis'
  | 'enfasis'
  | 'borrada'
> & {
  /** The lugar of the list; null when the date has none or keeps the one of the series. */
  lugares: { nombre: string } | null;
};

/**
 * An excepcion as read from the database, in the shape of the domain: only
 * what the date changed. A null titulo or hora is one it did not change; the
 * lugar, the descripcion and the enfasis say so with a flag, because they can
 * be emptied.
 */
export function toExcepcion(row: ExcepcionColumns): Excepcion {
  const cambios: Excepcion['cambios'] = {};

  if (row.titulo !== null) cambios.titulo = row.titulo;
  if (row.hora !== null) cambios.hora = row.hora;
  if (row.cambia_lugar) {
    cambios.lugar = row.lugares?.nombre ?? row.lugar;
    cambios.lugarId = row.lugar_id;
  }
  if (row.cambia_descripcion) cambios.descripcion = row.descripcion;
  if (row.cambia_enfasis) cambios.enfasis = row.enfasis;

  return { fecha: row.fecha, fechaNueva: row.fecha_nueva, borrada: row.borrada, cambios };
}
