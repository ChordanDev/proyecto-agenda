import { getMonthGrid, type DayCell } from './getMonthGrid';

/** The day numbers of each week, with `null` for the blank cells. */
const days = (weeks: (DayCell | null)[][]) =>
  weeks.map((week) => week.map((cell) => cell?.day ?? null));

describe('getMonthGrid', () => {
  it('starts every week on Sunday and leaves blank the cells before day 1', () => {
    // October 2026 starts on a Thursday.
    expect(days(getMonthGrid({ year: 2026, month: 10 }))).toEqual([
      [null, null, null, null, 1, 2, 3],
      [4, 5, 6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15, 16, 17],
      [18, 19, 20, 21, 22, 23, 24],
      [25, 26, 27, 28, 29, 30, 31],
    ]);
  });

  it('gives every day its date', () => {
    const [firstWeek, secondWeek] = getMonthGrid({ year: 2026, month: 10 });

    expect(firstWeek[4]).toEqual({ date: '2026-10-01', day: 1 });
    expect(secondWeek[6]).toEqual({ date: '2026-10-10', day: 10 });
  });

  it('leaves no blank cell before a month that starts on Sunday', () => {
    // February 2026: 28 days from a Sunday, exactly four weeks.
    expect(days(getMonthGrid({ year: 2026, month: 2 }))).toEqual([
      [1, 2, 3, 4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14],
      [15, 16, 17, 18, 19, 20, 21],
      [22, 23, 24, 25, 26, 27, 28],
    ]);
  });

  it('leaves six blank cells before a month that starts on Saturday', () => {
    // August 2026: 31 days from a Saturday, six weeks.
    expect(days(getMonthGrid({ year: 2026, month: 8 }))).toEqual([
      [null, null, null, null, null, null, 1],
      [2, 3, 4, 5, 6, 7, 8],
      [9, 10, 11, 12, 13, 14, 15],
      [16, 17, 18, 19, 20, 21, 22],
      [23, 24, 25, 26, 27, 28, 29],
      [30, 31, null, null, null, null, null],
    ]);
  });

  it('gives February 29 days in a leap year', () => {
    // February 2028 starts on a Tuesday.
    expect(days(getMonthGrid({ year: 2028, month: 2 }))).toEqual([
      [null, null, 1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10, 11, 12],
      [13, 14, 15, 16, 17, 18, 19],
      [20, 21, 22, 23, 24, 25, 26],
      [27, 28, 29, null, null, null, null],
    ]);
  });

  it('gives February 28 days in a year that is not a leap year', () => {
    // February 2027 starts on a Monday.
    expect(days(getMonthGrid({ year: 2027, month: 2 }))).toEqual([
      [null, 1, 2, 3, 4, 5, 6],
      [7, 8, 9, 10, 11, 12, 13],
      [14, 15, 16, 17, 18, 19, 20],
      [21, 22, 23, 24, 25, 26, 27],
      [28, null, null, null, null, null, null],
    ]);
  });

  it('never shows days of the months around it', () => {
    const cells = getMonthGrid({ year: 2026, month: 8 }).flat();
    const dates = cells.filter((cell) => cell !== null).map((cell) => cell.date);

    expect(dates).toHaveLength(31);
    expect(dates.every((date) => date.startsWith('2026-08-'))).toBe(true);
  });

  it('completes the last week with blank cells, so every week has seven', () => {
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const weeks = months.flatMap((month) => getMonthGrid({ year: 2026, month }));

    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('rejects a month outside 1 to 12', () => {
    expect(() => getMonthGrid({ year: 2026, month: 13 })).toThrow(RangeError);
  });
});
