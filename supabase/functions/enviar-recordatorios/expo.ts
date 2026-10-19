// The push service: Expo Push (https://docs.expo.dev/push-notifications/sending-notifications/).
//
// Expo takes up to 100 notifications per request and answers one ticket per
// notification, in the same order. A ticket with the error DeviceNotRegistered
// means the token is no longer valid (the app was uninstalled): the domain
// turns that phone off. Any other error, or a request that fails as a whole,
// leaves those avisos as failed; the rest are still sent.

import type { Aviso, ResultadoDeAviso } from '../../../src/features/recordatorios/dominio/envio.ts';

export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** The most notifications Expo takes in one request. */
const MAX_POR_PEDIDO = 100;

type Ticket = { status: 'ok' } | { status: 'error'; details?: { error?: string } };

function resultadoDe(ticket: Ticket | undefined): ResultadoDeAviso {
  if (ticket?.status === 'ok') {
    return 'enviado';
  }

  return ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
    ? 'invalido'
    : 'fallido';
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
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(
          avisos.map(({ token, texto }) => ({ to: token, body: texto, sound: 'default' })),
        ),
      });

      if (!respuesta.ok) {
        console.error('Expo Push answered', respuesta.status);
        return avisos.map(() => 'fallido');
      }

      const { data } = (await respuesta.json()) as { data?: Ticket[] };

      return avisos.map((_, indice) => resultadoDe(data?.[indice]));
    } catch (error) {
      console.error('Expo Push failed', error instanceof Error ? error.message : error);
      return avisos.map(() => 'fallido');
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
