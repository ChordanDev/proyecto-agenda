import type { Month } from './getMonthRange';
import { parseLocalDate, toLocalDate } from './localDate';

export function getPreviousMonth({ year, month }: Month): Month {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function getNextMonth({ year, month }: Month): Month {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** The month a local date belongs to. */
export function getMonthOf(date: string): Month {
  const { year, month } = parseLocalDate(date);

  return { year, month };
}

/**
 * The day that is selected when a month comes into view: today when the month
 * holds it, otherwise day 1, so the list under the grid always belongs to a day
 * in sight.
 */
export function getSelectedDate(month: Month, today: string): string {
  const monthOfToday = getMonthOf(today);
  const holdsToday = monthOfToday.year === month.year && monthOfToday.month === month.month;

  return holdsToday ? today : toLocalDate(month.year, month.month, 1);
}

/**
 * The day that is selected once today has changed, as it does when the app
 * stays open overnight: whoever was on today moves on to the new today, and
 * whoever was looking at another day stays there.
 */
export function getSelectedDateAfterTodayChange(
  selectedDate: string,
  previousToday: string,
  today: string,
): string {
  return selectedDate === previousToday ? today : selectedDate;
}
