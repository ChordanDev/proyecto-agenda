import type { FechaDeEvento } from './armarCalendario.ts';
import { daysBetween } from './localDate.ts';

/** Which day of its range a day of an evento of several days is: "Día 2 de 3". */
export type DiaDelRango = { numero: number; total: number };

/**
 * Whether an evento is on a date and, when it lasts several days, which day of
 * its range that date is. Undefined when the evento is not on that date.
 *
 * An evento of several days has a single date, its first day, and its
 * `fechaFin`. The days in between are never built: the answer is arithmetic,
 * so it costs the same however far the end is (nothing limits it).
 *
 * An end that is not after the start (which the form never saves) leaves the
 * evento on its first day, rather than losing it.
 */
export function getDiaDelEvento(
  { fecha, evento }: FechaDeEvento,
  date: string,
): { diaDelRango: DiaDelRango | null } | undefined {
  const extraDays = evento.fechaFin === null ? 0 : daysBetween(fecha, evento.fechaFin);

  if (extraDays <= 0) {
    return date === fecha ? { diaDelRango: null } : undefined;
  }

  const offset = daysBetween(fecha, date);

  return offset >= 0 && offset <= extraDays
    ? { diaDelRango: { numero: offset + 1, total: extraDays + 1 } }
    : undefined;
}
