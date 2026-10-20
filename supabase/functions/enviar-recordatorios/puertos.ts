// The database side of the daily sending: the ports of the domain, bound to a
// service_role client. dispositivos, dispositivos_iglesias and
// recibos_pendientes are closed to the API roles (#162, #211), and the sending
// reads every phone and every evento of tomorrow, so only the server can do it.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import type {
  FechaDeEvento,
  IglesiaEnEstructura,
} from '../../../src/features/calendario/dominio/armarCalendario.ts';
import type { Duenio } from '../../../src/features/eventos/dominio/evento.ts';
import type {
  DispositivoDelEnvio,
  PuertosDeEnvio,
  PuertosDeRecibos,
  ReciboPendiente,
} from '../../../src/features/recordatorios/dominio/envio.ts';

type Cliente = SupabaseClient<Database>;

/**
 * Rows per page. PostgREST cuts each response at `max_rows` (1000, see
 * supabase/config.toml), so a page never asks for more.
 */
const PAGE_SIZE = 1000;

/** Tokens or tickets per update or delete: they travel in the URL of the request. */
const TOKENS_POR_PEDIDO = 100;

/** The Postgres error of a foreign key that points to no row. */
const SIN_FILA_REFERIDA = '23503';

/** What `leerDispositivos` reads of a phone. */
type DispositivoLeido = {
  token: string;
  dispositivos_iglesias: {
    iglesias: {
      id: string;
      distrito_id: string;
      de_baja: boolean;
      distritos: { asociacion_id: string };
    };
  }[];
};

/**
 * The phones of the sending of an asociacion, with the iglesias each one
 * follows there. An iglesia dada de baja already left every phone
 * (20261025500000_prune_dispositivos_iglesias.sql); it is left out here too,
 * so nothing of it is recordado if a phone still had it. A phone left without
 * iglesias is not warned.
 */
export function toDispositivosDelEnvio(
  filas: DispositivoLeido[],
  asociacionId: string,
): DispositivoDelEnvio[] {
  return filas.flatMap((fila) => {
    // Only the iglesias of this asociacion: its 20 h is the one that counts.
    const iglesias = fila.dispositivos_iglesias
      .filter(({ iglesias: iglesia }) => !iglesia.de_baja)
      .map(({ iglesias: iglesia }): IglesiaEnEstructura => ({
        id: iglesia.id,
        distritoId: iglesia.distrito_id,
        asociacionId: iglesia.distritos.asociacion_id,
      }))
      .filter((iglesia) => iglesia.asociacionId === asociacionId);

    return iglesias.length === 0 ? [] : [{ token: fila.token, iglesias }];
  });
}

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
  consultarRecibos,
  ahora = () => new Date(),
}: {
  servidor: Cliente;
  enviar: PuertosDeEnvio['enviar'];
  consultarRecibos: PuertosDeRecibos['consultarRecibos'];
  ahora?: () => Date;
}): PuertosDeEnvio & PuertosDeRecibos {
  async function insertarRecibos(recibos: ReciboPendiente[]) {
    return await servidor
      .from('recibos_pendientes')
      .insert(recibos.map(({ ticket, token }) => ({ ticket, token })));
  }

  /** The tickets whose token is still a phone. */
  async function soloDeTelefonos(recibos: ReciboPendiente[]) {
    const existentes = new Set<string>();

    for (let desde = 0; desde < recibos.length; desde += TOKENS_POR_PEDIDO) {
      const { data, error } = await servidor
        .from('dispositivos')
        .select('token')
        .in(
          'token',
          recibos.slice(desde, desde + TOKENS_POR_PEDIDO).map(({ token }) => token),
        );

      if (error) {
        throw new Error(`Could not read the dispositivos: ${error.message}`);
      }

      data.forEach(({ token }) => existentes.add(token));
    }

    return recibos.filter(({ token }) => existentes.has(token));
  }

  return {
    ahora,
    enviar,
    consultarRecibos,

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
              'token, dispositivos_iglesias (iglesias (id, distrito_id, de_baja, distritos (asociacion_id)))',
            )
            .order('id')
            .range(desde, hasta),
        'dispositivos',
      );

      return toDispositivosDelEnvio(filas, asociacionId);
    },

    async leerFechas(maniana) {
      // Each date with its excepcion, only those that warn: with an enfasis,
      // and of an evento no calendario leaves out for being de baja
      // (20261025200000_recordatorios_con_excepciones.sql).
      const filas = await leerTodo(
        (desde, hasta) =>
          servidor
            .rpc('fechas_de_recordatorio', { maniana })
            .order('evento_id')
            .range(desde, hasta),
        'eventos',
      );

      return filas.map((fila): FechaDeEvento => ({
        fecha: fila.fecha,
        evento: {
          id: fila.evento_id,
          titulo: fila.titulo,
          lugar: fila.lugar,
          lugarId: fila.lugar_id,
          descripcion: fila.descripcion,
          enfasis: fila.enfasis,
          duenio: toDuenio({ ...fila, id: fila.evento_id }),
          hora: fila.hora,
          fechaFin: fila.fecha_fin,
          repeticion: fila.repeticion,
          finDeSerie: fila.fin_de_serie,
          iglesiasSumadas: fila.iglesias_sumadas,
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

    async desactivarPorRecibos(invalidos) {
      // The tickets of one sending share their enviado_at: one update per
      // sending and page of tokens. A phone saved again after its aviso is
      // left as it is.
      const porEnvio = new Map<string, string[]>();
      for (const { token, enviadoAt } of invalidos) {
        const enviado = enviadoAt.toISOString();
        porEnvio.set(enviado, [...(porEnvio.get(enviado) ?? []), token]);
      }

      let desactivados = 0;

      for (const [enviado, tokens] of porEnvio) {
        for (let desde = 0; desde < tokens.length; desde += TOKENS_POR_PEDIDO) {
          const { data, error } = await servidor
            .from('dispositivos')
            .update({ encendido: false, actualizado_at: new Date().toISOString() })
            .in('token', tokens.slice(desde, desde + TOKENS_POR_PEDIDO))
            .lte('actualizado_at', enviado)
            .select('id');

          if (error) {
            throw new Error(`Could not turn off the dispositivos: ${error.message}`);
          }

          desactivados += data.length;
        }
      }

      return desactivados;
    },

    async guardarRecibos(recibos) {
      const { error } = await insertarRecibos(recibos);

      if (!error) {
        return;
      }
      if (error.code !== SIN_FILA_REFERIDA) {
        throw new Error(`Could not keep the tickets: ${error.message}`);
      }

      // A phone deleted while its aviso was sent has no ticket to keep: the
      // others are kept without it.
      const deTelefonos = await soloDeTelefonos(recibos);
      const { error: otroError } =
        deTelefonos.length > 0 ? await insertarRecibos(deTelefonos) : { error: null };

      if (otroError) {
        throw new Error(`Could not keep the tickets: ${otroError.message}`);
      }
    },

    async leerRecibos(hasta) {
      const filas = await leerTodo(
        (desde, hastaFila) =>
          servidor
            .from('recibos_pendientes')
            .select('ticket, token, enviado_at')
            .lte('enviado_at', hasta.toISOString())
            .order('ticket')
            .range(desde, hastaFila),
        'tickets',
      );

      return filas.map((fila) => ({
        ticket: fila.ticket,
        token: fila.token,
        enviadoAt: new Date(fila.enviado_at),
      }));
    },

    async borrarRecibos(tickets) {
      for (let desde = 0; desde < tickets.length; desde += TOKENS_POR_PEDIDO) {
        const { error } = await servidor
          .from('recibos_pendientes')
          .delete()
          .in('ticket', tickets.slice(desde, desde + TOKENS_POR_PEDIDO));

        if (error) {
          throw new Error(`Could not forget the tickets: ${error.message}`);
        }
      }
    },
  };
}
