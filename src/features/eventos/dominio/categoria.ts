import { categorias } from '../../../shared/theme.ts';

import type { Enfasis } from './evento.ts';

/**
 * Key the design draws an evento with: one of the four enfasis, or `R` for the
 * actividad regular. It is not a fifth enfasis: `R` stands for the lack of one.
 */
export type Categoria = keyof typeof categorias;

/** In the order the design always lists them (04a-calendario.html, line 238). */
export const CATEGORIAS: readonly Categoria[] = ['S', 'F', 'I', 'H', 'R'];

const CATEGORIA_OF_ENFASIS: Record<Enfasis, Categoria> = {
  identidad: 'S',
  liderazgo: 'F',
  nuevas_generaciones: 'I',
  discipulado: 'H',
};

/** The key of the design for an enfasis, or the one of the actividad regular for none. */
export function getCategoria(enfasis: Enfasis | null): Categoria {
  return enfasis === null ? 'R' : CATEGORIA_OF_ENFASIS[enfasis];
}

/** The lema of an enfasis ("Somos"), or "Actividad regular" for an evento without one. */
export function getLema(enfasis: Enfasis | null): string {
  return categorias[getCategoria(enfasis)].lema;
}
