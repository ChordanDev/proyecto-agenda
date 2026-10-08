import { getWeekday, parseLocalDate, toLocalDate } from './localDate';

describe('toLocalDate', () => {
  it('writes a date as YYYY-MM-DD', () => {
    expect(toLocalDate(2026, 10, 31)).toBe('2026-10-31');
  });

  it('writes the month and the day with two digits and the year with four', () => {
    expect(toLocalDate(2027, 1, 6)).toBe('2027-01-06');
    expect(toLocalDate(1, 1, 1)).toBe('0001-01-01');
  });
});

describe('parseLocalDate', () => {
  it('reads the year, the month and the day of a date', () => {
    expect(parseLocalDate('2026-10-07')).toEqual({ year: 2026, month: 10, day: 7 });
  });

  it('reads back what toLocalDate writes', () => {
    expect(parseLocalDate(toLocalDate(2028, 2, 29))).toEqual({ year: 2028, month: 2, day: 29 });
  });
});

describe('getWeekday', () => {
  it('counts from 0, Sunday, to 6, Saturday', () => {
    expect(getWeekday('2026-10-04')).toBe(0);
    expect(getWeekday('2026-10-05')).toBe(1);
    expect(getWeekday('2026-10-06')).toBe(2);
    expect(getWeekday('2026-10-07')).toBe(3);
    expect(getWeekday('2026-10-08')).toBe(4);
    expect(getWeekday('2026-10-09')).toBe(5);
    expect(getWeekday('2026-10-10')).toBe(6);
  });

  it('knows the weekday of the first day of a month', () => {
    expect(getWeekday('2026-10-01')).toBe(4);
    expect(getWeekday('2026-02-01')).toBe(0);
    expect(getWeekday('2026-08-01')).toBe(6);
  });

  it('follows the week across the end of a year', () => {
    expect(getWeekday('2026-12-31')).toBe(4);
    expect(getWeekday('2027-01-01')).toBe(5);
  });

  it('counts February 29 in a leap year', () => {
    expect(getWeekday('2024-02-29')).toBe(4);
    expect(getWeekday('2024-03-01')).toBe(5);
    expect(getWeekday('2028-02-29')).toBe(2);
  });

  it('does not count February 29 in a century that is not a leap year', () => {
    // 1900-02-28 was a Wednesday and the next day was March 1.
    expect(getWeekday('1900-02-28')).toBe(3);
    expect(getWeekday('1900-03-01')).toBe(4);
  });

  it('counts February 29 in a century divisible by 400', () => {
    expect(getWeekday('2000-01-01')).toBe(6);
    expect(getWeekday('2000-03-01')).toBe(3);
  });
});
