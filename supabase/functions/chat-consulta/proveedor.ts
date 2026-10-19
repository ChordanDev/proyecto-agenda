// The provider of the model of the chat: GPT-6 Luna, from OpenAI. Changing the
// model or the provider is changing this file alone; the rest of the chat only
// knows the Proveedor of the domain. The key lives in the secrets of the
// server (`supabase secrets set OPENAI_API_KEY=...`), never in the repository.

import {
  HERRAMIENTA_BUSCAR_EVENTOS,
  type LlamadaABusqueda,
  type MensajeParaProveedor,
  type Proveedor,
} from '../../../src/features/chat/dominio/consulta.ts';

const MODELO = 'gpt-6-luna';

/** List prices of the model, in USD per million tokens. */
const USD_POR_MILLON_DE_ENTRADA = 0.1;
const USD_POR_MILLON_DE_SALIDA = 0.5;

/** A call that takes longer counts as the provider being down. */
const TIEMPO_MAXIMO_MS = 20_000;

const URL_DE_OPENAI = 'https://api.openai.com/v1/chat/completions';

type MensajeDeOpenAI =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: LlamadaDeOpenAI[] }
  | { role: 'tool'; tool_call_id: string; content: string };

type LlamadaDeOpenAI = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

type RespuestaDeOpenAI = {
  choices?: { message?: { content?: string | null; tool_calls?: LlamadaDeOpenAI[] } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

function toMensajeDeOpenAI(mensaje: MensajeParaProveedor): MensajeDeOpenAI {
  switch (mensaje.rol) {
    case 'sistema':
      return { role: 'system', content: mensaje.texto };
    case 'usuario':
      return { role: 'user', content: mensaje.texto };
    case 'asistente':
      return { role: 'assistant', content: mensaje.texto };
    case 'pedido_de_busqueda':
      return {
        role: 'assistant',
        content: null,
        tool_calls: mensaje.llamadas.map((llamada) => ({
          id: llamada.id,
          type: 'function',
          function: {
            name: HERRAMIENTA_BUSCAR_EVENTOS.nombre,
            arguments: JSON.stringify(llamada.argumentos),
          },
        })),
      };
    case 'busqueda':
      return { role: 'tool', tool_call_id: mensaje.llamadaId, content: mensaje.contenido };
  }
}

/** The arguments the model wrote; null when they are not JSON, so the domain tells it. */
function toLlamada({ id, function: funcion }: LlamadaDeOpenAI): LlamadaABusqueda {
  try {
    return { id, argumentos: JSON.parse(funcion.arguments) };
  } catch {
    return { id, argumentos: null };
  }
}

export function crearProveedor(apiKey: string): Proveedor {
  return {
    async responder(mensajes, { conBusqueda }) {
      const response = await fetch(URL_DE_OPENAI, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
        body: JSON.stringify({
          model: MODELO,
          messages: mensajes.map(toMensajeDeOpenAI),
          ...(conBusqueda
            ? {
                tools: [
                  {
                    type: 'function',
                    function: {
                      name: HERRAMIENTA_BUSCAR_EVENTOS.nombre,
                      description: HERRAMIENTA_BUSCAR_EVENTOS.descripcion,
                      parameters: HERRAMIENTA_BUSCAR_EVENTOS.parametros,
                      strict: true,
                    },
                  },
                ],
              }
            : {}),
        }),
      });

      if (!response.ok) {
        // Never the body: it could echo the mensajes.
        throw new Error(`OpenAI answered ${response.status}`);
      }

      const { choices, usage }: RespuestaDeOpenAI = await response.json();
      const mensaje = choices?.[0]?.message;
      const costoUsd =
        ((usage?.prompt_tokens ?? 0) * USD_POR_MILLON_DE_ENTRADA +
          (usage?.completion_tokens ?? 0) * USD_POR_MILLON_DE_SALIDA) /
        1_000_000;

      if (mensaje?.tool_calls && mensaje.tool_calls.length > 0) {
        return { tipo: 'busqueda', llamadas: mensaje.tool_calls.map(toLlamada), costoUsd };
      }
      return { tipo: 'texto', texto: mensaje?.content ?? '', costoUsd };
    },
  };
}
