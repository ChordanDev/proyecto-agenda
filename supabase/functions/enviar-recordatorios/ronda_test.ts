import assert from 'node:assert/strict';

import { correrRonda } from './ronda.ts';

const TOKEN = 'ExponentPushToken[ronda-secreto]';

/** A double of the console that keeps what each call logged. */
function registroDoble() {
  const lineas: { nivel: 'log' | 'error'; partes: unknown[] }[] = [];
  return {
    lineas,
    registro: {
      log: (...partes: unknown[]) => lineas.push({ nivel: 'log', partes }),
      error: (...partes: unknown[]) => lineas.push({ nivel: 'error', partes }),
    },
  };
}

Deno.test('a sending without failures and its receipts answer 200 with both counts', async () => {
  const { registro } = registroDoble();

  const respuesta = await correrRonda(
    {
      enviar: () => Promise.resolve({ enviados: 3, desactivados: 1, fallidos: 0 }),
      revisarRecibos: () => Promise.resolve({ revisados: 2, desactivados: 1 }),
    },
    registro,
  );

  assert.deepEqual(respuesta, {
    estado: 200,
    body: { enviados: 3, desactivados: 1, fallidos: 0, recibos: { revisados: 2, desactivados: 1 } },
  });
});

Deno.test('a sending with failed avisos answers 502', async () => {
  const { registro } = registroDoble();

  const respuesta = await correrRonda(
    {
      enviar: () => Promise.resolve({ enviados: 1, desactivados: 0, fallidos: 2 }),
      revisarRecibos: () => Promise.resolve({ revisados: 0, desactivados: 0 }),
    },
    registro,
  );

  assert.equal(respuesta.estado, 502);
  assert.deepEqual(respuesta.body, {
    enviados: 1,
    desactivados: 0,
    fallidos: 2,
    recibos: { revisados: 0, desactivados: 0 },
  });
});

Deno.test(
  'a failure reading the receipts keeps the status and the counts of the sending',
  async () => {
    for (const [fallidos, estado] of [
      [0, 200],
      [2, 502],
    ]) {
      const { lineas, registro } = registroDoble();

      const respuesta = await correrRonda(
        {
          enviar: () => Promise.resolve({ enviados: 3, desactivados: 1, fallidos }),
          revisarRecibos: () =>
            Promise.reject(new Error('Could not forget the tickets: connection reset')),
        },
        registro,
      );

      assert.deepEqual(respuesta, {
        estado,
        body: {
          enviados: 3,
          desactivados: 1,
          fallidos,
          recibos: { falla: 'error_servidor' },
        },
      });
      assert.deepEqual(lineas, [
        {
          nivel: 'log',
          partes: ['enviar-recordatorios', { enviados: 3, desactivados: 1, fallidos }],
        },
        {
          nivel: 'error',
          partes: [
            'enviar-recordatorios recibos failed',
            'Could not forget the tickets: connection reset',
          ],
        },
      ]);
    }
  },
);

Deno.test('the receipts failure logs only the error message, never the error object', async () => {
  const { lineas, registro } = registroDoble();
  const error = Object.assign(new Error('Could not read the recibos: timeout'), {
    tokens: [TOKEN],
  });

  await correrRonda(
    {
      enviar: () => Promise.resolve({ enviados: 1, desactivados: 0, fallidos: 0 }),
      revisarRecibos: () => Promise.reject(error),
    },
    registro,
  );

  assert.ok(!JSON.stringify(lineas).includes(TOKEN));
});

Deno.test('a failure in the sending is thrown, and the receipts are not read', async () => {
  const { registro } = registroDoble();
  let recibosLeidos = false;

  await assert.rejects(
    correrRonda(
      {
        enviar: () => Promise.reject(new Error('Could not read the asociaciones: down')),
        revisarRecibos: () => {
          recibosLeidos = true;
          return Promise.resolve({ revisados: 0, desactivados: 0 });
        },
      },
      registro,
    ),
    /Could not read the asociaciones/,
  );
  assert.equal(recibosLeidos, false);
});
