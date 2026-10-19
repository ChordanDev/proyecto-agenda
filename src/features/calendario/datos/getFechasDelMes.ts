import { toEvento, toExcepcion } from '@/features/eventos/datos/eventoRow';
import { combinarConExcepcion } from '@/features/eventos/dominio/excepcion';
import { supabase } from '@/shared/supabase';

import type { FechaDeEvento, IglesiaEnEstructura } from '../dominio/armarCalendario';
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
  /** The label of each evento in the list of a day, by its id (`armarEtiquetas`). */
  etiquetas: Record<string, string>;
};

/**
 * The dates read for a month, before the rule of `armarCalendario` keeps the
 * ones of the calendario, with the nombres of the iglesias and distritos that
 * own them, by id.
 */
export type FechasDelMes = {
  fechas: FechaDeEvento[];
  nombresDeDistritos: Record<string, string>;
  /** Nombre of each iglesia that owns one of the eventos read: an iglesia sumada says who shares it. */
  nombresDeIglesias: Record<string, string>;
  /**
   * The place in the structure, now, of each iglesia sumada of the eventos read:
   * one that moved under the duenio sees the evento by its alcance.
   */
  sumadas: Record<string, IglesiaEnEstructura>;
};

/**
 * An evento with the iglesias sumadas of that evento and the nombre of the
 * iglesia or distrito that owns it, if one does. The iglesia is named by its
 * foreign key: iglesias also reach eventos through iglesias_sumadas.
 */
const EVENTO_COLUMNS = `
  id, titulo, lugar, lugar_id, descripcion, enfasis, alcance,
  duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
  hora, fecha_fin, repeticion, fin_de_serie,
  iglesias_sumadas (iglesia_id, iglesias (distrito_id, distritos (asociacion_id))),
  lugares (nombre),
  iglesias!eventos_duenio_iglesia_id_fkey (nombre),
  distritos (nombre)
` as const;

/** What a date of a series changed, with the nombre of the lugar it took. */
const EXCEPCION_COLUMNS = `
  fecha, fecha_nueva, titulo, hora, cambia_lugar, lugar, lugar_id,
  cambia_descripcion, descripcion, cambia_enfasis, enfasis, borrada,
  lugares (nombre)
` as const;

/**
 * A date with its evento and the excepciones of that evento. Literals the
 * client infers the type of the rows from.
 */
const FECHA_COLUMNS =
  `fecha, eventos!inner (${EVENTO_COLUMNS}, excepciones (${EXCEPCION_COLUMNS}))` as const;

/** A date moved into the month, with its evento. */
const MOVIDA_COLUMNS = `${EXCEPCION_COLUMNS}, eventos!inner (${EVENTO_COLUMNS})` as const;

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

/** Reads the dates moved by an excepcion, as `selectFechas` reads the others. */
function selectMovidas(ownedOrSumada: string | null) {
  const query = supabase.from('excepciones').select(MOVIDA_COLUMNS);

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

type Page<Row> = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;

/**
 * Reads every row of a request, page by page, until a page comes back short.
 * The order by the primary key keeps the pages from overlapping or skipping
 * rows while the dates do not change between pages; a save in between (which
 * deletes and inserts dates of its evento) can leave a date out until the next
 * read.
 */
async function readAll<Row>(readPage: (from: number, to: number) => Page<Row>): Promise<Row[]> {
  const rows: Row[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await readPage(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not read the calendario: ${error.message}`);
    }

    rows.push(...(data ?? []));

    if (!data || data.length < PAGE_SIZE) {
      return rows;
    }
  }
}

/** Reads every date that `filter` keeps (`readAll`). */
function readAllFechas(ownedOrSumada: string | null, filter: (query: FechasQuery) => FechasQuery) {
  return readAll((from, to) =>
    filter(selectFechas(ownedOrSumada)).order('evento_id').order('fecha').range(from, to),
  );
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
): Promise<FechasDelMes> {
  const { firstDay, lastDay } = getMonthRange(month);

  // PostgREST cannot combine in one `or` a column of eventos_fechas (fecha)
  // with a column of the embedded eventos (fecha_fin), hence the two requests.
  // The dates an excepcion moved into the month are read by their new day.
  const [insideTheMonth, startedBefore, movedIn] = await Promise.all([
    readAllFechas(ownedOrSumada, (query) => query.gte('fecha', firstDay).lte('fecha', lastDay)),
    readAllFechas(ownedOrSumada, (query) =>
      query.lt('fecha', firstDay).gte('eventos.fecha_fin', firstDay),
    ),
    readAll((from, to) =>
      selectMovidas(ownedOrSumada)
        .gte('fecha_nueva', firstDay)
        .lte('fecha_nueva', lastDay)
        .order('evento_id')
        .order('fecha')
        .range(from, to),
    ),
  ]);

  const rows = [...insideTheMonth, ...startedBefore];
  const fechas: FechaDeEvento[] = [];

  for (const row of rows) {
    const excepcion = row.eventos.excepciones
      .map(toExcepcion)
      .find((excepcion) => excepcion.fecha === row.fecha);

    // A deleted date has no row left. A moved one is read on its new day, by
    // the request of the dates moved into the month.
    if (excepcion?.borrada || excepcion?.fechaNueva) {
      continue;
    }

    fechas.push({
      fecha: row.fecha,
      evento: combinarConExcepcion(toEvento(row.eventos), excepcion),
    });
  }

  for (const movida of movedIn) {
    if (movida.fecha_nueva !== null) {
      fechas.push({
        fecha: movida.fecha_nueva,
        evento: combinarConExcepcion(toEvento(movida.eventos), toExcepcion(movida)),
      });
    }
  }

  const eventos = [...rows.map((row) => row.eventos), ...movedIn.map((movida) => movida.eventos)];

  const nombresDeDistritos = armarNombresDeDistritos(
    eventos.map((evento) => ({
      duenioDistritoId: evento.duenio_distrito_id,
      nombreDeDistrito: evento.distritos?.nombre ?? null,
    })),
  );

  const nombresDeIglesias: Record<string, string> = {};
  const sumadas: Record<string, IglesiaEnEstructura> = {};

  for (const evento of eventos) {
    if (evento.duenio_iglesia_id && evento.iglesias) {
      nombresDeIglesias[evento.duenio_iglesia_id] = evento.iglesias.nombre;
    }

    for (const { iglesia_id, iglesias } of evento.iglesias_sumadas) {
      sumadas[iglesia_id] = {
        id: iglesia_id,
        distritoId: iglesias.distrito_id,
        asociacionId: iglesias.distritos.asociacion_id,
      };
    }
  }

  return { fechas, nombresDeDistritos, nombresDeIglesias, sumadas };
}
