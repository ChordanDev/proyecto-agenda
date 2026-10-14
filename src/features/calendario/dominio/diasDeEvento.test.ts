import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';
import { getDiaDelEvento } from './diasDeEvento';
import { daysBetween } from './localDate';

function fecha(fechaLocal: string, overrides: Partial<Evento> = {}): FechaDeEvento {
  return {
    fecha: fechaLocal,
    evento: {
      id: 'evento-' + (overrides.titulo ?? 'sin-titulo'),
      titulo: 'Congreso de Jóvenes',
      lugar: null,
      descripcion: null,
      enfasis: 'nuevas_generaciones',
      duenio: { alcance: 'asociacion', asociacionId: 'a1' },
      hora: '19:00:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      iglesiasSumadas: [],
      ...overrides,
    },
  };
}

describe('getDiaDelEvento', () => {
  it('puts an evento of one day on its date only, with no "Día N de M"', () => {
    expect(getDiaDelEvento(fecha('2026-10-10'), '2026-10-10')).toEqual({ diaDelRango: null });
    expect(getDiaDelEvento(fecha('2026-10-10'), '2026-10-11')).toBeUndefined();
  });

  it('puts an evento of several days on each day of its range, saying which day it is', () => {
    const congreso = fecha('2026-10-30', { fechaFin: '2026-11-01' });

    expect(getDiaDelEvento(congreso, '2026-10-30')).toEqual({
      diaDelRango: { numero: 1, total: 3 },
    });
    expect(getDiaDelEvento(congreso, '2026-10-31')).toEqual({
      diaDelRango: { numero: 2, total: 3 },
    });
    expect(getDiaDelEvento(congreso, '2026-11-01')).toEqual({
      diaDelRango: { numero: 3, total: 3 },
    });
  });

  it('leaves out the days before and after the range', () => {
    const congreso = fecha('2026-10-30', { fechaFin: '2026-11-01' });

    expect(getDiaDelEvento(congreso, '2026-10-29')).toBeUndefined();
    expect(getDiaDelEvento(congreso, '2026-11-02')).toBeUndefined();
  });

  it('takes an end on the first day as an evento of one day', () => {
    expect(getDiaDelEvento(fecha('2026-10-30', { fechaFin: '2026-10-30' }), '2026-10-30')).toEqual({
      diaDelRango: null,
    });
  });

  it('ignores an end before the start instead of losing the evento', () => {
    const roto = fecha('2026-10-30', { fechaFin: '2026-10-29' });

    expect(getDiaDelEvento(roto, '2026-10-30')).toEqual({ diaDelRango: null });
    expect(getDiaDelEvento(roto, '2026-10-29')).toBeUndefined();
  });

  it('counts the days of a range of any length without building them', () => {
    const sinFin = fecha('2026-10-01', { fechaFin: '9999-12-31' });

    expect(getDiaDelEvento(sinFin, '2026-11-15')).toEqual({
      diaDelRango: { numero: 46, total: daysBetween('2026-10-01', '9999-12-31') + 1 },
    });
  });
});
