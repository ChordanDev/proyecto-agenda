// The server function of the daily recordatorios (issue #163): at 20 h of each
// asociacion it sends every phone with its recordatorios on one aviso of the
// eventos of tomorrow in the iglesias it follows. The rules live in
// src/features/recordatorios/dominio (envio.ts and avisoDeManiana.ts), which
// this file wires to the database (puertos.ts) and to Expo Push (expo.ts).
//
// pg_cron calls it every hour (migration 20261022300000): the domain decides
// which asociaciones are at their 20 h. Each run also reads the Expo receipts
// of the avisos sent at least 15 minutes before, and turns off the phones they
// report as uninstalled (issue #211); a failure there keeps the answer of the
// sending (ronda.ts). Only that call may run it: it carries
// the value Vault keeps as `service_role_key`, which must be exactly the value
// of SUPABASE_SERVICE_ROLE_KEY here: the legacy service_role key, a JWT that
// starts with `eyJ`, never a new secret key (`sb_secret_...`), which gets a
// 401 (autorizacion.ts). pg_net does not wait for the answer: a 401 only shows
// in net._http_response. The gateway does not check the JWT
// (supabase/config.toml); this file checks the key.
//
// Deploy: `supabase functions deploy enviar-recordatorios`. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are set by Supabase. EXPO_ACCESS_TOKEN is only
// needed when the Expo project has "Enhanced push security" on. EXPO_PUSH_URL
// and EXPO_RECEIPTS_URL replace the Expo endpoints with a double, only for
// local tests.

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import {
  enviarRecordatorios,
  revisarRecibos,
} from '../../../src/features/recordatorios/dominio/envio.ts';
import { esLlamadaDelCron } from './autorizacion.ts';
import { crearConsultaDeRecibos, crearEnviador } from './expo.ts';
import { crearPuertos } from './puertos.ts';
import { correrRonda } from './ronda.ts';

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

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return responder(405, { falla: 'pedido_invalido' });
  }

  try {
    const clave = getEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!esLlamadaDelCron(request.headers.get('Authorization'), clave)) {
      return responder(401, { falla: 'sin_permiso' });
    }

    const servidor = createClient<Database>(getEnv('SUPABASE_URL'), clave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN') || undefined;
    const puertos = crearPuertos({
      servidor,
      enviar: crearEnviador({ url: Deno.env.get('EXPO_PUSH_URL') || undefined, accessToken }),
      consultarRecibos: crearConsultaDeRecibos({
        url: Deno.env.get('EXPO_RECEIPTS_URL') || undefined,
        accessToken,
      }),
    });

    // Only counts reach the logs, never a token or a text (ronda.ts).
    const { estado, body } = await correrRonda({
      enviar: () => enviarRecordatorios(puertos),
      revisarRecibos: () => revisarRecibos(puertos),
    });

    return responder(estado, body);
  } catch (error) {
    console.error('enviar-recordatorios failed', error instanceof Error ? error.message : error);
    return responder(500, { falla: 'error_servidor' });
  }
});
