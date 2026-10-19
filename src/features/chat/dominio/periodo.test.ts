import { getPeriodo } from './periodo';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

describe('getPeriodo', () => {
  it('gives the dia and the mes of the asociacion, not of UTC', () => {
    // 23:30 in Buenos Aires, already the next day in UTC.
    expect(getPeriodo(new Date('2026-10-18T02:30:00Z'), BUENOS_AIRES)).toEqual({
      dia: '2026-10-17',
      mes: '2026-10-01',
    });
  });

  it('starts a new dia at 00:00 of the asociacion', () => {
    expect(getPeriodo(new Date('2026-10-18T02:59:59Z'), BUENOS_AIRES).dia).toBe('2026-10-17');
    expect(getPeriodo(new Date('2026-10-18T03:00:00Z'), BUENOS_AIRES).dia).toBe('2026-10-18');
  });

  it('starts a new mes at 00:00 of its first day in the asociacion', () => {
    expect(getPeriodo(new Date('2026-11-01T02:59:59Z'), BUENOS_AIRES).mes).toBe('2026-10-01');
    expect(getPeriodo(new Date('2026-11-01T03:00:00Z'), BUENOS_AIRES)).toEqual({
      dia: '2026-11-01',
      mes: '2026-11-01',
    });
  });

  it('crosses the year', () => {
    expect(getPeriodo(new Date('2027-01-01T02:00:00Z'), BUENOS_AIRES)).toEqual({
      dia: '2026-12-31',
      mes: '2026-12-01',
    });
  });

  it('follows the zona horaria it is given', () => {
    expect(getPeriodo(new Date('2026-10-18T02:30:00Z'), 'UTC').dia).toBe('2026-10-18');
  });
});
