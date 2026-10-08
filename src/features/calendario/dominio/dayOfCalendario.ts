import { CATEGORIAS, getCategoria, type Categoria } from '@/features/eventos/dominio/categoria';
import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';

/**
 * The eventos of a day, in the order of the calendario: `armarCalendario`
 * already orders the dates of a day by hora and then by titulo.
 *
 * An evento of several days belongs to its first day only: marking each day of
 * the range is issue #34.
 */
export function getEventosOfDay(calendario: readonly FechaDeEvento[], date: string): Evento[] {
  return calendario.filter(({ fecha }) => fecha === date).map(({ evento }) => evento);
}

/**
 * The markers a day shows in the grid: one for each enfasis that has an evento
 * that day, and one for the actividad regular, never one per evento. They keep
 * the order of the design, so the same marker is always in the same place.
 */
export function getDayMarkers(calendario: readonly FechaDeEvento[], date: string): Categoria[] {
  const present = new Set(
    getEventosOfDay(calendario, date).map((evento) => getCategoria(evento.enfasis)),
  );

  return CATEGORIAS.filter((categoria) => present.has(categoria));
}
