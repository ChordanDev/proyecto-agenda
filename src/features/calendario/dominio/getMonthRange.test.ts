import { getMonthRange } from './getMonthRange';

describe('getMonthRange', () => {
  it('returns the first and the last day of a month of 31 days', () => {
    expect(getMonthRange({ year: 2026, month: 10 })).toEqual({
      firstDay: '2026-10-01',
      lastDay: '2026-10-31',
    });
  });

  it('returns the first and the last day of a month of 30 days', () => {
    expect(getMonthRange({ year: 2026, month: 11 })).toEqual({
      firstDay: '2026-11-01',
      lastDay: '2026-11-30',
    });
  });

  it('knows the length of every month of a year that is not a leap year', () => {
    const lastDays = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(
      (month) => getMonthRange({ year: 2026, month }).lastDay,
    );

    expect(lastDays).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
      '2026-08-31',
      '2026-09-30',
      '2026-10-31',
      '2026-11-30',
      '2026-12-31',
    ]);
  });

  it('writes the month with two digits', () => {
    expect(getMonthRange({ year: 2027, month: 1 })).toEqual({
      firstDay: '2027-01-01',
      lastDay: '2027-01-31',
    });
  });

  it('keeps December inside its own year', () => {
    expect(getMonthRange({ year: 2026, month: 12 })).toEqual({
      firstDay: '2026-12-01',
      lastDay: '2026-12-31',
    });
  });

  it('gives February 29 days in a leap year', () => {
    expect(getMonthRange({ year: 2028, month: 2 }).lastDay).toBe('2028-02-29');
  });

  it('gives February 28 days in a year that is not a leap year', () => {
    expect(getMonthRange({ year: 2027, month: 2 }).lastDay).toBe('2027-02-28');
  });

  it('does not treat a year divisible by 100 as a leap year', () => {
    expect(getMonthRange({ year: 1900, month: 2 }).lastDay).toBe('1900-02-28');
    expect(getMonthRange({ year: 2100, month: 2 }).lastDay).toBe('2100-02-28');
  });

  it('treats a year divisible by 400 as a leap year', () => {
    expect(getMonthRange({ year: 2000, month: 2 }).lastDay).toBe('2000-02-29');
  });

  it('rejects a month outside 1 to 12', () => {
    expect(() => getMonthRange({ year: 2026, month: 0 })).toThrow(RangeError);
    expect(() => getMonthRange({ year: 2026, month: 13 })).toThrow(RangeError);
    expect(() => getMonthRange({ year: 2026, month: 1.5 })).toThrow(RangeError);
  });
});
