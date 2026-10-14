import { CATEGORIAS, getCategoria, type Categoria } from '@/features/eventos/dominio/categoria';
import { categorias } from '@/shared/theme';

import type { FechaDeEvento } from './armarCalendario';

/**
 * The fechas whose evento belongs to one of the selected options. An evento
 * without enfasis belongs to the actividad regular (`R`). With no option
 * selected nothing is shown: the design says "Nada seleccionado".
 */
export function filterFechasByCategorias(
  fechas: readonly FechaDeEvento[],
  selected: readonly Categoria[],
): FechaDeEvento[] {
  return fechas.filter(({ evento }) => selected.includes(getCategoria(evento.enfasis)));
}

/** The selection with one option flipped, always in the order of the design. */
export function toggleCategoria(selected: readonly Categoria[], categoria: Categoria): Categoria[] {
  return CATEGORIAS.filter((each) =>
    each === categoria ? !selected.includes(each) : selected.includes(each),
  );
}

/** How many options are hidden: the number the "Filtrar" button shows. */
export function countHiddenCategorias(selected: readonly Categoria[]): number {
  return CATEGORIAS.length - CATEGORIAS.filter((each) => selected.includes(each)).length;
}

/** The line next to the "Filtrar" button (04a-calendario.html, `resumenFiltro`). */
export function formatFiltroSummary(selected: readonly Categoria[]): string {
  if (countHiddenCategorias(selected) === 0) {
    return 'Mostrando todo';
  }
  if (selected.length === 0) {
    return 'Nada seleccionado';
  }
  const lemas = CATEGORIAS.filter((each) => selected.includes(each)).map(
    (each) => categorias[each].lema,
  );
  return 'Mostrando: ' + lemas.join(', ');
}
