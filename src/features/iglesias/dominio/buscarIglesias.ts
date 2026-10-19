import type { Punto } from './distancia';
import { ordenarPorDistancia } from './ordenarPorDistancia';

export type Iglesia = {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  /** Name of the distrito the church belongs to. */
  distrito: string;
  /** When true, the church never appears in the "Elegir iglesia" search. */
  excluidaDelBuscador: boolean;
  /** Dada de baja by the admin: out of the search until it is reactivada. */
  deBaja: boolean;
  /** Where the church is; missing until the developers load it. */
  coordenadas?: Punto;
};

/** Lower case, without accents or diaeresis, so "CÓRDOBA" and "cordoba" are equal. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Search of "Elegir iglesia": matches by a part of the name, ignoring case and
 * accents. An empty text returns every church. Churches excluded from the
 * search or dadas de baja are never returned. Without a ubicación the order of the list is
 * kept; with one, the results go from the nearest to the farthest.
 */
export function buscarIglesias(
  iglesias: readonly Iglesia[],
  texto: string,
  ubicacion?: Punto,
): Iglesia[] {
  const query = normalize(texto);

  const results = iglesias.filter(
    (iglesia) =>
      !iglesia.excluidaDelBuscador && !iglesia.deBaja && normalize(iglesia.nombre).includes(query),
  );

  return ubicacion ? ordenarPorDistancia(results, ubicacion) : results;
}
