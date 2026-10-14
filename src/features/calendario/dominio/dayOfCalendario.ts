import { CATEGORIAS, getCategoria, type Categoria } from '@/features/eventos/dominio/categoria';
import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';
import { getDiaDelEvento, type DiaDelRango } from './diasDeEvento';

/** An evento in the list of a day, with the day of its range if it lasts several. */
export type EventoDelDia = { evento: Evento; diaDelRango: DiaDelRango | null };

function compareText(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

/**
 * The eventos of a day, ordered by hora and then by titulo. An evento of
 * several days is on each day of its range, so a day can hold one that started
 * on an earlier day: they are ordered together.
 */
export function getEventosDelDia(
  calendario: readonly FechaDeEvento[],
  date: string,
): EventoDelDia[] {
  return calendario
    .flatMap((fechaDeEvento): EventoDelDia[] => {
      const dia = getDiaDelEvento(fechaDeEvento, date);

      return dia === undefined ? [] : [{ evento: fechaDeEvento.evento, ...dia }];
    })
    .sort(
      (a, b) =>
        compareText(a.evento.hora, b.evento.hora) ||
        a.evento.titulo.localeCompare(b.evento.titulo, 'es'),
    );
}

/** The eventos of a day: see `getEventosDelDia`. */
export function getEventosOfDay(calendario: readonly FechaDeEvento[], date: string): Evento[] {
  return getEventosDelDia(calendario, date).map(({ evento }) => evento);
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
