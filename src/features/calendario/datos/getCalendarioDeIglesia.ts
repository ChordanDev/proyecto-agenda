import type { Duenio, Evento } from '@/features/eventos/dominio/evento';
import type { Database } from '@/shared/database.types';
import { supabase } from '@/shared/supabase';

import {
  armarCalendario,
  type FechaDeEvento,
  type IglesiaEnEstructura,
} from '../dominio/armarCalendario';
import { getMonthRange, type Month } from '../dominio/getMonthRange';

type EventoRow = Database['public']['Tables']['eventos']['Row'];

/** The calendario of an iglesia for a month. */
export type CalendarioDeIglesia = {
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

/** The current place of the iglesia in the structure and the eventos it is sumada to. */
async function getIglesiaEnEstructura(
  iglesiaId: string,
): Promise<{ iglesia: IglesiaEnEstructura; eventosSumados: string[] }> {
  const { data, error } = await supabase
    .from('iglesias')
    .select('id, distrito_id, distritos (asociacion_id), iglesias_sumadas (evento_id)')
    .eq('id', iglesiaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read the iglesia of the calendario: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Could not read the calendario: there is no iglesia ${iglesiaId}`);
  }

  return {
    iglesia: {
      id: data.id,
      distritoId: data.distrito_id,
      asociacionId: data.distritos.asociacion_id,
    },
    eventosSumados: data.iglesias_sumadas.map((sumada) => sumada.evento_id),
  };
}

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
 * `ownedOrSumada` narrows the download to the eventos owned by the iglesia, its
 * distrito or its asociacion, or listed as sumada. It is only an optimisation:
 * the rule lives in `armarCalendario`.
 */
function selectFechas(ownedOrSumada: string) {
  return supabase
    .from('eventos_fechas')
    .select(FECHA_COLUMNS)
    .or(ownedOrSumada, { referencedTable: 'eventos' });
}

/**
 * Reads the calendario of an iglesia for a month: its own eventos, those of
 * its distrito and its asociacion, and those where it is iglesia sumada.
 *
 * An evento of several days that started before the month and reaches it is
 * returned too, with its real first day as `fecha` (so it can be earlier than
 * the month). Expanding an evento into each of its days belongs to issue #34.
 */
export async function getCalendarioDeIglesia(
  iglesiaId: string,
  month: Month,
): Promise<CalendarioDeIglesia> {
  const { firstDay, lastDay } = getMonthRange(month);
  const { iglesia, eventosSumados } = await getIglesiaEnEstructura(iglesiaId);

  const ownedOrSumada = [
    `duenio_iglesia_id.eq.${iglesia.id}`,
    `duenio_distrito_id.eq.${iglesia.distritoId}`,
    `duenio_asociacion_id.eq.${iglesia.asociacionId}`,
    // The ids travel in the URL. Sharing has no screen until the v2; if an
    // iglesia ever accumulates hundreds of them, this needs another shape.
    ...(eventosSumados.length > 0 ? [`id.in.(${eventosSumados.join(',')})`] : []),
  ].join(',');

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
  const nombresDeDistritos: Record<string, string> = {};

  const fechas = rows.map((row): FechaDeEvento => {
    if (row.eventos.duenio_distrito_id && row.eventos.distritos) {
      nombresDeDistritos[row.eventos.duenio_distrito_id] = row.eventos.distritos.nombre;
    }

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

  return { fechas: armarCalendario(iglesia, fechas), nombresDeDistritos };
}
