// The rules and the texts of the gestion of the encargados of an iglesia, as
// the secretaria de iglesia sees them (diseno/pantallas/08b-gestion-secretaria.html
// and 08c-encargado.html).

import { leerCorreo, MAX_LARGO_DE_FUNCION, MAX_LARGO_DE_NOMBRE } from './invitacion';

/** Whoever holds a cargo of encargado on an iglesia, as the gestion lists them. */
export type Encargado = {
  cargoId: string;
  usuarioId: string;
  /** What the gestion shows: the nombre of the perfil, or a stand-in without one. */
  nombre: string;
  /**
   * The nombre of their perfil; null when they have none yet. Editing starts
   * from it, never from the stand-in: saving would store it as their nombre.
   */
  nombreDelPerfil: string | null;
  /** Null when it cannot be read. */
  correo: string | null;
  funcion: string | null;
  esSecretaria: boolean;
};

/** Adding an encargado or editing one. */
export type ModoDelFormulario = 'agregar' | 'editar';

/** What can fail in the gestion of an encargado, for its message. */
export type FallaDeGestion =
  | 'sin_sesion'
  | 'pedido_invalido'
  | 'sin_permiso'
  | 'correo_no_enviado'
  /** The nombre is the perfil of someone with a cargo the gestor does not manage. */
  | 'nombre_compartido'
  | 'error_servidor';

const SIN_NOMBRE = 'Sin nombre';

/** The initials of the avatar: the first letter of the first two words. */
export function getIniciales(nombre: string): string {
  return nombre
    .trim()
    .split(/\s+/)
    .filter((palabra) => palabra.length > 0)
    .slice(0, 2)
    .map((palabra) => palabra.charAt(0).toUpperCase())
    .join('');
}

/**
 * The nombre the gestion shows: the one of the perfil, or the correo while the
 * usuario has no perfil (one loaded by the developers before the perfiles).
 */
export function nombreDeEncargado(perfil: string | null, correo: string | null): string {
  return perfil ?? correo ?? SIN_NOMBRE;
}

/** The usuario signed in first, then the secretarias, then the rest; each group by nombre. */
export function ordenarEncargados(
  encargados: readonly Encargado[],
  usuarioId: string | null,
): Encargado[] {
  const grupo = (encargado: Encargado) =>
    encargado.usuarioId === usuarioId ? 0 : encargado.esSecretaria ? 1 : 2;

  return [...encargados].sort(
    (a, b) =>
      grupo(a) - grupo(b) || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
  );
}

/**
 * Whether the secretaria can open an encargado to edit it or remove its cargo:
 * never a secretaria de iglesia, herself included. Only the pastor or the admin
 * names or removes them (puedeGestionarCargo).
 */
export function puedeEditarEncargado(encargado: Encargado): boolean {
  return !encargado.esSecretaria;
}

/** "Iglesia Central · 4 encargados", under the title of the gestion. */
export function getSubtituloDeIglesia(iglesia: string, cantidad: number): string {
  return `${iglesia} · ${cantidad} ${cantidad === 1 ? 'encargado' : 'encargados'}`;
}

export type DatosDelEncargado = { nombre: string; correo: string; funcion: string };

export type ValoresDelEncargado = { nombre: string; correo: string; funcion: string | null };

export type ErroresDelEncargado = Partial<Record<keyof DatosDelEncargado, string>>;

/**
 * What the form sends, trimmed and with the correo in lower case, or the
 * message of each field that is wrong. The correo is only checked when adding:
 * editing never changes it.
 */
export function validarEncargado(
  datos: DatosDelEncargado,
  modo: ModoDelFormulario,
): { ok: true; valores: ValoresDelEncargado } | { ok: false; errores: ErroresDelEncargado } {
  const errores: ErroresDelEncargado = {};
  const nombre = datos.nombre.trim();
  const funcion = datos.funcion.trim();
  let correo = datos.correo.trim();

  if (nombre.length === 0) {
    errores.nombre = 'Escribí el nombre.';
  } else if (nombre.length > MAX_LARGO_DE_NOMBRE) {
    errores.nombre = `El nombre puede tener hasta ${MAX_LARGO_DE_NOMBRE} letras.`;
  }

  if (modo === 'agregar') {
    const leido = leerCorreo(correo);
    if (leido === null) {
      errores.correo = 'Escribí un correo válido, por ejemplo nombre@gmail.com.';
    } else {
      correo = leido;
    }
  }

  if (funcion.length > MAX_LARGO_DE_FUNCION) {
    errores.funcion = `La función puede tener hasta ${MAX_LARGO_DE_FUNCION} letras.`;
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  return { ok: true, valores: { nombre, correo, funcion: funcion.length > 0 ? funcion : null } };
}

/**
 * What the form starts with: empty to add one; to edit one, their data, with
 * the nombre of their perfil (empty when they have none).
 */
export function getDatosIniciales(encargado: Encargado | null): DatosDelEncargado {
  return {
    nombre: encargado?.nombreDelPerfil ?? '',
    correo: encargado?.correo ?? '',
    funcion: encargado?.funcion ?? '',
  };
}

/**
 * What the form keeps after a failed write: everything written, except a
 * nombre that could not change (`nombre_compartido`), which goes back to the
 * one it had. Otherwise "Probar de nuevo" would fail the same way again.
 */
export function getDatosTrasFalla(
  escritos: DatosDelEncargado,
  iniciales: DatosDelEncargado,
  falla: FallaDeGestion,
): DatosDelEncargado {
  return falla === 'nombre_compartido' ? { ...escritos, nombre: iniciales.nombre } : escritos;
}

/** The title, the main button and the notice without connection of the form. */
export function getTextosDelFormulario(
  modo: ModoDelFormulario,
  conError: boolean,
): { titulo: string; boton: string; sinConexion: string } {
  const agregar = modo === 'agregar';

  return {
    titulo: agregar ? 'Agregar encargado' : 'Editar encargado',
    boton: conError ? 'Probar de nuevo' : agregar ? 'Agregar encargado' : 'Guardar cambios',
    sinConexion: agregar
      ? 'Para agregar un encargado hace falta conexión.'
      : 'Para guardar cambios hace falta conexión.',
  };
}

/** The confirmation of "Quitar cargo". */
export function getTextosDeQuitar(
  nombre: string,
  iglesia: string,
): { titulo: string; texto: string } {
  return {
    titulo: `¿Quitarle el cargo a ${nombre}?`,
    texto: `Deja de poder cargar eventos de ${iglesia} desde ahora. Su cuenta no se borra.`,
  };
}

const TITULOS_DE_ERROR: Record<ModoDelFormulario | 'quitar', string> = {
  agregar: 'No se pudo agregar.',
  editar: 'No se pudieron guardar los cambios.',
  quitar: 'No se pudo quitar el cargo.',
};

/**
 * The message of a failed write: its title, in bold, and what to do. What was
 * written stays in the form.
 */
export function getMensajeDeError(
  accion: ModoDelFormulario | 'quitar',
  falla: FallaDeGestion,
): { titulo: string; texto: string } {
  switch (falla) {
    case 'correo_no_enviado':
      return {
        titulo: 'No se pudo enviar el correo de bienvenida.',
        texto: 'El encargado ya quedó agregado. Probá de nuevo en un rato para reenviarlo.',
      };
    case 'sin_permiso':
      if (accion === 'agregar') {
        return {
          titulo: TITULOS_DE_ERROR.agregar,
          texto: 'Esa persona ya tiene en esta iglesia un cargo que no podés cambiar.',
        };
      }
      break;
    case 'nombre_compartido':
      return {
        titulo: 'No se pudo cambiar el nombre.',
        texto:
          'Esta persona también tiene un cargo en otro lugar, así que su nombre no se puede cambiar desde acá. Volvimos a poner el nombre que tenía: tocá "Probar de nuevo" para guardar la función.',
      };
  }

  return {
    titulo: TITULOS_DE_ERROR[accion],
    texto:
      accion === 'quitar'
        ? 'Probá de nuevo en un rato.'
        : 'Lo que escribiste sigue acá. Probá de nuevo en un rato.',
  };
}
