import { formatLongDate } from '../../calendario/dominio/calendarioTexts.ts';
import {
  addDays,
  getWeekday,
  parseLocalDate,
  toLocalDate,
} from '../../calendario/dominio/localDate.ts';

import type { Repeticion } from './evento.ts';

/** From Sunday, as `getWeekday` counts them, in plural: "todos los sábados". */
const WEEKDAYS_PLURAL = [
  'domingos',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábados',
];

/** From Sunday, in singular: "el tercer sábado". */
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const DAYS_IN_A_WEEK = 7;

/** "el tercer sábado": the position of a weekday in its month. The fifth is "the last". */
const POSITIONS = ['primer', 'segundo', 'tercer', 'cuarto', 'último'];
const LAST_POSITION = 5;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/**
 * Which of its weekday in the month a date is, from 1 to 5. A fifth one is
 * taken as "the last": not every month has five, but every month has a last.
 */
function getPositionInMonth(fecha: string): number {
  return Math.ceil(parseLocalDate(fecha).day / DAYS_IN_A_WEEK);
}

/** The date of a weekday at a position of a month; position 5 is the last one. */
function getWeekdayOfMonth(year: number, month: number, weekday: number, position: number): string {
  if (position === LAST_POSITION) {
    const lastDay = toLocalDate(year, month, daysInMonth(year, month));
    const back = (getWeekday(lastDay) - weekday + DAYS_IN_A_WEEK) % DAYS_IN_A_WEEK;

    return addDays(lastDay, -back);
  }

  const firstDay = toLocalDate(year, month, 1);
  const forward = (weekday - getWeekday(firstDay) + DAYS_IN_A_WEEK) % DAYS_IN_A_WEEK;

  return addDays(firstDay, forward + (position - 1) * DAYS_IN_A_WEEK);
}

/** The position of the fecha and its weekday in words: "tercer sábado", "último jueves". */
function describePosition(fecha: string): string {
  return `${POSITIONS[getPositionInMonth(fecha) - 1]} ${WEEKDAYS[getWeekday(fecha)]}`;
}

/**
 * Every date of an evento: its single date when it does not repeat, or each
 * occurrence of its series from the first date up to "Hasta" (`finDeSerie`),
 * both included. A weekly series keeps the weekday of its first date; a
 * monthly one keeps its weekday and its position in the month, never its day
 * number.
 */
export function getFechasDeSerie(
  fecha: string,
  repeticion: Repeticion,
  finDeSerie: string | null,
): string[] {
  if (repeticion === 'ninguna' || finDeSerie === null) {
    return [fecha];
  }

  const fechas: string[] = [];

  if (repeticion === 'semanal') {
    // Local `YYYY-MM-DD` dates order as plain text.
    for (let next = fecha; next <= finDeSerie; next = addDays(next, DAYS_IN_A_WEEK)) {
      fechas.push(next);
    }

    return fechas;
  }

  // Monthly: one date per month. No month is skipped: the fifth position, which
  // not every month has, is always taken as the last.
  const weekday = getWeekday(fecha);
  const position = getPositionInMonth(fecha);
  let { year, month } = parseLocalDate(fecha);

  for (
    let next = fecha;
    next <= finDeSerie;
    next = getWeekdayOfMonth(year, month, weekday, position)
  ) {
    fechas.push(next);
    month = month === 12 ? 1 : month + 1;
    year = month === 1 ? year + 1 : year;
  }

  return fechas;
}

/**
 * The same day one year later. February 29 becomes February 28 when the next
 * year is not a leap year, so the result stays within a year.
 */
export function sumarUnAnio(fecha: string): string {
  const { year, month, day } = parseLocalDate(fecha);
  const lastDay = month === 2 && day === 29 && !isLeapYear(year + 1) ? 28 : day;

  return toLocalDate(year + 1, month, lastDay);
}

/** The "Hasta" a new series starts with: one year after its first date. */
export function getHastaSugerido(fecha: string): string {
  return sumarUnAnio(fecha);
}

/**
 * The latest "Hasta" a series can have. A new one goes at most a year from its
 * first date. Editing one renews it: it can go a year from the day of the edit,
 * and never less than a year from its first date, so a series that starts in
 * the future keeps what it could have when it was created.
 */
export function getTopeDeHasta({
  fecha,
  hoy,
  editando,
}: {
  fecha: string;
  /** Today, by the clock of the phone: the rules receive it. */
  hoy: string;
  editando: boolean;
}): string {
  const fromFecha = sumarUnAnio(fecha);

  if (!editando) {
    return fromFecha;
  }

  const fromHoy = sumarUnAnio(hoy);

  return fromHoy > fromFecha ? fromHoy : fromFecha;
}

/** The options of the form, with the weekday of the fecha in words. */
export function getOpcionesDeRepeticion(
  fecha: string,
): { repeticion: Repeticion; label: string }[] {
  return [
    { repeticion: 'ninguna', label: 'No se repite' },
    { repeticion: 'semanal', label: `Cada semana, los ${WEEKDAYS_PLURAL[getWeekday(fecha)]}` },
    { repeticion: 'mensual', label: `Cada mes, el ${describePosition(fecha)}` },
  ];
}

/** How a series repeats, in the detail: "Todos los sábados", "El tercer sábado de cada mes". */
export function formatRepeticionDelDetalle(repeticion: Repeticion, fecha: string): string {
  switch (repeticion) {
    case 'semanal':
      return `Todos los ${WEEKDAYS_PLURAL[getWeekday(fecha)]}`;
    case 'mensual':
      return `El ${describePosition(fecha)} de cada mes`;
    case 'ninguna':
      return '';
  }
}

/** Until when a series repeats: "Hasta el 17 de octubre de 2027". */
export function formatHasta(finDeSerie: string): string {
  return `Hasta el ${formatLongDate(finDeSerie)}`;
}

/**
 * The sentence the form shows before saving, so the series is read with words:
 * "Se repite todos los sábados, hasta el 17 de octubre de 2027."
 */
export function formatFraseDeRepeticion(
  repeticion: Repeticion,
  fecha: string,
  finDeSerie: string,
): string {
  const como = formatRepeticionDelDetalle(repeticion, fecha).toLowerCase();

  return `Se repite ${como}, hasta el ${formatLongDate(finDeSerie)}.`;
}

/**
 * The note under "Hasta". While a series is edited its cap depends on two dates
 * (see `getTopeDeHasta`), so the note names the day instead of the rule.
 */
export function formatNotaDeHasta(contexto: {
  fecha: string;
  hoy: string;
  editando: boolean;
}): string {
  return contexto.editando
    ? `Como máximo, el ${formatLongDate(getTopeDeHasta(contexto))}.`
    : 'Como máximo, un año desde la primera fecha.';
}
