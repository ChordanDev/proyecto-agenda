import { formatLongDate } from '@/features/calendario/dominio/calendarioTexts';
import {
  addDays,
  getWeekday,
  parseLocalDate,
  toLocalDate,
} from '@/features/calendario/dominio/localDate';

import type { Repeticion } from './evento';

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

const DAYS_IN_A_WEEK = 7;

/**
 * Every date of an evento: its single date when it does not repeat, or each
 * occurrence of its series from the first date up to "Hasta" (`finDeSerie`),
 * both included. A weekly series keeps the weekday of its first date.
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

  // Local `YYYY-MM-DD` dates order as plain text.
  for (let next = fecha; next <= finDeSerie; next = addDays(next, DAYS_IN_A_WEEK)) {
    fechas.push(next);
  }

  return fechas;
}

/**
 * The same day one year later. February 29 becomes February 28 when the next
 * year is not a leap year, so the result stays within a year.
 */
export function sumarUnAnio(fecha: string): string {
  const { year, month, day } = parseLocalDate(fecha);
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const lastDay = month === 2 && day === 29 && !isLeap(year + 1) ? 28 : day;

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
  ];
}

/** How a series repeats, in the detail: "Todos los sábados". */
export function formatRepeticionDelDetalle(repeticion: Repeticion, fecha: string): string {
  return repeticion === 'semanal' ? `Todos los ${WEEKDAYS_PLURAL[getWeekday(fecha)]}` : '';
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
