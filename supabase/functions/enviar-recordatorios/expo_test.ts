// Unit tests of the Expo Push client, with a double of fetch.
// Run: `deno test` in this folder.

import assert from 'node:assert/strict';

import { crearEnviador } from './expo.ts';

type Pedido = { url: string; body: { to: string; body: string }[]; authorization: string | null };

/** A double of Expo Push: answers each notification with the ticket `ticketDe` gives its token. */
function dobleDeExpo(ticketDe: (token: string) => unknown, estado = 200) {
  const pedidos: Pedido[] = [];

  const fetchDoble = (async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Pedido['body'];
    const headers = new Headers(init?.headers);
    pedidos.push({ url: String(url), body, authorization: headers.get('Authorization') });

    return new Response(JSON.stringify({ data: body.map(({ to }) => ticketDe(to)) }), {
      status: estado,
    });
  }) as typeof fetch;

  return { fetchDoble, pedidos };
}

const ok = { status: 'ok', id: 'ticket' };

Deno.test('sends each aviso as a notification with its text', async () => {
  const { fetchDoble, pedidos } = dobleDeExpo(() => ok);
  const enviar = crearEnviador({ url: 'http://expo.test/send', fetch: fetchDoble });

  const resultados = await enviar([
    { token: 'ExponentPushToken[a]', texto: 'Mañana: Culto joven' },
  ]);

  assert.deepEqual(resultados, ['enviado']);
  assert.equal(pedidos[0].url, 'http://expo.test/send');
  assert.deepEqual(pedidos[0].body, [
    { to: 'ExponentPushToken[a]', body: 'Mañana: Culto joven', sound: 'default' },
  ]);
  assert.equal(pedidos[0].authorization, null);
});

Deno.test(
  'reports DeviceNotRegistered as an invalid token and other errors as failed',
  async () => {
    const { fetchDoble } = dobleDeExpo((token) =>
      token === 'ExponentPushToken[viejo]'
        ? { status: 'error', message: 'not registered', details: { error: 'DeviceNotRegistered' } }
        : token === 'ExponentPushToken[limite]'
          ? { status: 'error', message: 'too many', details: { error: 'MessageRateExceeded' } }
          : ok,
    );
    const enviar = crearEnviador({ fetch: fetchDoble });

    const resultados = await enviar([
      { token: 'ExponentPushToken[a]', texto: 'Mañana: A' },
      { token: 'ExponentPushToken[viejo]', texto: 'Mañana: B' },
      { token: 'ExponentPushToken[limite]', texto: 'Mañana: C' },
    ]);

    assert.deepEqual(resultados, ['enviado', 'invalido', 'fallido']);
  },
);

Deno.test('sends at most 100 notifications per request', async () => {
  const { fetchDoble, pedidos } = dobleDeExpo(() => ok);
  const enviar = crearEnviador({ fetch: fetchDoble });
  const avisos = Array.from({ length: 205 }, (_, i) => ({
    token: `ExponentPushToken[${i}]`,
    texto: 'Mañana: Culto joven',
  }));

  const resultados = await enviar(avisos);

  assert.deepEqual(
    pedidos.map((pedido) => pedido.body.length),
    [100, 100, 5],
  );
  assert.equal(resultados.length, 205);
  assert.ok(resultados.every((resultado) => resultado === 'enviado'));
});

Deno.test('leaves a whole request as failed when Expo rejects it, and goes on', async () => {
  let pedido = 0;
  const fetchDoble = (async (_url: string | URL | Request, init?: RequestInit) => {
    pedido++;
    const body = JSON.parse(String(init?.body)) as unknown[];
    return pedido === 1
      ? new Response('Internal error', { status: 500 })
      : new Response(JSON.stringify({ data: body.map(() => ok) }), { status: 200 });
  }) as typeof fetch;
  const enviar = crearEnviador({ fetch: fetchDoble });
  const avisos = Array.from({ length: 101 }, (_, i) => ({
    token: `ExponentPushToken[${i}]`,
    texto: 'Mañana: Culto joven',
  }));

  const resultados = await enviar(avisos);

  assert.equal(resultados.filter((r) => r === 'fallido').length, 100);
  assert.equal(resultados[100], 'enviado');
});

Deno.test('leaves the avisos as failed when Expo cannot be reached', async () => {
  const fetchDoble = (() => Promise.reject(new Error('offline'))) as typeof fetch;
  const enviar = crearEnviador({ fetch: fetchDoble });

  assert.deepEqual(await enviar([{ token: 'ExponentPushToken[a]', texto: 'Mañana: A' }]), [
    'fallido',
  ]);
});

Deno.test('sends the access token when there is one', async () => {
  const { fetchDoble, pedidos } = dobleDeExpo(() => ok);
  const enviar = crearEnviador({ accessToken: 'secreto', fetch: fetchDoble });

  await enviar([{ token: 'ExponentPushToken[a]', texto: 'Mañana: A' }]);

  assert.equal(pedidos[0].authorization, 'Bearer secreto');
});
