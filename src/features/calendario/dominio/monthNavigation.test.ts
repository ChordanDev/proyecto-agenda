import {
  getMonthOf,
  getNextMonth,
  getPreviousMonth,
  getSelectedDate,
  getSelectedDateAfterTodayChange,
} from './monthNavigation';

describe('getPreviousMonth', () => {
  it('goes back one month inside the year', () => {
    expect(getPreviousMonth({ year: 2026, month: 10 })).toEqual({ year: 2026, month: 9 });
  });

  it('goes from January to December of the year before', () => {
    expect(getPreviousMonth({ year: 2027, month: 1 })).toEqual({ year: 2026, month: 12 });
  });
});

describe('getNextMonth', () => {
  it('goes forward one month inside the year', () => {
    expect(getNextMonth({ year: 2026, month: 10 })).toEqual({ year: 2026, month: 11 });
  });

  it('goes from December to January of the year after', () => {
    expect(getNextMonth({ year: 2026, month: 12 })).toEqual({ year: 2027, month: 1 });
  });

  it('undoes getPreviousMonth', () => {
    const january = { year: 2027, month: 1 };

    expect(getNextMonth(getPreviousMonth(january))).toEqual(january);
  });
});

describe('getMonthOf', () => {
  it('gives the month a date belongs to', () => {
    expect(getMonthOf('2026-10-08')).toEqual({ year: 2026, month: 10 });
    expect(getMonthOf('2027-01-31')).toEqual({ year: 2027, month: 1 });
  });
});

describe('getSelectedDate', () => {
  const today = '2026-10-08';

  it('selects today when the month holds it', () => {
    expect(getSelectedDate({ year: 2026, month: 10 }, today)).toBe('2026-10-08');
  });

  it('selects day 1 of a month after the one of today', () => {
    expect(getSelectedDate({ year: 2026, month: 11 }, today)).toBe('2026-11-01');
  });

  it('selects day 1 of a month before the one of today', () => {
    expect(getSelectedDate({ year: 2026, month: 9 }, today)).toBe('2026-09-01');
  });

  it('selects day 1 of the same month of another year', () => {
    expect(getSelectedDate({ year: 2027, month: 10 }, today)).toBe('2027-10-01');
  });
});

describe('getSelectedDateAfterTodayChange', () => {
  it('moves on to the new today when the old today was selected', () => {
    expect(getSelectedDateAfterTodayChange('2026-10-08', '2026-10-08', '2026-10-09')).toBe(
      '2026-10-09',
    );
  });

  it('moves on to the new today across the end of the month', () => {
    expect(getSelectedDateAfterTodayChange('2026-10-31', '2026-10-31', '2026-11-01')).toBe(
      '2026-11-01',
    );
  });

  it('keeps another day of the same month selected', () => {
    expect(getSelectedDateAfterTodayChange('2026-10-24', '2026-10-08', '2026-10-09')).toBe(
      '2026-10-24',
    );
  });

  it('keeps a day of another month selected', () => {
    expect(getSelectedDateAfterTodayChange('2026-12-01', '2026-10-08', '2026-10-09')).toBe(
      '2026-12-01',
    );
  });
});
