import {
  decidirConsulta,
  getAvisoDeConsultasRestantes,
  LIMITE_DIARIO,
  PRESUPUESTO_MENSUAL_USD,
} from './limites';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

/** 15:00 of 2026-10-17 in Buenos Aires. */
const AHORA = new Date('2026-10-17T18:00:00Z');

const permitida = {
  ahora: AHORA,
  zonaHoraria: BUENOS_AIRES,
  consentimiento: true,
  consultas: { dia: '2026-10-17', cantidad: 0 },
  gasto: { mes: '2026-10-01', usd: 0 },
};

describe('the limits', () => {
  it('are 50 consultas a day and 20 USD a month', () => {
    expect(LIMITE_DIARIO).toBe(50);
    expect(PRESUPUESTO_MENSUAL_USD).toBe(20);
  });
});

describe('decidirConsulta', () => {
  it('allows a consulta within every limit', () => {
    expect(decidirConsulta(permitida)).toBe('permitida');
  });

  it('allows a usuario without counters yet', () => {
    expect(decidirConsulta({ ...permitida, consultas: null, gasto: null })).toBe('permitida');
  });

  it('allows the consulta 50 of the dia and rejects the 51', () => {
    expect(decidirConsulta({ ...permitida, consultas: { dia: '2026-10-17', cantidad: 49 } })).toBe(
      'permitida',
    );
    expect(decidirConsulta({ ...permitida, consultas: { dia: '2026-10-17', cantidad: 50 } })).toBe(
      'limite-diario',
    );
  });

  it('starts the count again at 00:00 of Buenos Aires, not of UTC', () => {
    const agotadas = { ...permitida, consultas: { dia: '2026-10-17', cantidad: 50 } };

    // 23:59 in Buenos Aires: already the 18th in UTC, still the 17th there.
    expect(decidirConsulta({ ...agotadas, ahora: new Date('2026-10-18T02:59:00Z') })).toBe(
      'limite-diario',
    );
    // 00:00 in Buenos Aires.
    expect(decidirConsulta({ ...agotadas, ahora: new Date('2026-10-18T03:00:00Z') })).toBe(
      'permitida',
    );
  });

  it('rejects when the gasto of the mes reached the presupuesto', () => {
    expect(decidirConsulta({ ...permitida, gasto: { mes: '2026-10-01', usd: 20 } })).toBe(
      'presupuesto-agotado',
    );
    expect(decidirConsulta({ ...permitida, gasto: { mes: '2026-10-01', usd: 19.99 } })).toBe(
      'permitida',
    );
  });

  it('allows again on the first day of the next mes, in the hora of the asociacion', () => {
    const agotado = { ...permitida, consultas: null, gasto: { mes: '2026-10-01', usd: 20 } };

    // 23:59 of October 31 in Buenos Aires, November in UTC.
    expect(decidirConsulta({ ...agotado, ahora: new Date('2026-11-01T02:59:00Z') })).toBe(
      'presupuesto-agotado',
    );
    expect(decidirConsulta({ ...agotado, ahora: new Date('2026-11-01T03:00:00Z') })).toBe(
      'permitida',
    );
  });

  it('rejects for the missing consentimiento before any limit', () => {
    expect(
      decidirConsulta({
        ...permitida,
        consentimiento: false,
        consultas: { dia: '2026-10-17', cantidad: 50 },
        gasto: { mes: '2026-10-01', usd: 20 },
      }),
    ).toBe('sin-consentimiento');
  });

  it('rejects for the limite diario before the presupuesto', () => {
    expect(
      decidirConsulta({
        ...permitida,
        consultas: { dia: '2026-10-17', cantidad: 50 },
        gasto: { mes: '2026-10-01', usd: 20 },
      }),
    ).toBe('limite-diario');
  });
});

describe('getAvisoDeConsultasRestantes', () => {
  it('says nothing while there is margin', () => {
    expect(getAvisoDeConsultasRestantes(0)).toBeNull();
    expect(getAvisoDeConsultasRestantes(44)).toBeNull();
  });

  it('warns from 45 consultas used', () => {
    expect(getAvisoDeConsultasRestantes(45)).toBe('Te quedan 5 consultas por hoy');
    expect(getAvisoDeConsultasRestantes(48)).toBe('Te quedan 2 consultas por hoy');
  });

  it('writes the last one in singular', () => {
    expect(getAvisoDeConsultasRestantes(49)).toBe('Te queda 1 consulta por hoy');
  });

  it('says nothing once none is left: the limit has its own message', () => {
    expect(getAvisoDeConsultasRestantes(50)).toBeNull();
  });
});
