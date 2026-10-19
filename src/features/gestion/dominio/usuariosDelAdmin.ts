// The rules and the texts of the tab Usuarios of the admin: everyone with a
// cargo in their asociacion (diseno/pantallas/09-gestion-admin.html and
// 09d-usuario.html). The cargo of admin never shows here: only the developers
// give or remove it (#13).

import type { FallaDeCambioDeCorreo } from './cambioDeCorreo';
import { nombreDeEncargado, validarEncargado, type DatosDelEncargado } from './encargados';
import {
  leerCorreo,
  MAX_LARGO_DE_FUNCION,
  type FallaDeInvitacion,
  type LugarDeInvitacion,
} from './invitacion';

/** A cargo as the database has it: exactly one of the three levels is set. */
export type FilaDeCargo = {
  cargoId: string;
  usuarioId: string;
  iglesiaId: string | null;
  distritoId: string | null;
  asociacionId: string | null;
  esSecretaria: boolean;
  funcion: string | null;
};

/** The cargos the admin gives and removes. */
export type TipoDeCargo = 'encargado' | 'secretaria' | 'pastor';

export type CargoDelUsuario = {
  cargoId: string;
  tipo: TipoDeCargo;
  funcion: string | null;
  lugar: { nivel: 'iglesia' | 'distrito'; id: string; nombre: string };
};

export type UsuarioDelAdmin = {
  usuarioId: string;
  /** What the gestion shows: the nombre of the perfil, or a stand-in without one. */
  nombre: string;
  /** Null when they have no perfil yet; editing starts from it, never from the stand-in. */
  nombreDelPerfil: string | null;
  /** Null when it cannot be read. */
  correo: string | null;
  /** Pastor first, then secretaria, then encargado; each group by the nombre of its place. */
  cargos: CargoDelUsuario[];
};

const ORDEN_DE_TIPO: Record<TipoDeCargo, number> = { pastor: 0, secretaria: 1, encargado: 2 };

const ETIQUETA_DE_TIPO: Record<TipoDeCargo, string> = {
  pastor: 'Pastor',
  secretaria: 'Secretaria de iglesia',
  encargado: 'Encargado',
};

/** The options of "Cargo" in Agregar usuario. Admin is never one. */
export const OPCIONES_DE_CARGO: readonly { valor: TipoDeCargo; label: string }[] = [
  { valor: 'encargado', label: 'Encargado de iglesia' },
  { valor: 'secretaria', label: 'Secretaria de iglesia' },
  { valor: 'pastor', label: 'Pastor de distrito' },
];

function compararNombres(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

function aCargoDelUsuario(
  fila: FilaDeCargo,
  iglesias: ReadonlyMap<string, string>,
  distritos: ReadonlyMap<string, string>,
): CargoDelUsuario | null {
  if (fila.iglesiaId !== null) {
    const nombre = iglesias.get(fila.iglesiaId);
    return nombre === undefined
      ? null
      : {
          cargoId: fila.cargoId,
          tipo: fila.esSecretaria ? 'secretaria' : 'encargado',
          funcion: fila.funcion,
          lugar: { nivel: 'iglesia', id: fila.iglesiaId, nombre },
        };
  }
  if (fila.distritoId !== null) {
    const nombre = distritos.get(fila.distritoId);
    return nombre === undefined
      ? null
      : {
          cargoId: fila.cargoId,
          tipo: 'pastor',
          funcion: fila.funcion,
          lugar: { nivel: 'distrito', id: fila.distritoId, nombre },
        };
  }
  // A cargo on an asociacion: an admin, which this tab never shows.
  return null;
}

/**
 * Every usuario with a cargo on an iglesia or a distrito of the asociacion,
 * ordered by nombre. A cargo whose iglesia or distrito is not among the given
 * ones is left out, and so is a usuario left without cargos.
 */
export function agruparUsuarios({
  cargos,
  perfiles,
  correos,
  iglesias,
  distritos,
}: {
  cargos: readonly FilaDeCargo[];
  /** The nombre of each usuario with a perfil. */
  perfiles: ReadonlyMap<string, string>;
  correos: ReadonlyMap<string, string>;
  /** The nombre of each iglesia of the asociacion. */
  iglesias: ReadonlyMap<string, string>;
  /** The nombre of each distrito of the asociacion. */
  distritos: ReadonlyMap<string, string>;
}): UsuarioDelAdmin[] {
  const cargosDe = new Map<string, CargoDelUsuario[]>();

  for (const fila of cargos) {
    const cargo = aCargoDelUsuario(fila, iglesias, distritos);
    if (cargo !== null) {
      cargosDe.set(fila.usuarioId, [...(cargosDe.get(fila.usuarioId) ?? []), cargo]);
    }
  }

  return [...cargosDe.entries()]
    .map(([usuarioId, delUsuario]): UsuarioDelAdmin => {
      const nombreDelPerfil = perfiles.get(usuarioId) ?? null;
      const correo = correos.get(usuarioId) ?? null;
      return {
        usuarioId,
        nombre: nombreDeEncargado(nombreDelPerfil, correo),
        nombreDelPerfil,
        correo,
        cargos: delUsuario.sort(
          (a, b) =>
            ORDEN_DE_TIPO[a.tipo] - ORDEN_DE_TIPO[b.tipo] ||
            compararNombres(a.lugar.nombre, b.lugar.nombre),
        ),
      };
    })
    .sort((a, b) => compararNombres(a.nombre, b.nombre));
}

/** "Encargado · Anciano" over "El Trapiche", in the list of cargos of Usuario. */
export function describirCargo(cargo: CargoDelUsuario): { cargo: string; donde: string } {
  const etiqueta = ETIQUETA_DE_TIPO[cargo.tipo];
  return {
    cargo: cargo.funcion === null ? etiqueta : `${etiqueta} · ${cargo.funcion}`,
    donde: cargo.lugar.nombre,
  };
}

/** "Pastor · Distrito Centro y 1 cargo más", under a nombre in the tab Usuarios. */
export function getResumenDeCargos(cargos: readonly CargoDelUsuario[]): string {
  const [primero, ...resto] = cargos;
  if (primero === undefined) {
    return '';
  }
  const resumen = `${ETIQUETA_DE_TIPO[primero.tipo]} · ${primero.lugar.nombre}`;
  if (resto.length === 0) {
    return resumen;
  }
  return `${resumen} y ${resto.length} ${resto.length === 1 ? 'cargo más' : 'cargos más'}`;
}

function normalize(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/**
 * The search of the tab Usuarios: a part of the nombre or the correo, ignoring
 * accents and case. An empty text returns every usuario.
 */
export function buscarUsuarios(
  usuarios: readonly UsuarioDelAdmin[],
  texto: string,
): UsuarioDelAdmin[] {
  const query = normalize(texto);

  return usuarios.filter((usuario) =>
    [usuario.nombre, usuario.correo ?? ''].some((campo) => normalize(campo).includes(query)),
  );
}

export type ErroresDeAlta = Partial<Record<keyof DatosDelEncargado | 'cargo' | 'lugar', string>>;

export type Alta = {
  nombre: string;
  correo: string;
  funcion: string | null;
  lugar: LugarDeInvitacion;
};

/**
 * What Agregar usuario sends to `invitar`: the nombre, the correo and the
 * funcion as Agregar encargado checks them, and the one cargo it gives, on the
 * iglesia or the distrito chosen. The place is only asked once the cargo is
 * chosen.
 */
export function validarAlta(
  datos: DatosDelEncargado,
  tipo: TipoDeCargo | null,
  lugarId: string | null,
): { ok: true; invitacion: Alta } | { ok: false; errores: ErroresDeAlta } {
  const validado = validarEncargado(datos, 'agregar');
  const errores: ErroresDeAlta = validado.ok ? {} : { ...validado.errores };

  if (tipo === null) {
    errores.cargo = 'Elegí el cargo.';
  } else if (lugarId === null) {
    errores.lugar = tipo === 'pastor' ? 'Elegí el distrito.' : 'Elegí la iglesia.';
  }

  if (!validado.ok || tipo === null || lugarId === null) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    invitacion: {
      ...validado.valores,
      lugar:
        tipo === 'pastor'
          ? { nivel: 'distrito', distritoId: lugarId }
          : { nivel: 'iglesia', iglesiaId: lugarId, esSecretaria: tipo === 'secretaria' },
    },
  };
}

/** The funcion of a cargo, trimmed; an empty one is no funcion. */
export function validarFuncion(
  texto: string,
): { ok: true; funcion: string | null } | { ok: false; error: string } {
  const funcion = texto.trim();
  if (funcion.length > MAX_LARGO_DE_FUNCION) {
    return { ok: false, error: `La función puede tener hasta ${MAX_LARGO_DE_FUNCION} letras.` };
  }
  return { ok: true, funcion: funcion.length > 0 ? funcion : null };
}

/** The correo nuevo, trimmed and in lower case, or what is wrong with it. */
export function validarCorreoNuevo(
  texto: string,
  actual: string | null,
): { ok: true; correo: string } | { ok: false; error: string } {
  const correo = leerCorreo(texto);
  if (correo === null) {
    return { ok: false, error: 'Escribí un correo válido, por ejemplo nombre@gmail.com.' };
  }
  if (correo === actual?.toLowerCase()) {
    return { ok: false, error: 'Es el correo que ya tiene.' };
  }
  return { ok: true, correo };
}

/** What changing the correo does: the old one stops working to sign in. */
export function getAvisoDeCambioDeCorreo(nombre: string): string {
  const primerNombre = nombre.trim().split(/\s+/)[0];
  return `El correo actual deja de servir para entrar. ${primerNombre} va a entrar con el código que le llegue al correo nuevo.`;
}

/** The message of a correo that could not change. */
export function getMensajeDeCambioDeCorreo(falla: FallaDeCambioDeCorreo): {
  titulo: string;
  texto: string;
} {
  const titulo = 'No se pudo cambiar el correo.';
  switch (falla) {
    case 'correo_en_uso':
      return { titulo, texto: 'Ese correo ya es de otro usuario. Escribí otro.' };
    case 'sin_permiso':
      return { titulo, texto: 'Esta persona tiene un cargo que no administrás.' };
    default:
      return { titulo, texto: 'Revisá la conexión y probá de nuevo.' };
  }
}

/** The message of an alta that failed. What was written stays in the form. */
export function getMensajeDeAlta(falla: FallaDeInvitacion): { titulo: string; texto: string } {
  switch (falla) {
    case 'correo_no_enviado':
      return {
        titulo: 'No se pudo enviar el correo de bienvenida.',
        texto: 'El cargo ya quedó dado. Probá de nuevo en un rato para reenviarlo.',
      };
    case 'sin_permiso':
      return { titulo: 'No se pudo agregar.', texto: 'No podés dar ese cargo.' };
    default:
      return {
        titulo: 'No se pudo agregar.',
        texto: 'Lo que escribiste sigue acá. Probá de nuevo en un rato.',
      };
  }
}

/** The message of a nombre or a funcion that could not be saved. What was written stays. */
export function getMensajeDeEdicion(falla: 'nombre_compartido' | 'error_servidor'): {
  titulo: string;
  texto: string;
} {
  return falla === 'nombre_compartido'
    ? {
        titulo: 'No se pudo cambiar el nombre.',
        texto:
          'Esta persona también tiene un cargo que no administrás, así que su nombre no se puede cambiar desde acá.',
      }
    : {
        titulo: 'No se pudieron guardar los cambios.',
        texto: 'Lo que escribiste sigue acá. Probá de nuevo en un rato.',
      };
}
