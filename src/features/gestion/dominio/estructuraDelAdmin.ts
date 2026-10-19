// The rules and the texts of the distritos and the iglesias the admin manages
// (diseno/pantallas/09-gestion-admin.html, 09b-iglesia.html and 09c-distrito.html).

import { normalize } from '@/features/iglesias/dominio/buscarIglesias';
import type { Punto } from '@/features/iglesias/dominio/distancia';

import { enumerar } from './distritosSinPastor';

/** An iglesia of the asociacion, as the tab Iglesias of the admin lists it. */
export type IglesiaDelAdmin = {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  /** Null: its localidad could not be split, and it waits to be fixed by hand. */
  provincia: string | null;
  /** Where the marker of the map is; null until it is placed. */
  coordenadas: Punto | null;
  distritoId: string;
  distritoNombre: string;
  /** Encargados and secretarias: they lose the cargo if it is given de baja. */
  cantidadDeEncargados: number;
};

// The same bounds for every text of the structure: a nombre or a direccion
// longer than this is a mistake, and does not fit a row.
export const MAX_LARGO_DE_NOMBRE = 100;
export const MAX_LARGO_DE_DIRECCION = 200;
export const MAX_LARGO_DE_CIUDAD = 100;
export const MAX_LARGO_DE_PROVINCIA = 100;

// Every iglesia of the asociacion is in this country: it helps the map find
// the direccion.
const PAIS = 'Argentina';

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
 * The search of the tab Iglesias: a part of the nombre, the ciudad, the
 * provincia or the distrito, ignoring accents and case. An empty text returns every iglesia.
 */
export function buscarIglesiasDelAdmin(
  iglesias: readonly IglesiaDelAdmin[],
  texto: string,
): IglesiaDelAdmin[] {
  const query = normalize(texto);

  return iglesias.filter((iglesia) =>
    [iglesia.nombre, iglesia.ciudad, iglesia.provincia ?? '', iglesia.distritoNombre].some(
      (campo) => normalize(campo).includes(query),
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

/**
 * What the admin writes in Nueva or Editar iglesia. Null distrito: none chosen
 * yet. Null coordenadas: the marker is not on the map yet.
 */
export type DatosDeLaIglesia = {
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  distritoId: string | null;
  coordenadas: Punto | null;
};

export type ValoresDeLaIglesia = {
  nombre: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  distritoId: string;
  coordenadas: Punto;
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
  const ciudad = datos.ciudad.trim();
  const provincia = datos.provincia.trim();
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

  const errorDeCiudad = validarTexto(ciudad, MAX_LARGO_DE_CIUDAD, 'Escribí la ciudad.', 'larga');
  if (errorDeCiudad !== null) errores.ciudad = errorDeCiudad;

  const errorDeProvincia = validarTexto(
    provincia,
    MAX_LARGO_DE_PROVINCIA,
    'Escribí la provincia.',
    'larga',
  );
  if (errorDeProvincia !== null) errores.provincia = errorDeProvincia;

  if (datos.distritoId === null) errores.distritoId = 'Elegí el distrito.';

  if (datos.coordenadas === null) {
    errores.coordenadas = 'Marcá en el mapa dónde está la iglesia.';
  }

  if (Object.keys(errores).length > 0 || datos.distritoId === null || datos.coordenadas === null) {
    return { ok: false, errores };
  }

  return {
    ok: true,
    valores: {
      nombre,
      direccion,
      ciudad,
      provincia,
      distritoId: datos.distritoId,
      coordenadas: datos.coordenadas,
    },
  };
}

/**
 * What the map looks for to place the marker at the estimated location: the
 * direccion, the ciudad and the provincia. Null while one of them is missing.
 */
export function getDireccionParaElMapa(
  datos: Pick<DatosDeLaIglesia, 'direccion' | 'ciudad' | 'provincia'>,
): string | null {
  const partes = [datos.direccion, datos.ciudad, datos.provincia].map((parte) => parte.trim());

  return partes.some((parte) => parte.length === 0) ? null : [...partes, PAIS].join(', ');
}

/** What the marker of the map stands for: the texts it was placed for, compared loosely. */
export type ClaveDeUbicacion = { direccion: string; ciudad: string; provincia: string };

type TextosDeUbicacion = Pick<DatosDeLaIglesia, 'direccion' | 'ciudad' | 'provincia'>;

/** Ignoring case, accents and repeated spaces: retyping a word does not move the marker. */
export function getClaveDeUbicacion(textos: TextosDeUbicacion): ClaveDeUbicacion {
  const clave = (texto: string) => normalize(texto).replace(/\s+/g, ' ');

  return {
    direccion: clave(textos.direccion),
    ciudad: clave(textos.ciudad),
    provincia: clave(textos.provincia),
  };
}

/**
 * The direccion the map has to look for, with the clave the marker will stand
 * for once it is found; null when there is nothing to look for:
 * - while the direccion, the ciudad or the provincia is missing;
 * - while they are the ones the marker stands for (`ubicadaPara`), placed by
 *   the map or by the admin. Null `ubicadaPara`: the marker stands for nothing.
 *
 * Writing the provincia of an iglesia that had none (its localidad could not
 * be split) does not move its saved point: only the direccion or the ciudad do.
 */
export function getDireccionABuscar(
  textos: TextosDeUbicacion,
  ubicadaPara: ClaveDeUbicacion | null,
): { direccion: string; para: ClaveDeUbicacion } | null {
  const direccion = getDireccionParaElMapa(textos);
  if (direccion === null) {
    return null;
  }

  const para = getClaveDeUbicacion(textos);
  const cambio =
    ubicadaPara === null ||
    para.direccion !== ubicadaPara.direccion ||
    para.ciudad !== ubicadaPara.ciudad ||
    (ubicadaPara.provincia !== '' && para.provincia !== ubicadaPara.provincia);

  return cambio ? { direccion, para } : null;
}

/**
 * Whether "Crear iglesia" or "Guardar cambios" can be tapped. Not while the map
 * looks for a new direccion: the iglesia would be saved with the point of the
 * old one.
 */
export function puedeGuardarIglesia({
  conConexion,
  guardando,
  buscandoUbicacion,
}: {
  conConexion: boolean;
  guardando: boolean;
  buscandoUbicacion: boolean;
}): boolean {
  return conConexion && !guardando && !buscandoUbicacion;
}
