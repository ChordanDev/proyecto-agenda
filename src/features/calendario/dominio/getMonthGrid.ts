import { getDaysInMonth, getMonthRange, type Month } from './getMonthRange';
import { getWeekday, toLocalDate } from './localDate';

const DAYS_IN_WEEK = 7;

/** A day of the month in the grid. */
export type DayCell = {
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  /** Day of the month, from 1. */
  day: number;
};

/**
 * The grid of a month as weeks of seven cells, from Sunday to Saturday. The
 * cells before day 1 and after the last day are `null`: the days of the months
 * around it are never shown (04a-calendario.html, lines 235-236).
 */
export function getMonthGrid(month: Month): (DayCell | null)[][] {
  // It also rejects a month or a year that is not one.
  const { firstDay } = getMonthRange(month);

  const cells: (DayCell | null)[] = Array.from({ length: getWeekday(firstDay) }, () => null);

  for (let day = 1; day <= getDaysInMonth(month); day++) {
    cells.push({ date: toLocalDate(month.year, month.month, day), day });
  }

  while (cells.length % DAYS_IN_WEEK !== 0) {
    cells.push(null);
  }

  const weeks: (DayCell | null)[][] = [];

  for (let start = 0; start < cells.length; start += DAYS_IN_WEEK) {
    weeks.push(cells.slice(start, start + DAYS_IN_WEEK));
  }

  return weeks;
}
