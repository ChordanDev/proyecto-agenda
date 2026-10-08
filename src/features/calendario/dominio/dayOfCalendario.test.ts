import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';
import { getDayMarkers, getEventosOfDay } from './dayOfCalendario';

function fecha(fechaLocal: string, overrides: Partial<Evento> = {}): FechaDeEvento {
  return {
    fecha: fechaLocal,
    evento: {
      id: 'evento-' + (overrides.titulo ?? 'sin-titulo'),
      titulo: 'Culto de oración',
      lugar: null,
      descripcion: null,
      enfasis: null,
      duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-cordoba-central' },
      hora: '20:00:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      iglesiasSumadas: [],
      ...overrides,
    },
  };
}

const titulos = (eventos: Evento[]) => eventos.map((evento) => evento.titulo);

describe('getEventosOfDay', () => {
  it('gives the eventos of that day and leaves out those of the other days', () => {
    const calendario = [
      fecha('2026-10-09', { titulo: 'Vigilia' }),
      fecha('2026-10-10', { titulo: 'Escuela Sabática' }),
      fecha('2026-10-11', { titulo: 'Club de Conquistadores' }),
    ];

    expect(titulos(getEventosOfDay(calendario, '2026-10-10'))).toEqual(['Escuela Sabática']);
  });

  it('keeps the order of the calendario, which is already ordered by hora', () => {
    const calendario = [
      fecha('2026-10-10', { titulo: 'Escuela Sabática', hora: '09:30:00' }),
      fecha('2026-10-10', { titulo: 'Bautismos', hora: '11:00:00' }),
      fecha('2026-10-10', { titulo: 'Sociedad de jóvenes', hora: '19:00:00' }),
    ];

    expect(titulos(getEventosOfDay(calendario, '2026-10-10'))).toEqual([
      'Escuela Sabática',
      'Bautismos',
      'Sociedad de jóvenes',
    ]);
  });

  it('gives a date of a series only on its own day', () => {
    const culto = fecha('2026-10-07', { titulo: 'Culto de oración', repeticion: 'semanal' });
    const calendario = [culto, { ...culto, fecha: '2026-10-14' }];

    expect(getEventosOfDay(calendario, '2026-10-14')).toEqual([culto.evento]);
    expect(getEventosOfDay(calendario, '2026-10-08')).toEqual([]);
  });

  it('shows an evento of several days on its first day only', () => {
    const congreso = fecha('2026-10-24', { titulo: 'Congreso', fechaFin: '2026-10-25' });

    expect(getEventosOfDay([congreso], '2026-10-24')).toEqual([congreso.evento]);
    expect(getEventosOfDay([congreso], '2026-10-25')).toEqual([]);
  });

  it('gives nothing for a day without eventos', () => {
    expect(getEventosOfDay([], '2026-10-10')).toEqual([]);
  });
});

describe('getDayMarkers', () => {
  it('gives the marker of the enfasis of the evento of that day', () => {
    const calendario = [fecha('2026-10-03', { titulo: 'Santa Cena', enfasis: 'identidad' })];

    expect(getDayMarkers(calendario, '2026-10-03')).toEqual(['S']);
  });

  it('gives the marker of the actividad regular to an evento without enfasis', () => {
    const calendario = [fecha('2026-10-07', { titulo: 'Culto de oración', enfasis: null })];

    expect(getDayMarkers(calendario, '2026-10-07')).toEqual(['R']);
  });

  it('gives one marker to several eventos of the same enfasis', () => {
    const calendario = [
      fecha('2026-10-17', { titulo: 'Culto joven', enfasis: 'nuevas_generaciones' }),
      fecha('2026-10-17', { titulo: 'Club de Aventureros', enfasis: 'nuevas_generaciones' }),
      fecha('2026-10-17', { titulo: 'Sociedad de jóvenes', enfasis: 'nuevas_generaciones' }),
    ];

    expect(getDayMarkers(calendario, '2026-10-17')).toEqual(['I']);
  });

  it('gives the five markers in the order of the design, whatever the order of the eventos', () => {
    const calendario = [
      fecha('2026-10-10', { titulo: 'Escuela Sabática', enfasis: null }),
      fecha('2026-10-10', { titulo: 'Bautismos', enfasis: 'discipulado' }),
      fecha('2026-10-10', { titulo: 'Sociedad de jóvenes', enfasis: 'nuevas_generaciones' }),
      fecha('2026-10-10', { titulo: 'Escuela de líderes', enfasis: 'liderazgo' }),
      fecha('2026-10-10', { titulo: 'Santa Cena', enfasis: 'identidad' }),
      fecha('2026-10-10', { titulo: 'Culto de oración', enfasis: null }),
    ];

    expect(getDayMarkers(calendario, '2026-10-10')).toEqual(['S', 'F', 'I', 'H', 'R']);
  });

  it('does not count the eventos of the other days', () => {
    const calendario = [
      fecha('2026-10-09', { titulo: 'Vigilia', enfasis: 'identidad' }),
      fecha('2026-10-10', { titulo: 'Bautismos', enfasis: 'discipulado' }),
    ];

    expect(getDayMarkers(calendario, '2026-10-10')).toEqual(['H']);
  });

  it('gives no marker to a day without eventos', () => {
    expect(getDayMarkers([], '2026-10-06')).toEqual([]);
  });
});
