// The server function of the chat de consulta (issue #142): it answers a
// pregunta about the calendario, without a screen. The rules live in
// src/features/chat/dominio (consulta.ts), which this file wires to the
// database (puertos.ts) and to the model (proveedor.ts).
//
// It needs a sesion: the gateway rejects a call without a JWT, and this file
// rejects one whose JWT is not of a usuario (the anon key is a JWT too).
// Nothing of the conversation is kept or logged.
//
// Deploy: `supabase functions deploy chat-consulta`, after
// `supabase secrets set OPENAI_API_KEY=...`. SUPABASE_URL, SUPABASE_ANON_KEY
// and SUPABASE_SERVICE_ROLE_KEY are set by Supabase.

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import {
  responderConsulta,
  type FallaDeConsulta,
} from '../../../src/features/chat/dominio/consulta.ts';
import { crearProveedor } from './proveedor.ts';
import { crearPuertos } from './puertos.ts';

const ESTADOS: Record<FallaDeConsulta, number> = {
  sin_sesion: 401,
  pedido_invalido: 400,
  mensaje_largo: 400,
  sin_consentimiento: 403,
  limite_diario: 429,
  presupuesto_agotado: 429,
  proveedor_caido: 502,
  error_servidor: 500,
};

function responder(estado: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fallar(falla: FallaDeConsulta): Response {
  return responder(ESTADOS[falla], { falla });
}

function getEnv(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) {
    throw new Error(`${nombre} is not set`);
  }
  return valor;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return fallar('pedido_invalido');
  }

  try {
    const url = getEnv('SUPABASE_URL');
    const authorization = request.headers.get('Authorization') ?? '';
    const jwt = authorization.replace(/^Bearer\s+/i, '');

    const usuario = createClient<Database>(url, getEnv('SUPABASE_ANON_KEY'), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await usuario.auth.getUser(jwt);
    const usuarioId = data.user?.id ?? null;

    if (usuarioId === null) {
      return fallar('sin_sesion');
    }

    const body = await request.json().catch(() => null);
    const servidor = createClient<Database>(url, getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const puertos = crearPuertos({
      usuarioId,
      usuario,
      servidor,
      proveedor: crearProveedor(getEnv('OPENAI_API_KEY')),
    });

    const resultado = await responderConsulta(body, usuarioId, puertos);

    return resultado.ok
      ? responder(200, { respuesta: resultado.respuesta })
      : fallar(resultado.falla);
  } catch (error) {
    // Only what failed, never the pedido.
    console.error('chat-consulta failed', error instanceof Error ? error.message : error);
    return fallar('error_servidor');
  }
});
