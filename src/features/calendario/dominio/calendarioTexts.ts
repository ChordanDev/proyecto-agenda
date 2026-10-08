import type { Duenio, Evento } from '@/features/eventos/dominio/evento';

import type { Month } from './getMonthRange';
import { getWeekday, parseLocalDate } from './localDate';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** From Sunday, as `getWeekday` counts them. */
const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The title of the monthly view: "Octubre 2026". */
export function formatMonthTitle({ year, month }: Month): string {
  return `${capitalize(MONTH_NAMES[month - 1])} ${year}`;
}

/** The heading of the list of a day: "Sábado 10 de octubre". */
export function formatDayHeading(date: string): string {
  const { month, day } = parseLocalDate(date);

  return `${WEEKDAY_NAMES[getWeekday(date)]} ${day} de ${MONTH_NAMES[month - 1]}`;
}

/** How many eventos a day has: "1 evento", "3 eventos" or "sin eventos". */
export function formatEventosCount(count: number): string {
  if (count === 0) {
    return 'sin eventos';
  }

  return count === 1 ? '1 evento' : `${count} eventos`;
}

/**
 * The hora of an evento as `HH:MM`, cut from the stored `HH:MM:SS`. Nothing is
 * converted: it is the local hora of the asociacion, the same on every phone.
 */
export function formatTime(hora: string): string {
  return hora.slice(0, 5);
}

/** The second line of an evento in the list: "11:00 · Templo", or only the hora. */
export function formatTimeAndPlace({ hora, lugar }: Pick<Evento, 'hora' | 'lugar'>): string {
  const time = formatTime(hora);

  return lugar ? `${time} · ${lugar}` : time;
}

/**
 * The label that tells an evento comes from above the iglesia: the nombre of
 * its distrito, or "Asociación". An evento of an iglesia has none.
 *
 * `nombresDeDistritos` goes by id of distrito: a duenio only carries ids.
 */
export function getAlcanceLabel(
  duenio: Duenio,
  nombresDeDistritos: Readonly<Record<string, string>>,
): string | null {
  switch (duenio.alcance) {
    case 'iglesia':
      return null;
    case 'distrito':
      return nombresDeDistritos[duenio.distritoId] ?? 'Distrito';
    case 'asociacion':
      return 'Asociación';
  }
}
