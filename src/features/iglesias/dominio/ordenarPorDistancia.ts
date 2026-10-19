import type { Iglesia } from './buscarIglesias';
import { distanciaEnMetros, type Punto } from './distancia';

/**
 * Churches from the nearest to the farthest from a point. Those without
 * coordinates go last, in order by name. The list it receives is not modified.
 */
export function ordenarPorDistancia(iglesias: readonly Iglesia[], desde: Punto): Iglesia[] {
  const conDistancia = iglesias.map((iglesia) => ({
    iglesia,
    metros: iglesia.coordenadas ? distanciaEnMetros(desde, iglesia.coordenadas) : undefined,
  }));

  conDistancia.sort((a, b) => {
    if (a.metros !== undefined && b.metros !== undefined) {
      return a.metros - b.metros;
    }
    if (a.metros !== undefined) {
      return -1;
    }
    if (b.metros !== undefined) {
      return 1;
    }
    return a.iglesia.nombre.localeCompare(b.iglesia.nombre, 'es');
  });

  return conDistancia.map(({ iglesia }) => iglesia);
}
