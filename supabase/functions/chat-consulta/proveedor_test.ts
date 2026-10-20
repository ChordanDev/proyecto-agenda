import assert from 'node:assert/strict';

import type { MensajeParaProveedor } from '../../../src/features/chat/dominio/consulta.ts';
import { crearProveedor } from './proveedor.ts';

type Cuerpo = {
  messages: { role: string; tool_calls?: { function: { name: string } }[] }[];
  tools?: { function: { name: string } }[];
};

/**
 * Runs `prueba` with a fetch that answers `respuesta` as OpenAI would, and
 * returns the bodies sent to it. No test reaches OpenAI.
 */
async function conOpenAI(respuesta: unknown, prueba: () => Promise<void>): Promise<Cuerpo[]> {
  const cuerpos: Cuerpo[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = (_url, init) => {
    cuerpos.push(JSON.parse(String(init?.body)));
    return Promise.resolve(new Response(JSON.stringify(respuesta), { status: 200 }));
  };
  try {
    await prueba();
  } finally {
    globalThis.fetch = original;
  }
  return cuerpos;
}

function llamadas(...funciones: { name: string; arguments: string }[]) {
  return {
    choices: [
      {
        message: {
          content: null,
          tool_calls: funciones.map((funcion, i) => ({
            id: `llamada-${i}`,
            type: 'function',
            function: funcion,
          })),
        },
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  };
}

const MENSAJES: MensajeParaProveedor[] = [{ rol: 'usuario', texto: 'Hola' }];
const AMBAS = { conBusqueda: true, conPropuesta: true };

Deno.test('a llamada keeps the name of the herramienta the model called', async () => {
  const proveedor = crearProveedor('clave');
  let respuesta;

  await conOpenAI(
    llamadas(
      { name: 'buscar_eventos', arguments: '{"desde":"2026-10-24"}' },
      { name: 'proponer_evento', arguments: '{"titulo":"Culto joven"}' },
    ),
    async () => {
      respuesta = await proveedor.responder(MENSAJES, AMBAS);
    },
  );

  assert.deepEqual(respuesta, {
    tipo: 'busqueda',
    llamadas: [
      { id: 'llamada-0', herramienta: 'buscar_eventos', argumentos: { desde: '2026-10-24' } },
      { id: 'llamada-1', herramienta: 'proponer_evento', argumentos: { titulo: 'Culto joven' } },
    ],
    costoUsd: (10 * 0.1 + 5 * 0.5) / 1_000_000,
  });
});

Deno.test(
  'a herramienta the model made up is read as a busqueda, which the domain checks',
  async () => {
    const proveedor = crearProveedor('clave');
    let respuesta;

    await conOpenAI(llamadas({ name: 'guardar_evento', arguments: '{}' }), async () => {
      respuesta = await proveedor.responder(MENSAJES, AMBAS);
    });

    assert.deepEqual(respuesta, {
      tipo: 'busqueda',
      llamadas: [{ id: 'llamada-0', herramienta: 'buscar_eventos', argumentos: {} }],
      costoUsd: (10 * 0.1 + 5 * 0.5) / 1_000_000,
    });
  },
);

Deno.test(
  'arguments that are not JSON reach the domain as null, so it tells the model',
  async () => {
    const proveedor = crearProveedor('clave');
    let respuesta;

    await conOpenAI(llamadas({ name: 'proponer_evento', arguments: '{roto' }), async () => {
      respuesta = await proveedor.responder(MENSAJES, AMBAS);
    });

    assert.deepEqual(respuesta, {
      tipo: 'busqueda',
      llamadas: [{ id: 'llamada-0', herramienta: 'proponer_evento', argumentos: null }],
      costoUsd: (10 * 0.1 + 5 * 0.5) / 1_000_000,
    });
  },
);

Deno.test('the llamadas sent back to OpenAI carry the name of their herramienta', async () => {
  const proveedor = crearProveedor('clave');

  const [cuerpo] = await conOpenAI({ choices: [{ message: { content: 'Listo.' } }] }, async () => {
    await proveedor.responder(
      [
        ...MENSAJES,
        {
          rol: 'pedido_de_busqueda',
          llamadas: [
            { id: 'a', argumentos: {} },
            { id: 'b', herramienta: 'buscar_eventos', argumentos: {} },
            { id: 'c', herramienta: 'proponer_evento', argumentos: {} },
          ],
        },
      ],
      AMBAS,
    );
  });

  // A llamada without herramienta is a busqueda.
  assert.deepEqual(
    cuerpo.messages[1].tool_calls?.map((llamada) => llamada.function.name),
    ['buscar_eventos', 'buscar_eventos', 'proponer_evento'],
  );
});

Deno.test('OpenAI gets only the herramientas of the round', async () => {
  const proveedor = crearProveedor('clave');
  const texto = { choices: [{ message: { content: 'Hola' } }] };

  const cuerpos = await conOpenAI(texto, async () => {
    await proveedor.responder(MENSAJES, AMBAS);
    await proveedor.responder(MENSAJES, { conBusqueda: true, conPropuesta: false });
    await proveedor.responder(MENSAJES, { conBusqueda: false, conPropuesta: false });
  });

  assert.deepEqual(
    cuerpos.map((cuerpo) => cuerpo.tools?.map((herramienta) => herramienta.function.name)),
    [['buscar_eventos', 'proponer_evento'], ['buscar_eventos'], undefined],
  );
});
