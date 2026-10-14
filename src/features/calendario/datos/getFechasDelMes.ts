import type { Duenio, Evento } from '@/features/eventos/dominio/evento';
import type { Database } from '@/shared/database.types';
import { supabase } from '@/shared/supabase';

import type { FechaDeEvento } from '../dominio/armarCalendario';
import { getMonthRange, type Month } from '../dominio/getMonthRange';
import { armarNombresDeDistritos } from '../dominio/nombresDeDistritos';

type EventoRow = Database['public']['Tables']['eventos']['Row'];

/** The calendario of an iglesia or of a usuario for a month. */
export type Calendario = {
  /** The dates of its eventos, as `armarCalendario` orders them. */
  fechas: FechaDeEvento[];
  /**
   * Nombre of each distrito that owns one of the eventos read, by its id: a
   * duenio only carries ids, and the calendar shows which distrito an evento
   * comes from.
   */
  nombresDeDistritos: Record<string, string>;
};

/**
 * A date with its evento, the iglesias sumadas of that evento and the nombre
 * of the distrito that owns it, if one does. It is a single literal because
 * the client infers the type of the rows from it.
 */
const FECHA_COLUMNS = `
  fecha,
  eventos!inner (
    id, titulo, lugar, descripcion, enfasis, alcance,
    duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
    hora, fecha_fin, repeticion, fin_de_serie,
    iglesias_sumadas (iglesia_id),
    distritos (nombre)
  )
` as const;

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

/**
 * Reads the dates of eventos that can belong to the calendario, with a filter
 * on the dates left to the caller.
 *
 * `ownedOrSumada` narrows the download to the eventos owned by the iglesias, their
 * distritos or their asociaciones, or listed as sumadas; null reads them all. It
 * is only an optimisation: the rule lives in `armarCalendario`.
 */
function selectFechas(ownedOrSumada: string | null) {
  const query = supabase.from('eventos_fechas').select(FECHA_COLUMNS);

  return ownedOrSumada === null ? query : query.or(ownedOrSumada, { referencedTable: 'eventos' });
}

/**
 * Reads the dates of the eventos that can belong to a calendario for a month,
 * before the rule of `armarCalendario` keeps the ones that do.
 *
 * An evento of several days that started before the month and reaches it is
 * returned too, with its real first day as `fecha` (so it can be earlier than
 * the month). Expanding an evento into each of its days belongs to issue #34.
 */
export async function getFechasDelMes(
  ownedOrSumada: string | null,
  month: Month,
): Promise<Calendario> {
  const { firstDay, lastDay } = getMonthRange(month);

  // PostgREST cannot combine in one `or` a column of eventos_fechas (fecha)
  // with a column of the embedded eventos (fecha_fin), hence the two requests.
  const [insideTheMonth, startedBefore] = await Promise.all([
    selectFechas(ownedOrSumada).gte('fecha', firstDay).lte('fecha', lastDay),
    selectFechas(ownedOrSumada).lt('fecha', firstDay).gte('eventos.fecha_fin', firstDay),
  ]);

  const error = insideTheMonth.error ?? startedBefore.error;

  if (error) {
    throw new Error(`Could not read the calendario: ${error.message}`);
  }

  const rows = [...(insideTheMonth.data ?? []), ...(startedBefore.data ?? [])];
  const fechas = rows.map((row): FechaDeEvento => {
    const evento: Evento = {
      id: row.eventos.id,
      titulo: row.eventos.titulo,
      lugar: row.eventos.lugar,
      descripcion: row.eventos.descripcion,
      enfasis: row.eventos.enfasis,
      duenio: toDuenio(row.eventos),
      hora: row.eventos.hora,
      fechaFin: row.eventos.fecha_fin,
      repeticion: row.eventos.repeticion,
      finDeSerie: row.eventos.fin_de_serie,
      iglesiasSumadas: row.eventos.iglesias_sumadas.map((sumada) => sumada.iglesia_id),
    };

    return { fecha: row.fecha, evento };
  });

  const nombresDeDistritos = armarNombresDeDistritos(
    rows.map((row) => ({
      duenioDistritoId: row.eventos.duenio_distrito_id,
      nombreDeDistrito: row.eventos.distritos?.nombre ?? null,
    })),
  );

  return { fechas, nombresDeDistritos };
}
