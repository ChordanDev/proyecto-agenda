import {
  formatFraseDeRepeticion,
  formatHasta,
  formatRepeticionDelDetalle,
  getFechasDeSerie,
  getHastaSugerido,
  getOpcionesDeRepeticion,
  getTopeDeHasta,
  sumarUnAnio,
} from './repeticion';

describe('getFechasDeSerie', () => {
  it('gives the single date of an evento that does not repeat', () => {
    expect(getFechasDeSerie('2026-10-17', 'ninguna', null)).toEqual(['2026-10-17']);
  });

  it('repeats a weekly evento on the same weekday every week, up to "Hasta"', () => {
    expect(getFechasDeSerie('2026-10-17', 'semanal', '2026-11-07')).toEqual([
      '2026-10-17',
      '2026-10-24',
      '2026-10-31',
      '2026-11-07',
    ]);
  });

  it('leaves out a week that would fall after "Hasta"', () => {
    expect(getFechasDeSerie('2026-10-17', 'semanal', '2026-11-06')).toEqual([
      '2026-10-17',
      '2026-10-24',
      '2026-10-31',
    ]);
  });

  it('crosses the end of the year', () => {
    expect(getFechasDeSerie('2026-12-23', 'semanal', '2027-01-06')).toEqual([
      '2026-12-23',
      '2026-12-30',
      '2027-01-06',
    ]);
  });

  it('has 53 dates in a year that starts and ends on the same weekday', () => {
    const fechas = getFechasDeSerie('2026-10-17', 'semanal', '2027-10-17');

    expect(fechas).toHaveLength(53);
    expect(fechas[52]).toBe('2027-10-16');
  });

  it('keeps the first date when "Hasta" is that same day', () => {
    expect(getFechasDeSerie('2026-10-17', 'semanal', '2026-10-17')).toEqual(['2026-10-17']);
  });
});

describe('sumarUnAnio', () => {
  it('gives the same day one year later', () => {
    expect(sumarUnAnio('2026-10-17')).toBe('2027-10-17');
  });

  it('takes February 29 to February 28 of a year that is not a leap year', () => {
    expect(sumarUnAnio('2028-02-29')).toBe('2029-02-28');
  });
});

describe('getHastaSugerido', () => {
  it('suggests one year after the first date', () => {
    expect(getHastaSugerido('2026-10-17')).toBe('2027-10-17');
  });
});

describe('getTopeDeHasta', () => {
  it('caps a new series one year after its first date', () => {
    expect(getTopeDeHasta({ fecha: '2026-12-05', hoy: '2026-10-14', editando: false })).toBe(
      '2027-12-05',
    );
  });

  it('caps a series being edited one year after the day of the edit', () => {
    expect(getTopeDeHasta({ fecha: '2026-01-07', hoy: '2026-10-14', editando: true })).toBe(
      '2027-10-14',
    );
  });

  it('never caps an edit below what the series could have when created', () => {
    // A series that starts in the future keeps the cap of its first date.
    expect(getTopeDeHasta({ fecha: '2026-12-05', hoy: '2026-10-14', editando: true })).toBe(
      '2027-12-05',
    );
  });
});

describe('getOpcionesDeRepeticion', () => {
  it('offers not repeating, or every week on the weekday of the fecha, first', () => {
    expect(getOpcionesDeRepeticion('2026-10-17').slice(0, 2)).toEqual([
      { repeticion: 'ninguna', label: 'No se repite' },
      { repeticion: 'semanal', label: 'Cada semana, los sábados' },
    ]);
    expect(getOpcionesDeRepeticion('2026-10-14')[1].label).toBe('Cada semana, los miércoles');
  });
});

describe('formatFraseDeRepeticion', () => {
  it('explains a weekly series with words, until its "Hasta"', () => {
    expect(formatFraseDeRepeticion('semanal', '2026-10-17', '2027-10-17')).toBe(
      'Se repite todos los sábados, hasta el 17 de octubre de 2027.',
    );
  });

  it('knows every weekday in plural', () => {
    const frases = [
      '2026-10-11',
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16',
    ].map((fecha) => formatFraseDeRepeticion('semanal', fecha, '2026-12-31'));

    expect(frases).toEqual([
      'Se repite todos los domingos, hasta el 31 de diciembre de 2026.',
      'Se repite todos los lunes, hasta el 31 de diciembre de 2026.',
      'Se repite todos los martes, hasta el 31 de diciembre de 2026.',
      'Se repite todos los miércoles, hasta el 31 de diciembre de 2026.',
      'Se repite todos los jueves, hasta el 31 de diciembre de 2026.',
      'Se repite todos los viernes, hasta el 31 de diciembre de 2026.',
    ]);
  });
});

describe('formatRepeticionDelDetalle', () => {
  it('says how a weekly series repeats', () => {
    expect(formatRepeticionDelDetalle('semanal', '2026-10-17')).toBe('Todos los sábados');
  });
});

describe('formatHasta', () => {
  it('says until when a series repeats', () => {
    expect(formatHasta('2027-10-17')).toBe('Hasta el 17 de octubre de 2027');
  });
});

describe('a monthly series', () => {
  it('repeats on the same weekday and position of each month, never on the same day number', () => {
    // 2026-10-17 is the third Saturday of October.
    expect(getFechasDeSerie('2026-10-17', 'mensual', '2027-01-31')).toEqual([
      '2026-10-17',
      '2026-11-21',
      '2026-12-19',
      '2027-01-16',
    ]);
  });

  it('knows the first, second and fourth positions', () => {
    expect(getFechasDeSerie('2026-10-03', 'mensual', '2026-12-31')).toEqual([
      '2026-10-03',
      '2026-11-07',
      '2026-12-05',
    ]);
    expect(getFechasDeSerie('2026-10-13', 'mensual', '2026-12-31')).toEqual([
      '2026-10-13',
      '2026-11-10',
      '2026-12-08',
    ]);
    expect(getFechasDeSerie('2026-10-24', 'mensual', '2026-12-31')).toEqual([
      '2026-10-24',
      '2026-11-28',
      '2026-12-26',
    ]);
  });

  it('takes a fifth weekday as the last one, in months of four and of five such weekdays', () => {
    // 2026-10-31 is the fifth Saturday of October. November has four Saturdays
    // (the last on the 28th) and January 2027 five (the last on the 30th).
    expect(getFechasDeSerie('2026-10-31', 'mensual', '2027-01-31')).toEqual([
      '2026-10-31',
      '2026-11-28',
      '2026-12-26',
      '2027-01-30',
    ]);
  });

  it('does not skip a month when the fifth one does not exist', () => {
    // The fifth Thursday of October 2026 is the 29th; February 2027 has four.
    const fechas = getFechasDeSerie('2026-10-29', 'mensual', '2027-03-31');

    expect(fechas).toEqual([
      '2026-10-29',
      '2026-11-26',
      '2026-12-31',
      '2027-01-28',
      '2027-02-25',
      '2027-03-25',
    ]);
  });

  it('leaves out a month whose date falls after "Hasta"', () => {
    expect(getFechasDeSerie('2026-10-17', 'mensual', '2026-12-18')).toEqual([
      '2026-10-17',
      '2026-11-21',
    ]);
  });

  it('has 13 dates in a year', () => {
    expect(getFechasDeSerie('2026-10-17', 'mensual', '2027-10-17')).toHaveLength(13);
  });

  it('is offered with the position of the fecha in words', () => {
    expect(getOpcionesDeRepeticion('2026-10-17')[2]).toEqual({
      repeticion: 'mensual',
      label: 'Cada mes, el tercer sábado',
    });
    expect(getOpcionesDeRepeticion('2026-10-01')[2].label).toBe('Cada mes, el primer jueves');
    expect(getOpcionesDeRepeticion('2026-10-31')[2].label).toBe('Cada mes, el último sábado');
  });

  it('is explained with words', () => {
    expect(formatFraseDeRepeticion('mensual', '2026-10-17', '2027-10-17')).toBe(
      'Se repite el tercer sábado de cada mes, hasta el 17 de octubre de 2027.',
    );
    expect(formatRepeticionDelDetalle('mensual', '2026-10-31')).toBe(
      'El último sábado de cada mes',
    );
  });
});
