import { normalize } from '@/features/iglesias/dominio/buscarIglesias';
import { distanciaEnMetros, type Punto } from '@/features/iglesias/dominio/distancia';

import type { Duenio } from './evento';
import { getIglesiasParaSumar, type IglesiaParaSumar } from './iglesiasParaSumar';

/** What "Compartir con otras iglesias" needs to know of an iglesia. */
export type IglesiaParaCompartir = IglesiaParaSumar & {
  nombre: string;
  /** Nombre of its distrito. */
  distrito: string;
  /** Missing until the developers load it. */
  coordenadas?: Punto;
};

/** An iglesia the evento can be shared with, at its distance from the duenio. */
export type OpcionParaCompartir = IglesiaParaCompartir & {
  /** Metres; null when it, or the duenio, has no coordenadas. */
  distancia: number | null;
};

/** How many iglesias are offered while nothing is written. */
const CERCANAS = 4;

/**
 * The points the distance is measured from: the duenia of an evento of
 * iglesia, or every iglesia of the distrito duenio, so each option is measured
 * from the one closest to it. The location of the phone is never used.
 */
function getOrigenes(duenio: Duenio, iglesias: readonly IglesiaParaCompartir[]): Punto[] {
  const delDuenio = iglesias.filter((iglesia) =>
    duenio.alcance === 'iglesia'
      ? iglesia.id === duenio.iglesiaId
      : duenio.alcance === 'distrito' && iglesia.distritoId === duenio.distritoId,
  );

  return delDuenio.flatMap((iglesia) => (iglesia.coordenadas ? [iglesia.coordenadas] : []));
}

function getDistancia(origenes: readonly Punto[], iglesia: IglesiaParaCompartir): number | null {
  const { coordenadas } = iglesia;

  if (coordenadas === undefined || origenes.length === 0) {
    return null;
  }

  return Math.min(...origenes.map((origen) => distanciaEnMetros(origen, coordenadas)));
}

/** Closest first; the iglesias without a distance at the end. Ties go by nombre. */
function compararOpciones(a: OpcionParaCompartir, b: OpcionParaCompartir): number {
  if (a.distancia !== b.distancia) {
    if (a.distancia === null) return 1;
    if (b.distancia === null) return -1;
    return a.distancia - b.distancia;
  }

  return a.nombre.localeCompare(b.nombre, 'es');
}

/**
 * The iglesias of the asociacion offered to share an evento with, closest to
 * its duenio first. Neither the ones that see it by its alcance nor the ones
 * already chosen are offered. While nothing is written, only the 4 closest;
 * a search gives every iglesia whose nombre has the text, ignoring case and
 * accents, still by distance.
 */
export function getOpcionesParaCompartir(
  duenio: Duenio,
  iglesias: readonly IglesiaParaCompartir[],
  { texto, elegidas }: { texto: string; elegidas: readonly string[] },
): OpcionParaCompartir[] {
  const origenes = getOrigenes(duenio, iglesias);
  const query = normalize(texto);

  const opciones = getIglesiasParaSumar(duenio, iglesias)
    .filter((iglesia) => !elegidas.includes(iglesia.id))
    .filter((iglesia) => normalize(iglesia.nombre).includes(query))
    .map((iglesia) => ({ ...iglesia, distancia: getDistancia(origenes, iglesia) }))
    .sort(compararOpciones);

  return query === '' ? opciones.slice(0, CERCANAS) : opciones;
}

/**
 * The iglesias chosen, as the chips show them: in the order they were chosen,
 * without the ones that see the evento by its alcance, which are not saved.
 */
export function getIglesiasElegidas(
  duenio: Duenio,
  elegidas: readonly string[],
  iglesias: readonly IglesiaParaCompartir[],
): IglesiaParaCompartir[] {
  const ofrecibles = getIglesiasParaSumar(duenio, iglesias);

  return elegidas.flatMap((id) => ofrecibles.filter((iglesia) => iglesia.id === id));
}

/** What the list of options is called. */
export function getTituloDeOpciones(texto: string): string {
  return texto.trim() === '' ? 'Más cercanas' : 'Resultados, de la más cercana a la más lejana';
}
