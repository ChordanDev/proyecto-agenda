// The rules and the texts of the distritos and the iglesias the admin manages
// (diseno/pantallas/09-gestion-admin.html, 09b-iglesia.html and 09c-distrito.html).

import { normalize } from '@/features/iglesias/dominio/buscarIglesias';

import { enumerar } from './distritosSinPastor';

/** An iglesia of the asociacion, as the tab Iglesias of the admin lists it. */
export type IglesiaDelAdmin = {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  distritoId: string;
  distritoNombre: string;
};

// The same bounds for every text of the structure: a nombre or a direccion
// longer than this is a mistake, and does not fit a row.
export const MAX_LARGO_DE_NOMBRE = 100;
export const MAX_LARGO_DE_DIRECCION = 200;
export const MAX_LARGO_DE_LOCALIDAD = 100;

function plural(cantidad: number, singular: string, pluralDe: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : pluralDe}`;
}

/** The subtitle of the header: "Asociación · 4 distritos · 14 iglesias". */
export function getSubtituloDeAsociacion(
  asociacion: string,
  distritos: number,
  iglesias: number,
): string {
  return [
    asociacion,
    plural(distritos, 'distrito', 'distritos'),
    plural(iglesias, 'iglesia', 'iglesias'),
  ].join(' · ');
}

/** How many iglesias a distrito has, under its nombre. */
export function getTextoDeIglesias(cantidad: number): string {
  return cantidad === 0 ? 'Sin iglesias' : plural(cantidad, 'iglesia', 'iglesias');
}

/** "Pr. Juan Ramírez" under a distrito; null when it has no pastor. */
export function getEtiquetaDePastores(pastores: readonly string[]): string | null {
  return pastores.length === 0 ? null : enumerar(pastores.map((nombre) => `Pr. ${nombre}`));
}

/** By nombre, ignoring accents and case, as the lists of the gestion are read. */
export function ordenarPorNombre<T extends { nombre: string }>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
}

/**
 * The search of the tab Iglesias: a part of the nombre, the localidad or the
 * distrito, ignoring accents and case. An empty text returns every iglesia.
 */
export function buscarIglesiasDelAdmin(
  iglesias: readonly IglesiaDelAdmin[],
  texto: string,
): IglesiaDelAdmin[] {
  const query = normalize(texto);

  return iglesias.filter((iglesia) =>
    [iglesia.nombre, iglesia.localidad, iglesia.distritoNombre].some((campo) =>
      normalize(campo).includes(query),
    ),
  );
}

/**
 * What moving an iglesia to another distrito does, before saving it: its
 * calendario follows the new distrito, and what is its own stays with it.
 */
export function getAvisoDeCambioDeDistrito(anterior: string, nuevo: string): string {
  return (
    `Pasa del ${anterior} al ${nuevo}. Su calendario va a mostrar los eventos del ${nuevo}. ` +
    'Sus eventos, lugares y encargados se quedan con ella.'
  );
}

/** What the admin writes in Nuevo or Editar distrito. */
export type DatosDelDistrito = { nombre: string };

export type ErroresDelDistrito = Partial<Record<keyof DatosDelDistrito, string>>;

/** What the admin writes in Nueva or Editar iglesia. Null distrito: none chosen yet. */
export type DatosDeLaIglesia = {
  nombre: string;
  direccion: string;
  localidad: string;
  distritoId: string | null;
};

export type ValoresDeLaIglesia = {
  nombre: string;
  direccion: string;
  localidad: string;
  distritoId: string;
};

export type ErroresDeLaIglesia = Partial<Record<keyof DatosDeLaIglesia, string>>;

type Validacion<Valores, Errores> =
  { ok: true; valores: Valores } | { ok: false; errores: Errores };

/** The error of a text, or null when it is fine. */
function validarTexto(
  valor: string,
  maximo: number,
  vacio: string,
  largo: 'largo' | 'larga',
): string | null {
  if (valor.length === 0) {
    return vacio;
  }

  if (valor.length > maximo) {
    return `Es demasiado ${largo}: usá hasta ${maximo} letras.`;
  }

  return null;
}

/** The distrito to save, with its nombre trimmed, or what is wrong. */
export function validarDistrito(
  datos: DatosDelDistrito,
): Validacion<DatosDelDistrito, ErroresDelDistrito> {
  const nombre = datos.nombre.trim();
  const error = validarTexto(
    nombre,
    MAX_LARGO_DE_NOMBRE,
    'Escribí el nombre del distrito.',
    'largo',
  );

  return error === null
    ? { ok: true, valores: { nombre } }
    : { ok: false, errores: { nombre: error } };
}

/** The iglesia to save, with its texts trimmed, or what is wrong with each field. */
export function validarIglesia(
  datos: DatosDeLaIglesia,
): Validacion<ValoresDeLaIglesia, ErroresDeLaIglesia> {
  const nombre = datos.nombre.trim();
  const direccion = datos.direccion.trim();
  const localidad = datos.localidad.trim();
  const errores: ErroresDeLaIglesia = {};

  const errorDeNombre = validarTexto(
    nombre,
    MAX_LARGO_DE_NOMBRE,
    'Escribí el nombre de la iglesia.',
    'largo',
  );
  if (errorDeNombre !== null) errores.nombre = errorDeNombre;

  const errorDeDireccion = validarTexto(
    direccion,
    MAX_LARGO_DE_DIRECCION,
    'Escribí la dirección.',
    'larga',
  );
  if (errorDeDireccion !== null) errores.direccion = errorDeDireccion;

  const errorDeLocalidad = validarTexto(
    localidad,
    MAX_LARGO_DE_LOCALIDAD,
    'Escribí la localidad.',
    'larga',
  );
  if (errorDeLocalidad !== null) errores.localidad = errorDeLocalidad;

  if (datos.distritoId === null) errores.distritoId = 'Elegí el distrito.';

  if (Object.keys(errores).length > 0 || datos.distritoId === null) {
    return { ok: false, errores };
  }

  return { ok: true, valores: { nombre, direccion, localidad, distritoId: datos.distritoId } };
}
