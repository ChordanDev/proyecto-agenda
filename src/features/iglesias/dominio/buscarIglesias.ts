import type { Punto } from './distancia';

export type Iglesia = {
  id: string;
  nombre: string;
  direccion: string;
  localidad: string;
  /** Name of the distrito the church belongs to. */
  distrito: string;
  /** When true, the church never appears in the "Elegir iglesia" search. */
  excluidaDelBuscador: boolean;
  /** Where the church is; missing until the developers load it. */
  coordenadas?: Punto;
};

/** Lower case, without accents or diaeresis, so "CÓRDOBA" and "cordoba" are equal. */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Search of "Elegir iglesia": matches by a part of the name, ignoring case and
 * accents. An empty text returns every church. Churches excluded from the
 * search are never returned. The order of the list is kept.
 */
export function buscarIglesias(iglesias: readonly Iglesia[], texto: string): Iglesia[] {
  const query = normalize(texto);

  return iglesias.filter(
    (iglesia) => !iglesia.excluidaDelBuscador && normalize(iglesia.nombre).includes(query),
  );
}
