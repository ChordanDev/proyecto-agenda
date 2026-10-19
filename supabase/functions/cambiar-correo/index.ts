// The server function that changes the correo of a usuario (issue #154): only
// the admin of the asociacion of one of their cargos. The rules live in
// src/features/gestion/dominio/cambioDeCorreo.ts; this file wires them to the
// database and to the admin API of Auth.
//
// It needs a sesion: the gateway rejects a call without a JWT, and this file
// rejects one whose JWT is not of a usuario (the anon key is a JWT too).
//
// Deploy: `supabase functions deploy cambiar-correo`. SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are set by Supabase.

import { createClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import {
  cambiarCorreo,
  type FallaDeCambioDeCorreo,
} from '../../../src/features/gestion/dominio/cambioDeCorreo.ts';
import { buscarUsuarioPorCorreo, leerCargosEnEstructura } from '../invitar/cargos.ts';

const ESTADOS: Record<FallaDeCambioDeCorreo, number> = {
  sin_sesion: 401,
  pedido_invalido: 400,
  sin_permiso: 403,
  correo_en_uso: 409,
  error_servidor: 500,
};

/** Characters of a body: an id and a correo fit with room to spare. */
const MAX_LARGO_DEL_PEDIDO = 1_000;

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

function fallar(falla: FallaDeCambioDeCorreo): Response {
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

    const resultado = await cambiarCorreo(body, {
      leerCargosDelGestor: () => leerCargosEnEstructura(servidor, gestorId),
      leerCargosDelUsuario: (usuarioId) => leerCargosEnEstructura(servidor, usuarioId),
      buscarUsuario: (correo) => buscarUsuarioPorCorreo(servidor, correo),
      async actualizarCorreo(usuarioId, correo) {
        // Confirmed, like an invitation: the next ingreso sends the code to the
        // new correo, and receiving it proves it.
        const { error } = await servidor.auth.admin.updateUserById(usuarioId, {
          email: correo,
          email_confirm: true,
        });
        if (error) {
          throw new Error(`Could not change the correo: ${error.message}`);
        }
      },
      informarError(causa) {
        console.error('cambiar-correo failed:', causa instanceof Error ? causa.message : causa);
      },
    });

    return resultado.ok ? responder(200, {}) : fallar(resultado.falla);
  } catch (error) {
    // Only what failed, never the pedido.
    console.error('cambiar-correo failed', error instanceof Error ? error.message : error);
    return fallar('error_servidor');
  }
});
