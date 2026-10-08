/** A month of the calendar. `month` goes from 1 (January) to 12 (December). */
export type Month = {
  year: number;
  month: number;
};

/** First and last day of a month, as local `YYYY-MM-DD` dates. */
export type MonthRange = {
  firstDay: string;
  lastDay: string;
};

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Every fourth year, except the centuries that are not divisible by 400. */
function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getDaysInMonth({ year, month }: Month): number {
  return month === 2 && isLeapYear(year) ? 29 : DAYS_IN_MONTH[month - 1];
}

function toLocalDate(year: number, month: number, day: number): string {
  const pad = (value: number, length: number) => String(value).padStart(length, '0');

  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * First and last day of a month. It is plain arithmetic on purpose: no JS
 * `Date` is built, so the time zone of the phone can never move a day.
 */
export function getMonthRange({ year, month }: Month): MonthRange {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`A month goes from 1 to 12, got ${month}`);
  }

  // Anything else would not be a `YYYY-MM-DD` date and would only fail later,
  // in the database.
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError(`A year goes from 1 to 9999, got ${year}`);
  }

  return {
    firstDay: toLocalDate(year, month, 1),
    lastDay: toLocalDate(year, month, getDaysInMonth({ year, month })),
  };
}
