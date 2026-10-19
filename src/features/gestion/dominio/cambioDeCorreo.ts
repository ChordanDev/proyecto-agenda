// Changing the correo of a usuario: only an admin, and only of a usuario whose
// every cargo they manage. Whoever else manages cargos removes the cargo and
// invites the right correo instead. The database comes in as ports; the server
// function (supabase/functions/cambiar-correo) wires the real ones.
//
// Runs in Deno too: imports stay relative and name the file with `.ts`.

import {
  puedeCambiarCorreo,
  type CargoEnEstructura,
} from '../../sesion/dominio/puedeGestionarCargo.ts';
import { esUuid, leerCorreo } from './invitacion.ts';

/**
 * Why a correo was not changed.
 * - `sin_sesion`: the call has no usuario with a sesion.
 * - `pedido_invalido`: the body is not a pedido of the app.
 * - `sin_permiso`: the gestor is not the admin of a cargo of the usuario.
 * - `correo_en_uso`: another usuario already has that correo.
 * - `error_servidor`: anything else failed.
 */
export type FallaDeCambioDeCorreo =
  'sin_sesion' | 'pedido_invalido' | 'sin_permiso' | 'correo_en_uso' | 'error_servidor';

export type PuertosDeCambioDeCorreo = {
  leerCargosDelGestor(): Promise<CargoEnEstructura[]>;
  leerCargosDelUsuario(usuarioId: string): Promise<CargoEnEstructura[]>;
  buscarUsuario(correo: string): Promise<string | null>;
  actualizarCorreo(usuarioId: string, correo: string): Promise<void>;
  /** Only the cause, never the pedido. */
  informarError(causa: unknown): void;
};

export type ResultadoDeCambioDeCorreo = { ok: true } | { ok: false; falla: FallaDeCambioDeCorreo };

export async function cambiarCorreo(
  body: unknown,
  puertos: PuertosDeCambioDeCorreo,
): Promise<ResultadoDeCambioDeCorreo> {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, falla: 'pedido_invalido' };
  }
  const { usuarioId, correo: valor } = body as Record<string, unknown>;
  const correo = leerCorreo(valor);
  if (!esUuid(usuarioId) || correo === null) {
    return { ok: false, falla: 'pedido_invalido' };
  }

  try {
    const [cargosDelGestor, cargosDelUsuario] = await Promise.all([
      puertos.leerCargosDelGestor(),
      puertos.leerCargosDelUsuario(usuarioId),
    ]);
    // Every cargo, not one: whoever controls the correo signs in as the usuario
    // and holds all of their cargos, so an admin cannot take a usuario who also
    // holds a cargo they do not manage (another admin, another asociacion).
    if (
      cargosDelUsuario.length === 0 ||
      !cargosDelUsuario.every((cargo) => puedeCambiarCorreo(cargosDelGestor, cargo))
    ) {
      return { ok: false, falla: 'sin_permiso' };
    }

    const duenioDelCorreo = await puertos.buscarUsuario(correo);
    if (duenioDelCorreo === usuarioId) {
      return { ok: true };
    }
    if (duenioDelCorreo !== null) {
      return { ok: false, falla: 'correo_en_uso' };
    }

    await puertos.actualizarCorreo(usuarioId, correo);
    return { ok: true };
  } catch (error) {
    puertos.informarError(error);
    return { ok: false, falla: 'error_servidor' };
  }
}
