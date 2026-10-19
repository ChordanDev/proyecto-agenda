import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/shared/supabase';

import type { RespuestaDeConsulta } from '../dominio/consulta';
import type { PedidoDeConsulta } from '../dominio/conversacion';
import { leerFalla, type Falla } from '../dominio/fallas';

/** The server function of the chat de consulta (supabase/functions/chat-consulta). */
const FUNCION = 'chat-consulta';

/**
 * How long a consulta can take. The asistente may search up to three times
 * before answering; past this, it counts as down.
 */
const ESPERA_MAXIMA_MS = 60_000;

export type ResultadoDeEnvio =
  { ok: true; respuesta: RespuestaDeConsulta } | { ok: false; falla: Falla };

function isRespuesta(value: unknown): value is RespuestaDeConsulta {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { tipo, texto, eventos, aviso } = value as Record<string, unknown>;
  return (
    (tipo === 'respuesta' || tipo === 'repregunta') &&
    typeof texto === 'string' &&
    Array.isArray(eventos) &&
    (aviso === null || typeof aviso === 'string')
  );
}

async function leerBody(response: unknown): Promise<unknown> {
  try {
    return await (response as Response).json();
  } catch {
    return null;
  }
}

/**
 * Sends a consulta to the asistente, with the identity of the usuario signed
 * in. It never throws: whatever fails comes back as its falla.
 */
export async function enviarConsulta(pedido: PedidoDeConsulta): Promise<ResultadoDeEnvio> {
  const controller = new AbortController();
  let vencida = false;
  const espera = setTimeout(() => {
    vencida = true;
    controller.abort();
  }, ESPERA_MAXIMA_MS);

  try {
    const { data, error } = await supabase.functions.invoke(FUNCION, {
      body: pedido,
      signal: controller.signal,
    });

    if (error instanceof FunctionsHttpError) {
      return { ok: false, falla: leerFalla(await leerBody(error.context)) };
    }
    if (error instanceof FunctionsFetchError) {
      // An answer that takes too long is the asistente, not the conexion.
      return { ok: false, falla: vencida ? 'proveedor_caido' : 'sin_conexion' };
    }
    if (error) {
      return { ok: false, falla: 'error_servidor' };
    }

    const respuesta = (data as { respuesta?: unknown } | null)?.respuesta;
    return isRespuesta(respuesta)
      ? { ok: true, respuesta }
      : { ok: false, falla: 'error_servidor' };
  } catch {
    return { ok: false, falla: 'error_servidor' };
  } finally {
    clearTimeout(espera);
  }
}
