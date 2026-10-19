import type { Evento } from '@/features/eventos/dominio/evento';

import type { IglesiaEnEstructura } from './armarCalendario';
import {
  formatActualizado,
  formatDayHeading,
  formatEventosCount,
  formatLongDate,
  formatMonthTitle,
  formatTime,
  formatTimeAndPlace,
  formatTimeAndPlaceDelDia,
  getAlcanceLabel,
  getEtiquetaDelEvento,
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

describe('formatActualizado', () => {
  // Dates in the local time of the phone, as the user reads them.
  const now = new Date(2026, 9, 6, 20, 15);

  it('says "hoy" for a download of today', () => {
    expect(formatActualizado(new Date(2026, 9, 6, 18, 40), now)).toBe(
      'Actualizado hoy a las 18:40.',
    );
  });

  it('says "ayer" for a download of yesterday, across a month', () => {
    expect(formatActualizado(new Date(2026, 8, 30, 9, 5), new Date(2026, 9, 1, 8, 0))).toBe(
      'Actualizado ayer a las 09:05.',
    );
  });

  it('writes the weekday and the date for an older download', () => {
    expect(formatActualizado(new Date(2026, 9, 3, 7, 30), now)).toBe(
      'Actualizado el sábado 3 de octubre a las 07:30.',
    );
  });
});

describe('formatTimeAndPlaceDelDia', () => {
  const evento = { hora: '19:00:00', lugar: 'Villa Carlos Paz' };

  it('is the hora and lugar of an evento of one day', () => {
    expect(formatTimeAndPlaceDelDia(evento, null)).toBe('19:00 · Villa Carlos Paz');
  });

  it('tells the first day of an evento of several days, with the hora it starts', () => {
    expect(formatTimeAndPlaceDelDia(evento, { numero: 1, total: 3 })).toBe(
      'Día 1 de 3 · 19:00 · Villa Carlos Paz',
    );
  });

  it('tells the other days without the hora, which belongs to the first one', () => {
    expect(formatTimeAndPlaceDelDia(evento, { numero: 2, total: 3 })).toBe(
      'Día 2 de 3 · Villa Carlos Paz',
    );
    expect(formatTimeAndPlaceDelDia({ ...evento, lugar: null }, { numero: 3, total: 3 })).toBe(
      'Día 3 de 3',
    );
  });
});

describe('formatLongDate', () => {
  it('writes the day, the month and the year', () => {
    expect(formatLongDate('2027-10-17')).toBe('17 de octubre de 2027');
    expect(formatLongDate('2027-01-01')).toBe('1 de enero de 2027');
  });
});

describe('getEtiquetaDelEvento', () => {
  const central: IglesiaEnEstructura = {
    id: 'iglesia-central',
    distritoId: 'distrito-norte',
    asociacionId: 'asociacion-central',
  };
  const norte: IglesiaEnEstructura = {
    id: 'iglesia-norte',
    distritoId: 'distrito-sur',
    asociacionId: 'asociacion-central',
  };
  const nombres = {
    iglesias: { 'iglesia-central': 'Central' },
    distritos: { 'distrito-norte': 'Distrito Norte' },
    sumadas: {},
  };

  function evento(overrides: Partial<Evento>): Evento {
    return {
      id: 'evento-1',
      titulo: 'Sociedad de jóvenes',
      lugar: null,
      lugarId: null,
      descripcion: null,
      enfasis: null,
      duenio: { alcance: 'iglesia', iglesiaId: central.id },
      hora: '19:00:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      iglesiasSumadas: [],
      ...overrides,
    };
  }

  it('gives no label to an evento of the iglesia that is not shared', () => {
    expect(getEtiquetaDelEvento(evento({}), [central], nombres)).toBeNull();
  });

  it('tells the calendario of the duenio how many iglesias it is shared with', () => {
    const compartido = evento({ iglesiasSumadas: [norte.id, 'iglesia-sur', 'iglesia-este'] });

    expect(getEtiquetaDelEvento(compartido, [central], nombres)).toBe('Compartido con 3 iglesias');
  });

  it('says "1 iglesia" when it is shared with one', () => {
    const compartido = evento({ iglesiasSumadas: [norte.id] });

    expect(getEtiquetaDelEvento(compartido, [central], nombres)).toBe('Compartido con 1 iglesia');
  });

  it('tells the iglesia sumada who shares it with her', () => {
    const compartido = evento({ iglesiasSumadas: [norte.id] });

    expect(getEtiquetaDelEvento(compartido, [norte], nombres)).toBe(
      'Compartido por Iglesia Central',
    );
  });

  it('names the distrito that shares an evento of its own', () => {
    const delDistrito = evento({
      duenio: { alcance: 'distrito', distritoId: 'distrito-norte' },
      iglesiasSumadas: [norte.id],
    });

    expect(getEtiquetaDelEvento(delDistrito, [norte], nombres)).toBe(
      'Compartido por Distrito Norte',
    );
  });

  it('keeps the distrito and adds how many iglesias it is shared with for its own iglesias', () => {
    const delDistrito = evento({
      duenio: { alcance: 'distrito', distritoId: 'distrito-norte' },
      iglesiasSumadas: [norte.id],
    });

    expect(getEtiquetaDelEvento(delDistrito, [central], nombres)).toBe(
      'Distrito Norte · Compartido con 1 iglesia',
    );
  });

  it('gives no shared label when the iglesia sumada also sees the evento by its alcance', () => {
    // Norte moved to the distrito that owns the evento.
    const mudada = { ...norte, distritoId: 'distrito-norte' };
    const delDistrito = evento({
      duenio: { alcance: 'distrito', distritoId: 'distrito-norte' },
      iglesiasSumadas: [norte.id],
    });

    expect(getEtiquetaDelEvento(delDistrito, [mudada], nombres)).toBe('Distrito Norte');
  });

  it('does not count an iglesia sumada outside the calendario that now sees it by its alcance', () => {
    // Norte moved to the distrito that owns the evento; Central looks at it.
    const delDistrito = evento({
      duenio: { alcance: 'distrito', distritoId: 'distrito-norte' },
      iglesiasSumadas: [norte.id, 'iglesia-sur'],
    });
    const conSumadas = {
      ...nombres,
      sumadas: {
        [norte.id]: { ...norte, distritoId: 'distrito-norte' },
        'iglesia-sur': {
          id: 'iglesia-sur',
          distritoId: 'distrito-sur',
          asociacionId: 'asociacion-central',
        },
      },
    };

    expect(getEtiquetaDelEvento(delDistrito, [central], conSumadas)).toBe(
      'Distrito Norte · Compartido con 1 iglesia',
    );
    expect(
      getEtiquetaDelEvento({ ...delDistrito, iglesiasSumadas: [norte.id] }, [central], conSumadas),
    ).toBe('Distrito Norte');
  });

  it('counts an iglesia sumada of the calendario of a pastor that also covers the duenio', () => {
    const compartido = evento({ iglesiasSumadas: [norte.id] });

    expect(getEtiquetaDelEvento(compartido, [central, norte], nombres)).toBe(
      'Compartido con 1 iglesia',
    );
  });

  it('says "Iglesia" when the nombre of the iglesia that shares it is not known', () => {
    const compartido = evento({
      duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-oeste' },
      iglesiasSumadas: [norte.id],
    });

    expect(getEtiquetaDelEvento(compartido, [norte], nombres)).toBe('Compartido por Iglesia');
  });
});
