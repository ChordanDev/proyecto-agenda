// The push service: Expo Push (https://docs.expo.dev/push-notifications/sending-notifications/).
//
// Expo takes up to 100 notifications per request and answers one ticket per
// notification, in the same order. A ticket with the error DeviceNotRegistered
// means the token is no longer valid (the app was uninstalled): the domain
// turns that phone off. Any other error, or a request that fails as a whole,
// leaves those avisos as failed; the rest are still sent.
//
// An ok ticket carries an id. Its receipt, read later from the receipts
// endpoint, says whether Apple or Google took the notification: many
// uninstalls only show there, as DeviceNotRegistered too.

import type {
  Aviso,
  EstadoDeRecibo,
  ResultadoDeAviso,
} from '../../../src/features/recordatorios/dominio/envio.ts';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

/** The most notifications Expo takes in one request. */
const MAX_POR_PEDIDO = 100;

/** The most receipts asked in one request, as the Expo server SDK does. */
const MAX_RECIBOS_POR_PEDIDO = 300;

type Ticket = { status: 'ok'; id?: string } | { status: 'error'; details?: { error?: string } };

/** A receipt has the shape of a ticket, without an id. */
type Recibo = { status: 'ok' } | { status: 'error'; details?: { error?: string } };

function esNoRegistrado(respuesta: Ticket | Recibo | undefined): boolean {
  return respuesta?.status === 'error' && respuesta.details?.error === 'DeviceNotRegistered';
}

function resultadoDe(ticket: Ticket | undefined): ResultadoDeAviso {
  if (ticket?.status === 'ok') {
    return typeof ticket.id === 'string'
      ? { estado: 'enviado', ticket: ticket.id }
      : { estado: 'enviado' };
  }

  return esNoRegistrado(ticket) ? { estado: 'invalido' } : { estado: 'fallido' };
}

function estadoDe(recibo: Recibo): EstadoDeRecibo {
  if (recibo.status === 'ok') {
    return 'ok';
  }

  return esNoRegistrado(recibo) ? 'invalido' : 'fallido';
}

function encabezados(accessToken: string | undefined): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

export function crearEnviador({
  url = EXPO_PUSH_URL,
  accessToken,
  fetch: enviarPedido = fetch,
}: {
  url?: string;
  /** Only needed when the Expo project has "Enhanced push security" on. */
  accessToken?: string;
  fetch?: typeof fetch;
} = {}) {
  async function enviarTanda(avisos: Aviso[]): Promise<ResultadoDeAviso[]> {
    try {
      const respuesta = await enviarPedido(url, {
        method: 'POST',
        headers: encabezados(accessToken),
        body: JSON.stringify(
          avisos.map(({ token, texto }) => ({ to: token, body: texto, sound: 'default' })),
        ),
      });

      if (!respuesta.ok) {
        console.error('Expo Push answered', respuesta.status);
        return avisos.map(() => ({ estado: 'fallido' }));
      }

      const { data } = (await respuesta.json()) as { data?: Ticket[] };

      return avisos.map((_, indice) => resultadoDe(data?.[indice]));
    } catch (error) {
      console.error('Expo Push failed', error instanceof Error ? error.message : error);
      return avisos.map(() => ({ estado: 'fallido' }));
    }
  }

  return async function enviar(avisos: Aviso[]): Promise<ResultadoDeAviso[]> {
    const resultados: ResultadoDeAviso[] = [];

    for (let desde = 0; desde < avisos.length; desde += MAX_POR_PEDIDO) {
      resultados.push(...(await enviarTanda(avisos.slice(desde, desde + MAX_POR_PEDIDO))));
    }

    return resultados;
  };
}

/**
 * Reads the receipts of the tickets. A ticket whose receipt is not ready yet
 * is missing from the answer, and so is every ticket of a request that fails:
 * the domain asks for them again the next hour.
 */
export function crearConsultaDeRecibos({
  url = EXPO_RECEIPTS_URL,
  accessToken,
  fetch: enviarPedido = fetch,
}: {
  url?: string;
  /** Only needed when the Expo project has "Enhanced push security" on. */
  accessToken?: string;
  fetch?: typeof fetch;
} = {}) {
  async function consultarTanda(tickets: string[], estados: Map<string, EstadoDeRecibo>) {
    try {
      const respuesta = await enviarPedido(url, {
        method: 'POST',
        headers: encabezados(accessToken),
        body: JSON.stringify({ ids: tickets }),
      });

      if (!respuesta.ok) {
        console.error('Expo receipts answered', respuesta.status);
        return;
      }

      const { data } = (await respuesta.json()) as { data?: Record<string, Recibo> };

      for (const ticket of tickets) {
        const recibo = data?.[ticket];

        if (recibo) {
          estados.set(ticket, estadoDe(recibo));
        }
      }
    } catch (error) {
      console.error('Expo receipts failed', error instanceof Error ? error.message : error);
    }
  }

  return async function consultarRecibos(tickets: string[]): Promise<Map<string, EstadoDeRecibo>> {
    const estados = new Map<string, EstadoDeRecibo>();

    for (let desde = 0; desde < tickets.length; desde += MAX_RECIBOS_POR_PEDIDO) {
      await consultarTanda(tickets.slice(desde, desde + MAX_RECIBOS_POR_PEDIDO), estados);
    }

    return estados;
  };
}
