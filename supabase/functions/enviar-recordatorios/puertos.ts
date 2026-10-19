// The database side of the daily sending: the ports of the domain, bound to a
// service_role client. dispositivos and dispositivos_iglesias are closed to
// the API roles (#162), and the sending reads every phone and every evento of
// tomorrow, so only the server can do it.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import type {
  FechaDeEvento,
  IglesiaEnEstructura,
} from '../../../src/features/calendario/dominio/armarCalendario.ts';
import type { Duenio } from '../../../src/features/eventos/dominio/evento.ts';
import type { PuertosDeEnvio } from '../../../src/features/recordatorios/dominio/envio.ts';

type Cliente = SupabaseClient<Database>;

/**
 * Rows per page. PostgREST cuts each response at `max_rows` (1000, see
 * supabase/config.toml), so a page never asks for more.
 */
const PAGE_SIZE = 1000;

/** Tokens per update: they travel in the URL of the request. */
const TOKENS_POR_PEDIDO = 100;

/** Reads every page of a query ordered by a unique key, until a page comes back short. */
async function leerTodo<T>(
  leerPagina: (
    desde: number,
    hasta: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  que: string,
): Promise<T[]> {
  const filas: T[] = [];

  for (let desde = 0; ; desde += PAGE_SIZE) {
    const { data, error } = await leerPagina(desde, desde + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Could not read the ${que}: ${error.message}`);
    }

    filas.push(...(data ?? []));

    if ((data ?? []).length < PAGE_SIZE) {
      return filas;
    }
  }
}

type EventoRow = Database['public']['Tables']['eventos']['Row'];

/** The database guarantees one duenio per alcance (eventos_duenio_matches_alcance). */
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

export function crearPuertos({
  servidor,
  enviar,
  ahora = () => new Date(),
}: {
  servidor: Cliente;
  enviar: PuertosDeEnvio['enviar'];
  ahora?: () => Date;
}): PuertosDeEnvio {
  return {
    ahora,
    enviar,

    async leerAsociaciones() {
      const { data, error } = await servidor.from('asociaciones').select('id, zona_horaria');

      if (error) {
        throw new Error(`Could not read the asociaciones: ${error.message}`);
      }

      return data.map((fila) => ({ id: fila.id, zonaHoraria: fila.zona_horaria }));
    },

    async leerDispositivos(asociacionId) {
      const filas = await leerTodo(
        (desde, hasta) =>
          servidor
            .from('dispositivos')
            .select(
              'token, dispositivos_iglesias (iglesias (id, distrito_id, distritos (asociacion_id)))',
            )
            .eq('encendido', true)
            .order('id')
            .range(desde, hasta),
        'dispositivos',
      );

      return filas.flatMap((fila) => {
        // Only the iglesias of this asociacion: its 20 h is the one that counts.
        const iglesias = fila.dispositivos_iglesias
          .map(({ iglesias: iglesia }): IglesiaEnEstructura => ({
            id: iglesia.id,
            distritoId: iglesia.distrito_id,
            asociacionId: iglesia.distritos.asociacion_id,
          }))
          .filter((iglesia) => iglesia.asociacionId === asociacionId);

        return iglesias.length === 0 ? [] : [{ token: fila.token, iglesias }];
      });
    },

    async leerFechas(maniana) {
      // An evento of several days has its first day as its date: the domain
      // only warns before that one, so the dates of tomorrow are enough.
      const filas = await leerTodo(
        (desde, hasta) =>
          servidor
            .from('eventos_fechas')
            .select(
              `fecha,
               eventos!inner (
                 id, titulo, lugar, lugar_id, descripcion, enfasis, alcance,
                 duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
                 hora, fecha_fin, repeticion, fin_de_serie,
                 iglesias_sumadas (iglesia_id)
               )`,
            )
            .eq('fecha', maniana)
            .order('evento_id')
            .range(desde, hasta),
        'eventos',
      );

      return filas.map(({ fecha, eventos: evento }): FechaDeEvento => ({
        fecha,
        evento: {
          id: evento.id,
          titulo: evento.titulo,
          lugar: evento.lugar,
          lugarId: evento.lugar_id,
          descripcion: evento.descripcion,
          enfasis: evento.enfasis,
          duenio: toDuenio(evento),
          hora: evento.hora,
          fechaFin: evento.fecha_fin,
          repeticion: evento.repeticion,
          finDeSerie: evento.fin_de_serie,
          iglesiasSumadas: evento.iglesias_sumadas.map((sumada) => sumada.iglesia_id),
        },
      }));
    },

    async desactivar(tokens) {
      for (let desde = 0; desde < tokens.length; desde += TOKENS_POR_PEDIDO) {
        const { error } = await servidor
          .from('dispositivos')
          .update({ encendido: false, actualizado_at: new Date().toISOString() })
          .in('token', tokens.slice(desde, desde + TOKENS_POR_PEDIDO));

        if (error) {
          throw new Error(`Could not turn off the dispositivos: ${error.message}`);
        }
      }
    },
  };
}
