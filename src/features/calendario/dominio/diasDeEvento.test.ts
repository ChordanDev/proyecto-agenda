import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';
import { expandirDias } from './diasDeEvento';

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

const days = (fechas: FechaDeEvento[]) =>
  expandirDias(fechas).map(({ fecha: dia, diaDelRango }) => [dia, diaDelRango]);

describe('expandirDias', () => {
  it('leaves an evento of one day on its date, with no "Día N de M"', () => {
    expect(days([fecha('2026-10-10')])).toEqual([['2026-10-10', null]]);
  });

  it('marks an evento of several days on each day of the range, saying which day it is', () => {
    expect(days([fecha('2026-10-30', { fechaFin: '2026-11-01' })])).toEqual([
      ['2026-10-30', { numero: 1, total: 3 }],
      ['2026-10-31', { numero: 2, total: 3 }],
      ['2026-11-01', { numero: 3, total: 3 }],
    ]);
  });

  it('keeps the evento of every day of the range', () => {
    const congreso = fecha('2026-10-30', { fechaFin: '2026-10-31' });

    expect(expandirDias([congreso]).map(({ evento }) => evento)).toEqual([
      congreso.evento,
      congreso.evento,
    ]);
  });

  it('takes an end on the first day as an evento of one day', () => {
    expect(days([fecha('2026-10-30', { fechaFin: '2026-10-30' })])).toEqual([['2026-10-30', null]]);
  });

  it('ignores an end before the start instead of losing the evento', () => {
    expect(days([fecha('2026-10-30', { fechaFin: '2026-10-29' })])).toEqual([['2026-10-30', null]]);
  });

  it('expands each evento of the list', () => {
    expect(
      days([
        fecha('2026-10-10', { titulo: 'Culto' }),
        fecha('2026-10-11', { titulo: 'Retiro', fechaFin: '2026-10-12' }),
      ]),
    ).toEqual([
      ['2026-10-10', null],
      ['2026-10-11', { numero: 1, total: 2 }],
      ['2026-10-12', { numero: 2, total: 2 }],
    ]);
  });
});
