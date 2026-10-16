import { debePreguntarPorFechaPasada, getTextoDeFechaPasada, isFechaPasada } from './fechaPasada';

/** Today, by the clock of the phone: the rules receive it. */
const HOY = '2026-10-16';

describe('isFechaPasada', () => {
  it('tells a fecha before today', () => {
    expect(isFechaPasada('2026-10-15', HOY)).toBe(true);
    expect(isFechaPasada('2026-09-01', HOY)).toBe(true);
    expect(isFechaPasada('2025-12-31', HOY)).toBe(true);
  });

  it('says nothing of today or a fecha after it', () => {
    expect(isFechaPasada('2026-10-16', HOY)).toBe(false);
    expect(isFechaPasada('2026-10-17', HOY)).toBe(false);
    expect(isFechaPasada('2027-01-01', HOY)).toBe(false);
  });
});

describe('debePreguntarPorFechaPasada', () => {
  it('asks when a new evento starts before today', () => {
    expect(
      debePreguntarPorFechaPasada({ fecha: '2026-09-01', fechaOriginal: null, hoy: HOY }),
    ).toBe(true);
  });

  it('does not ask when a new evento starts today or later', () => {
    expect(debePreguntarPorFechaPasada({ fecha: HOY, fechaOriginal: null, hoy: HOY })).toBe(false);
    expect(
      debePreguntarPorFechaPasada({ fecha: '2026-10-20', fechaOriginal: null, hoy: HOY }),
    ).toBe(false);
  });

  it('does not ask when an evento that already passed is edited without changing its fecha', () => {
    expect(
      debePreguntarPorFechaPasada({ fecha: '2026-09-01', fechaOriginal: '2026-09-01', hoy: HOY }),
    ).toBe(false);
  });

  it('asks when editing changes the fecha to another one that already passed', () => {
    expect(
      debePreguntarPorFechaPasada({ fecha: '2026-09-08', fechaOriginal: '2026-09-01', hoy: HOY }),
    ).toBe(true);
    expect(
      debePreguntarPorFechaPasada({ fecha: '2026-09-08', fechaOriginal: '2026-10-20', hoy: HOY }),
    ).toBe(true);
  });

  it('does not ask when editing moves the fecha to today or later', () => {
    expect(
      debePreguntarPorFechaPasada({ fecha: '2026-10-20', fechaOriginal: '2026-09-01', hoy: HOY }),
    ).toBe(false);
  });
});

describe('getTextoDeFechaPasada', () => {
  it('writes the whole fecha in the question', () => {
    expect(getTextoDeFechaPasada('2026-09-01', HOY)).toBe(
      'El evento es el martes 1 de septiembre, que ya pasó. ¿Querés cargarlo igual?',
    );
  });

  it('adds the year when it is not the current one', () => {
    expect(getTextoDeFechaPasada('2025-12-31', HOY)).toBe(
      'El evento es el miércoles 31 de diciembre de 2025, que ya pasó. ¿Querés cargarlo igual?',
    );
  });
});
