import { toEvento } from '@/features/eventos/datos/eventoRow';
import { supabase } from '@/shared/supabase';

import type { FechaDeEvento } from '../dominio/armarCalendario';
import { getMonthRange, type Month } from '../dominio/getMonthRange';
import { armarNombresDeDistritos } from '../dominio/nombresDeDistritos';

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
    id, titulo, lugar, lugar_id, descripcion, enfasis, alcance,
    duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
    hora, fecha_fin, repeticion, fin_de_serie,
    iglesias_sumadas (iglesia_id),
    lugares (nombre),
    distritos (nombre)
  )
` as const;

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

type FechasQuery = ReturnType<typeof selectFechas>;

/**
 * Rows per page. PostgREST cuts each response at `max_rows` (1000, see
 * `supabase/config.toml`) and still answers 200, so a page never asks for more.
 * The hosted project must keep `max_rows` at 1000 or more: with less, a full
 * page would come back short and the read would stop early without a warning.
 */
const PAGE_SIZE = 1000;

/**
 * Reads every date that `filter` keeps, page by page, until a page comes back
 * short. The order by the primary key keeps the pages from overlapping or
 * skipping rows while the dates do not change between pages; a save in between
 * (which deletes and inserts the dates of its evento) can leave a date out
 * until the next read.
 */
async function readAllFechas(
  ownedOrSumada: string | null,
  filter: (query: FechasQuery) => FechasQuery,
) {
  const rows = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await filter(selectFechas(ownedOrSumada))
      .order('evento_id')
      .order('fecha')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not read the calendario: ${error.message}`);
    }

    rows.push(...data);

    if (data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

/**
 * Reads the dates of the eventos that can belong to a calendario for a month,
 * before the rule of `armarCalendario` keeps the ones that do.
 *
 * An evento of several days that started before the month and reaches it is
 * returned too, with its real first day as `fecha` (so it can be earlier than
 * the month). `getDiaDelEvento` puts it on each of its days.
 */
export async function getFechasDelMes(
  ownedOrSumada: string | null,
  month: Month,
): Promise<Calendario> {
  const { firstDay, lastDay } = getMonthRange(month);

  // PostgREST cannot combine in one `or` a column of eventos_fechas (fecha)
  // with a column of the embedded eventos (fecha_fin), hence the two requests.
  const [insideTheMonth, startedBefore] = await Promise.all([
    readAllFechas(ownedOrSumada, (query) => query.gte('fecha', firstDay).lte('fecha', lastDay)),
    readAllFechas(ownedOrSumada, (query) =>
      query.lt('fecha', firstDay).gte('eventos.fecha_fin', firstDay),
    ),
  ]);

  const rows = [...insideTheMonth, ...startedBefore];
  const fechas = rows.map((row): FechaDeEvento => {
    return { fecha: row.fecha, evento: toEvento(row.eventos) };
  });

  const nombresDeDistritos = armarNombresDeDistritos(
    rows.map((row) => ({
      duenioDistritoId: row.eventos.duenio_distrito_id,
      nombreDeDistrito: row.eventos.distritos?.nombre ?? null,
    })),
  );

  return { fechas, nombresDeDistritos };
}
