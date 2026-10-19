// Inviting someone to a cargo, from the pedido of the app to the correo de
// bienvenida, without knowing the database or Resend: both come in as ports.
// The server function (supabase/functions/invitar) wires the real ones; the
// tests use fakes.
//
// This file and everything it imports run in Deno too, in the Edge Runtime:
// imports stay relative, never use the `@/` alias and name the file with its
// `.ts` extension, which the Edge Runtime needs.

import {
  puedeGestionarCargo,
  type CargoEnEstructura,
} from '../../sesion/dominio/puedeGestionarCargo.ts';

/** Characters a nombre can have. */
export const MAX_LARGO_DE_NOMBRE = 100;

/** Characters a funcion can have. */
export const MAX_LARGO_DE_FUNCION = 60;

/** Characters a correo can have (RFC 5321). */
const MAX_LARGO_DE_CORREO = 254;

/**
 * Why an invitation failed.
 * - `sin_sesion`: the call has no usuario with a sesion.
 * - `pedido_invalido`: the body is not a pedido of the app.
 * - `sin_permiso`: no cargo of the gestor manages the cargo it gives, or the
 *   iglesia or distrito does not exist (the same answer, so it reveals nothing).
 * - `correo_no_enviado`: the cargo was saved, but the correo de bienvenida
 *   could not be sent. Inviting again saves nothing new and sends it again.
 * - `error_servidor`: anything else failed (the database).
 */
export type FallaDeInvitacion =
  'sin_sesion' | 'pedido_invalido' | 'sin_permiso' | 'correo_no_enviado' | 'error_servidor';

/** Where the cargo is given: an iglesia (as encargado or secretaria de iglesia) or a distrito (as pastor). */
export type LugarDeInvitacion =
  | { nivel: 'iglesia'; iglesiaId: string; esSecretaria: boolean }
  | { nivel: 'distrito'; distritoId: string };

export type PedidoDeInvitacion = {
  nombre: string;
  /** Trimmed and in lower case. */
  correo: string;
  /** Null when there is none. */
  funcion: string | null;
  lugar: LugarDeInvitacion;
};

/** The iglesia or distrito of an invitation, as it is in the structure right now. */
export type LugarEnEstructura = { cargo: CargoEnEstructura; nombre: string };

/** The links to the app in the stores, for the correo de bienvenida. */
export type EnlacesDeLaApp = { appStore: string; googlePlay: string };

export type CorreoDeBienvenida = { asunto: string; texto: string };

export type PuertosDeInvitacion = {
  /** The cargos of the usuario who invites, read from the database. */
  leerCargosDelGestor(): Promise<CargoEnEstructura[]>;
  /**
   * The iglesia or distrito; null when it does not exist. The mark of
   * secretaria of the cargo it returns is ignored: the pedido decides it.
   */
  leerLugar(lugar: LugarDeInvitacion): Promise<LugarEnEstructura | null>;
  /** The id of the usuario with this correo, or null. */
  buscarUsuario(correo: string): Promise<string | null>;
  /** Creates the usuario of this correo and returns its id. */
  crearUsuario(correo: string): Promise<string>;
  /** The cargo the usuario already holds on this iglesia or distrito, or null. */
  leerCargoExistente(
    usuarioId: string,
    lugar: LugarDeInvitacion,
  ): Promise<{ esSecretaria: boolean } | null>;
  /**
   * Saves the cargo, never duplicating it, and creates the perfil when the
   * usuario has none. A perfil that exists keeps its nombre.
   */
  guardarCargo(datos: {
    usuarioId: string;
    nombre: string;
    funcion: string | null;
    lugar: LugarDeInvitacion;
  }): Promise<void>;
  enviarCorreo(correo: CorreoDeBienvenida & { para: string }): Promise<void>;
  /** Only the cause, never the pedido. */
  informarError(causa: unknown): void;
};

export type ResultadoDeInvitacion =
  { ok: true; usuarioNuevo: boolean } | { ok: false; falla: FallaDeInvitacion };

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function leerTexto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  return texto.length > 0 && texto.length <= maximo ? texto : null;
}

/** A correo, trimmed and in lower case; null when it does not look like one. */
/** Whether a value is a UUID, as the ids of the database are. */
export function esUuid(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor)
  );
}

export function leerCorreo(valor: unknown): string | null {
  const correo = leerTexto(valor, MAX_LARGO_DE_CORREO)?.toLowerCase() ?? null;
  return correo !== null && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) ? correo : null;
}

/** The pedido of the app, or null when the body is not one. */
export function leerPedidoDeInvitacion(body: unknown): PedidoDeInvitacion | null {
  if (!esObjeto(body)) return null;

  const nombre = leerTexto(body.nombre, MAX_LARGO_DE_NOMBRE);
  const correo = leerCorreo(body.correo);
  if (nombre === null || correo === null) return null;

  let funcion: string | null = null;
  if (body.funcion !== undefined && body.funcion !== null) {
    if (typeof body.funcion !== 'string' || body.funcion.trim().length > MAX_LARGO_DE_FUNCION) {
      return null;
    }
    funcion = body.funcion.trim() || null;
  }

  const esSecretaria = body.esSecretaria ?? false;
  if (typeof esSecretaria !== 'boolean') return null;

  const iglesiaId = body.iglesiaId ?? null;
  const distritoId = body.distritoId ?? null;

  if (esUuid(iglesiaId) && distritoId === null) {
    return { nombre, correo, funcion, lugar: { nivel: 'iglesia', iglesiaId, esSecretaria } };
  }
  // A secretaria de iglesia is a cargo on an iglesia, never on a distrito.
  if (esUuid(distritoId) && iglesiaId === null && !esSecretaria) {
    return { nombre, correo, funcion, lugar: { nivel: 'distrito', distritoId } };
  }
  return null;
}

/**
 * The correo de bienvenida: it names the cargo and the iglesia or distrito,
 * and says how to enter. The first ingreso is the usual one, a code by correo:
 * there is no password and no link of invitation.
 */
export function getCorreoDeBienvenida({
  lugar,
  nombreDelLugar,
  enlaces,
}: {
  lugar: LugarDeInvitacion;
  nombreDelLugar: string;
  enlaces: EnlacesDeLaApp;
}): CorreoDeBienvenida {
  const cargo =
    lugar.nivel === 'distrito'
      ? `pastor del distrito ${nombreDelLugar}`
      : `${lugar.esSecretaria ? 'secretaria' : 'encargado'} de la iglesia ${nombreDelLugar}`;

  return {
    asunto: 'Te agregaron a la Agenda de iglesia',
    texto: [
      `Te agregaron como ${cargo}. Descargá la app e ingresá con este correo.`,
      '',
      `App Store: ${enlaces.appStore}`,
      `Google Play: ${enlaces.googlePlay}`,
    ].join('\n'),
  };
}

/** The cargo the invitation gives: the place as it is, with the mark of secretaria the pedido asks for. */
function conMarca(cargo: CargoEnEstructura, lugar: LugarDeInvitacion): CargoEnEstructura {
  return cargo.nivel === 'iglesia' && lugar.nivel === 'iglesia'
    ? { ...cargo, esSecretaria: lugar.esSecretaria }
    : cargo;
}

/**
 * Gives a cargo to the usuario of a correo, creating the usuario when the
 * correo has no account yet, and sends them the correo de bienvenida.
 *
 * Who may give it is decided with puedeGestionarCargo and the cargos of the
 * gestor as the database has them now. When the usuario already holds a cargo
 * on that iglesia, the gestor must also manage that one: a secretaria cannot
 * turn another secretaria into an encargado by inviting her again.
 */
export async function invitarCargo(
  body: unknown,
  puertos: PuertosDeInvitacion,
  enlaces: EnlacesDeLaApp,
): Promise<ResultadoDeInvitacion> {
  const pedido = leerPedidoDeInvitacion(body);
  if (pedido === null) {
    return { ok: false, falla: 'pedido_invalido' };
  }

  let lugar: LugarEnEstructura;
  let usuarioNuevo = false;

  try {
    const [cargosDelGestor, encontrado] = await Promise.all([
      puertos.leerCargosDelGestor(),
      puertos.leerLugar(pedido.lugar),
    ]);
    if (
      encontrado === null ||
      !puedeGestionarCargo(cargosDelGestor, conMarca(encontrado.cargo, pedido.lugar))
    ) {
      return { ok: false, falla: 'sin_permiso' };
    }
    lugar = encontrado;

    let usuarioId = await puertos.buscarUsuario(pedido.correo);

    if (usuarioId === null) {
      usuarioId = await puertos.crearUsuario(pedido.correo);
      usuarioNuevo = true;
    } else {
      const existente = await puertos.leerCargoExistente(usuarioId, pedido.lugar);
      if (
        existente !== null &&
        lugar.cargo.nivel === 'iglesia' &&
        !puedeGestionarCargo(cargosDelGestor, {
          ...lugar.cargo,
          esSecretaria: existente.esSecretaria,
        })
      ) {
        return { ok: false, falla: 'sin_permiso' };
      }
    }

    await puertos.guardarCargo({
      usuarioId,
      nombre: pedido.nombre,
      funcion: pedido.funcion,
      lugar: pedido.lugar,
    });
  } catch (error) {
    puertos.informarError(error);
    return { ok: false, falla: 'error_servidor' };
  }

  try {
    await puertos.enviarCorreo({
      para: pedido.correo,
      ...getCorreoDeBienvenida({ lugar: pedido.lugar, nombreDelLugar: lugar.nombre, enlaces }),
    });
  } catch (error) {
    puertos.informarError(error);
    return { ok: false, falla: 'correo_no_enviado' };
  }

  return { ok: true, usuarioNuevo };
}
