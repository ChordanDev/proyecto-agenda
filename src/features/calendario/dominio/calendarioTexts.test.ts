import {
  formatDayHeading,
  formatEventosCount,
  formatMonthTitle,
  formatTime,
  formatTimeAndPlace,
  getAlcanceLabel,
} from './calendarioTexts';

describe('formatMonthTitle', () => {
  it('writes the month with a capital letter, then the year', () => {
    expect(formatMonthTitle({ year: 2026, month: 10 })).toBe('Octubre 2026');
  });

  it('knows the name of every month', () => {
    const names = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) =>
      formatMonthTitle({ year: 2027, month }),
    );

    expect(names).toEqual([
      'Enero 2027',
      'Febrero 2027',
      'Marzo 2027',
      'Abril 2027',
      'Mayo 2027',
      'Junio 2027',
      'Julio 2027',
      'Agosto 2027',
      'Septiembre 2027',
      'Octubre 2027',
      'Noviembre 2027',
      'Diciembre 2027',
    ]);
  });
});

describe('formatDayHeading', () => {
  it('writes the weekday, the day and the month', () => {
    expect(formatDayHeading('2026-10-10')).toBe('Sábado 10 de octubre');
  });

  it('writes the day without a leading zero', () => {
    expect(formatDayHeading('2026-10-06')).toBe('Martes 6 de octubre');
  });

  it('knows the name of every weekday', () => {
    const headings = [4, 5, 6, 7, 8, 9, 10].map((day) =>
      formatDayHeading(`2026-10-${String(day).padStart(2, '0')}`),
    );

    expect(headings).toEqual([
      'Domingo 4 de octubre',
      'Lunes 5 de octubre',
      'Martes 6 de octubre',
      'Miércoles 7 de octubre',
      'Jueves 8 de octubre',
      'Viernes 9 de octubre',
      'Sábado 10 de octubre',
    ]);
  });

  it('follows the week into another month and another year', () => {
    expect(formatDayHeading('2027-01-01')).toBe('Viernes 1 de enero');
    expect(formatDayHeading('2028-02-29')).toBe('Martes 29 de febrero');
  });
});

describe('formatEventosCount', () => {
  it('writes one evento in singular', () => {
    expect(formatEventosCount(1)).toBe('1 evento');
  });

  it('writes several eventos in plural', () => {
    expect(formatEventosCount(3)).toBe('3 eventos');
  });

  it('says that a day has no eventos', () => {
    expect(formatEventosCount(0)).toBe('sin eventos');
  });
});

describe('formatTime', () => {
  it('cuts the hour and the minutes of the stored hora', () => {
    expect(formatTime('19:30:00')).toBe('19:30');
  });

  it('keeps the leading zero and converts nothing', () => {
    expect(formatTime('09:30:00')).toBe('09:30');
    expect(formatTime('00:00:00')).toBe('00:00');
    expect(formatTime('23:59:59')).toBe('23:59');
  });
});

describe('formatTimeAndPlace', () => {
  it('writes the hora and the lugar', () => {
    expect(formatTimeAndPlace({ hora: '11:00:00', lugar: 'Templo' })).toBe('11:00 · Templo');
  });

  it('writes only the hora when the evento has no lugar', () => {
    expect(formatTimeAndPlace({ hora: '11:00:00', lugar: null })).toBe('11:00');
  });
});

describe('getAlcanceLabel', () => {
  const nombresDeDistritos = { 'distrito-norte': 'Distrito Norte' };

  it('gives no label to an evento of the iglesia', () => {
    const duenio = { alcance: 'iglesia', iglesiaId: 'iglesia-central' } as const;

    expect(getAlcanceLabel(duenio, nombresDeDistritos)).toBeNull();
  });

  it('gives an evento of a distrito the nombre of that distrito', () => {
    const duenio = { alcance: 'distrito', distritoId: 'distrito-norte' } as const;

    expect(getAlcanceLabel(duenio, nombresDeDistritos)).toBe('Distrito Norte');
  });

  it('says "Distrito" when the nombre of the distrito is not known', () => {
    const duenio = { alcance: 'distrito', distritoId: 'distrito-sur' } as const;

    expect(getAlcanceLabel(duenio, nombresDeDistritos)).toBe('Distrito');
  });

  it('gives an evento of the asociacion the label "Asociación"', () => {
    const duenio = { alcance: 'asociacion', asociacionId: 'asociacion-central' } as const;

    expect(getAlcanceLabel(duenio, nombresDeDistritos)).toBe('Asociación');
  });

  it('does not take the nombre of a distrito for a duenio of another level with the same id', () => {
    const duenio = { alcance: 'iglesia', iglesiaId: 'distrito-norte' } as const;

    expect(getAlcanceLabel(duenio, nombresDeDistritos)).toBeNull();
  });
});
