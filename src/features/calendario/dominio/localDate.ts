/**
 * Local dates are `YYYY-MM-DD` strings. Everything here is plain arithmetic on
 * purpose: no JS `Date` is built, so the time zone of the phone can never move
 * a day.
 */

export type LocalDateParts = {
  year: number;
  /** From 1 (January) to 12 (December). */
  month: number;
  day: number;
};

export function toLocalDate(year: number, month: number, day: number): string {
  const pad = (value: number, length: number) => String(value).padStart(length, '0');

  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

export function parseLocalDate(date: string): LocalDateParts {
  const [year, month, day] = date.split('-').map(Number);

  return { year, month, day };
}

// Sakamoto's method: how far each month moves the weekday of its days.
const MONTH_OFFSETS = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];

/** The day of the week of a date, from 0 (Sunday) to 6 (Saturday). */
export function getWeekday(date: string): number {
  const { year, month, day } = parseLocalDate(date);
  // January and February count as the end of the year before, so that the day
  // a leap year adds falls after them.
  const y = month < 3 ? year - 1 : year;
  const leapDays = Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);

  return (y + leapDays + MONTH_OFFSETS[month - 1] + day) % 7;
}
