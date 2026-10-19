// The server function of the daily recordatorios (issue #163): at 20 h of each
// asociacion it sends every phone with its recordatorios on one aviso of the
// eventos of tomorrow in the iglesias it follows. The rules live in
// src/features/recordatorios/dominio (envio.ts and avisoDeManiana.ts), which
// this file wires to the database (puertos.ts) and to Expo Push (expo.ts).
//
// pg_cron calls it every hour (migration 20261022300000): the domain decides
// which asociaciones are at their 20 h. Only that call may run it: it must
// carry the service_role key, which the schedule reads from Vault. The gateway
// does not check the JWT (supabase/config.toml), this file checks the key.
//
// Deploy: `supabase functions deploy enviar-recordatorios`. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set by Supabase. EXPO_ACCESS_TOKEN is only
// needed when the Expo project has "Enhanced push security" on. EXPO_PUSH_URL
// replaces the Expo endpoint with a double, only for local tests.

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import { enviarRecordatorios } from '../../../src/features/recordatorios/dominio/envio.ts';
import { crearEnviador } from './expo.ts';
import { crearPuertos } from './puertos.ts';

function responder(estado: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getEnv(nombre: string): string {
  const valor = Deno.env.get(nombre);
  if (!valor) {
    throw new Error(`${nombre} is not set`);
  }
  return valor;
}

/** Compares in constant time, so the time of the answer says nothing of the key but its length. */
function esIgual(a: string, b: string): boolean {
  const bytesA = new TextEncoder().encode(a);
  const bytesB = new TextEncoder().encode(b);

  if (bytesA.length !== bytesB.length) {
    return false;
  }

  let diferencia = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diferencia |= bytesA[i] ^ bytesB[i];
  }

  return diferencia === 0;
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return responder(405, { falla: 'pedido_invalido' });
  }

  try {
    const clave = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization') ?? '';

    if (!esIgual(authorization, `Bearer ${clave}`)) {
      return responder(401, { falla: 'sin_permiso' });
    }

    const servidor = createClient<Database>(getEnv('SUPABASE_URL'), clave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const enviar = crearEnviador({
      url: Deno.env.get('EXPO_PUSH_URL') || undefined,
      accessToken: Deno.env.get('EXPO_ACCESS_TOKEN') || undefined,
    });

    const resultado = await enviarRecordatorios(crearPuertos({ servidor, enviar }));

    // Only counts reach the logs, never a token or a text.
    console.log('enviar-recordatorios', resultado);

    return responder(resultado.fallidos > 0 ? 502 : 200, resultado);
  } catch (error) {
    console.error('enviar-recordatorios failed', error instanceof Error ? error.message : error);
    return responder(500, { falla: 'error_servidor' });
  }
});
