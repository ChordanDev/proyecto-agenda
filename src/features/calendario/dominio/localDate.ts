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

/**
 * Days from 1970-01-01 to a date, by the civil calendar (Howard Hinnant's
 * `days_from_civil`). Only integer arithmetic: no `Date`, no time zone.
 */
function toDayNumber(date: string): number {
  const { year, month, day } = parseLocalDate(date);
  // The year starts in March, so that February 29 is its last day.
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;

  return era * 146097 + dayOfEra - 719468;
}

/** The inverse of `toDayNumber` (Howard Hinnant's `civil_from_days`). */
function fromDayNumber(dayNumber: number): string {
  const z = dayNumber + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);

  return toLocalDate(year, month, day);
}

/** The date `days` after (or before, when negative) another one. */
export function addDays(date: string, days: number): string {
  return fromDayNumber(toDayNumber(date) + days);
}

/** How many days go from `from` to `to`: negative when `to` comes first. */
export function daysBetween(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from);
}
