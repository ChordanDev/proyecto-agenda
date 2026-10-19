// The server function that gives a cargo (issue #154): a secretaria de
// iglesia, a pastor or an admin invites someone by correo, without a screen
// yet. The rules live in src/features/gestion/dominio/invitacion.ts, which this
// file wires to the database (puertos.ts) and to Resend (correo.ts).
//
// It needs a sesion: the gateway rejects a call without a JWT, and this file
// rejects one whose JWT is not of a usuario (the anon key is a JWT too).
//
// Deploy: `supabase functions deploy invitar`, after
// `supabase secrets set RESEND_API_KEY=... RESEND_REMITENTE=... ENLACE_APP_STORE=... ENLACE_GOOGLE_PLAY=...`.
// RESEND_REMITENTE is the sender of the domain of the asociacion, for example
// `Agenda de iglesia <agenda@asociacion.org>`. SUPABASE_URL, SUPABASE_ANON_KEY
// and SUPABASE_SERVICE_ROLE_KEY are set by Supabase. None of them reaches the app.

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import {
  invitarCargo,
  type FallaDeInvitacion,
} from '../../../src/features/gestion/dominio/invitacion.ts';
import { crearEnvioDeCorreo } from './correo.ts';
import { crearPuertos } from './puertos.ts';

const ESTADOS: Record<FallaDeInvitacion, number> = {
  sin_sesion: 401,
  pedido_invalido: 400,
  sin_permiso: 403,
  correo_no_enviado: 502,
  error_servidor: 500,
};

/** Characters of a body: a nombre, a correo, a funcion and two ids fit with room to spare. */
const MAX_LARGO_DEL_PEDIDO = 2_000;

/** The body as JSON; null when it is too long or not JSON, which the domain rejects. */
async function leerBody(request: Request): Promise<unknown> {
  const texto = await request.text();
  if (texto.length > MAX_LARGO_DEL_PEDIDO) {
    return null;
  }
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function responder(estado: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: estado,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fallar(falla: FallaDeInvitacion): Response {
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
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await usuario.auth.getUser(jwt);
    const gestorId = data.user?.id ?? null;

    if (gestorId === null) {
      return fallar('sin_sesion');
    }

    const body = await leerBody(request);
    const servidor = createClient<Database>(url, getEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const puertos = crearPuertos({
      gestorId,
      servidor,
      enviarCorreo: crearEnvioDeCorreo(getEnv('RESEND_API_KEY'), getEnv('RESEND_REMITENTE')),
    });

    const resultado = await invitarCargo(body, puertos, {
      appStore: getEnv('ENLACE_APP_STORE'),
      googlePlay: getEnv('ENLACE_GOOGLE_PLAY'),
    });

    return resultado.ok
      ? responder(200, { usuarioNuevo: resultado.usuarioNuevo })
      : fallar(resultado.falla);
  } catch (error) {
    // Only what failed, never the pedido.
    console.error('invitar failed', error instanceof Error ? error.message : error);
    return fallar('error_servidor');
  }
});
