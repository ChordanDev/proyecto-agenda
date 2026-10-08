import type { Evento } from '@/features/eventos/dominio/evento';

import { armarCalendario, type FechaDeEvento, type IglesiaEnEstructura } from './armarCalendario';

const cordobaCentral: IglesiaEnEstructura = {
  id: 'iglesia-cordoba-central',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};

function evento(overrides: Partial<Evento>): Evento {
  return {
    id: 'evento-' + (overrides.titulo ?? 'sin-titulo'),
    titulo: 'Culto de oración',
    lugar: null,
    descripcion: null,
    enfasis: null,
    duenio: { alcance: 'iglesia', iglesiaId: cordobaCentral.id },
    hora: '20:00:00',
    fechaFin: null,
    repeticion: 'ninguna',
    finDeSerie: null,
    iglesiasSumadas: [],
    ...overrides,
  };
}

function fecha(fechaLocal: string, overrides: Partial<Evento> = {}): FechaDeEvento {
  return { fecha: fechaLocal, evento: evento(overrides) };
}

const titulos = (fechas: FechaDeEvento[]) => fechas.map((f) => f.evento.titulo);

describe('armarCalendario', () => {
  describe('which eventos belong to the calendario of an iglesia', () => {
    it('includes an evento owned by the iglesia', () => {
      const propio = fecha('2026-10-07', { titulo: 'Culto de oración' });

      expect(armarCalendario(cordobaCentral, [propio])).toEqual([propio]);
    });

    it('includes an evento owned by the distrito of the iglesia', () => {
      const deSuDistrito = fecha('2026-10-24', {
        titulo: 'Encuentro de familias',
        duenio: { alcance: 'distrito', distritoId: 'distrito-centro' },
      });

      expect(armarCalendario(cordobaCentral, [deSuDistrito])).toEqual([deSuDistrito]);
    });

    it('includes an evento owned by the asociacion of the iglesia', () => {
      const deSuAsociacion = fecha('2026-10-30', {
        titulo: 'Congreso de Jóvenes',
        duenio: { alcance: 'asociacion', asociacionId: 'asociacion-central' },
      });

      expect(armarCalendario(cordobaCentral, [deSuAsociacion])).toEqual([deSuAsociacion]);
    });

    it('leaves out an evento owned by another iglesia, even of the same distrito', () => {
      const deOtraIglesia = fecha('2026-10-17', {
        titulo: 'Almuerzo de confraternidad',
        duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-nueva-cordoba' },
      });

      expect(armarCalendario(cordobaCentral, [deOtraIglesia])).toEqual([]);
    });

    it('leaves out an evento owned by another distrito', () => {
      const deOtroDistrito = fecha('2026-11-21', {
        titulo: 'Campamento de Conquistadores',
        duenio: { alcance: 'distrito', distritoId: 'distrito-norte' },
      });

      expect(armarCalendario(cordobaCentral, [deOtroDistrito])).toEqual([]);
    });

    it('leaves out an evento owned by another asociacion', () => {
      const deOtraAsociacion = fecha('2026-11-15', {
        titulo: 'Escuela de líderes',
        duenio: { alcance: 'asociacion', asociacionId: 'otra-asociacion' },
      });

      expect(armarCalendario(cordobaCentral, [deOtraAsociacion])).toEqual([]);
    });

    it('does not confuse the levels when their ids are equal', () => {
      const iglesia: IglesiaEnEstructura = { id: 'x', distritoId: 'y', asociacionId: 'z' };
      const fechas = [
        fecha('2026-10-01', { titulo: 'A', duenio: { alcance: 'iglesia', iglesiaId: 'y' } }),
        fecha('2026-10-01', { titulo: 'B', duenio: { alcance: 'distrito', distritoId: 'z' } }),
        fecha('2026-10-01', { titulo: 'C', duenio: { alcance: 'asociacion', asociacionId: 'x' } }),
      ];

      expect(armarCalendario(iglesia, fechas)).toEqual([]);
    });
  });

  describe('iglesias sumadas', () => {
    it('includes an evento outside the alcance when the iglesia is one of its iglesias sumadas', () => {
      const compartido = fecha('2026-12-19', {
        titulo: 'Concierto de Navidad',
        duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-arguello' },
        iglesiasSumadas: ['iglesia-villa-allende', cordobaCentral.id],
      });

      expect(armarCalendario(cordobaCentral, [compartido])).toEqual([compartido]);
    });

    it('leaves out an evento shared only with other iglesias', () => {
      const compartidoConOtras = fecha('2026-12-19', {
        titulo: 'Concierto de Navidad',
        duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-arguello' },
        iglesiasSumadas: ['iglesia-villa-allende'],
      });

      expect(armarCalendario(cordobaCentral, [compartidoConOtras])).toEqual([]);
    });

    it('shows once an evento that reaches the iglesia both as sumada and through its duenio', () => {
      const porDosCaminos = fecha('2026-11-21', {
        titulo: 'Campamento de Conquistadores',
        duenio: { alcance: 'distrito', distritoId: 'distrito-centro' },
        iglesiasSumadas: [cordobaCentral.id],
      });

      expect(armarCalendario(cordobaCentral, [porDosCaminos])).toEqual([porDosCaminos]);
    });
  });

  describe('duplicates', () => {
    it('collapses rows that repeat the same evento on the same date', () => {
      const culto = evento({ titulo: 'Culto de oración' });
      const fechas = [
        { fecha: '2026-10-07', evento: culto },
        { fecha: '2026-10-07', evento: { ...culto } },
        { fecha: '2026-10-07', evento: culto },
      ];

      expect(armarCalendario(cordobaCentral, fechas)).toEqual([
        { fecha: '2026-10-07', evento: culto },
      ]);
    });

    it('keeps every date of a series', () => {
      const culto = evento({
        titulo: 'Culto de oración',
        repeticion: 'semanal',
        finDeSerie: '2026-10-21',
      });
      const fechas = [
        { fecha: '2026-10-07', evento: culto },
        { fecha: '2026-10-14', evento: culto },
        { fecha: '2026-10-21', evento: culto },
      ];

      expect(armarCalendario(cordobaCentral, fechas)).toEqual(fechas);
    });

    it('keeps two different eventos that share date, hora and titulo', () => {
      const fechas = [
        fecha('2026-10-07', { id: 'evento-1', titulo: 'Culto de oración' }),
        fecha('2026-10-07', { id: 'evento-2', titulo: 'Culto de oración' }),
      ];

      expect(armarCalendario(cordobaCentral, fechas)).toHaveLength(2);
    });
  });

  describe('the structure decides', () => {
    const fechas = [
      fecha('2026-10-24', {
        titulo: 'Encuentro de familias',
        duenio: { alcance: 'distrito', distritoId: 'distrito-centro' },
      }),
      fecha('2026-11-21', {
        titulo: 'Campamento de Conquistadores',
        duenio: { alcance: 'distrito', distritoId: 'distrito-norte' },
      }),
      fecha('2026-11-07', {
        titulo: 'Día de ayuno y oración',
        duenio: { alcance: 'asociacion', asociacionId: 'asociacion-central' },
      }),
      fecha('2026-10-07', { titulo: 'Culto de oración' }),
    ];

    it('gives an iglesia the eventos of the distrito it belongs to now', () => {
      expect(titulos(armarCalendario(cordobaCentral, fechas))).toEqual([
        'Culto de oración',
        'Encuentro de familias',
        'Día de ayuno y oración',
      ]);
    });

    it('gives a moved iglesia the eventos of its new distrito and takes away those of the old one', () => {
      const movida = { ...cordobaCentral, distritoId: 'distrito-norte' };

      expect(titulos(armarCalendario(movida, fechas))).toEqual([
        'Culto de oración',
        'Día de ayuno y oración',
        'Campamento de Conquistadores',
      ]);
    });
  });

  describe('order', () => {
    it('orders by date', () => {
      const fechas = [
        fecha('2026-11-04', { titulo: 'Noviembre' }),
        fecha('2027-01-06', { titulo: 'Enero' }),
        fecha('2026-10-07', { titulo: 'Octubre' }),
        fecha('2026-12-02', { titulo: 'Diciembre' }),
      ];

      expect(titulos(armarCalendario(cordobaCentral, fechas))).toEqual([
        'Octubre',
        'Noviembre',
        'Diciembre',
        'Enero',
      ]);
    });

    it('orders the eventos of a day by hora', () => {
      const fechas = [
        fecha('2026-10-17', { titulo: 'Noche', hora: '20:00:00' }),
        fecha('2026-10-17', { titulo: 'Mañana', hora: '09:30:00' }),
        fecha('2026-10-17', { titulo: 'Tarde', hora: '16:00:00' }),
      ];

      expect(titulos(armarCalendario(cordobaCentral, fechas))).toEqual([
        'Mañana',
        'Tarde',
        'Noche',
      ]);
    });

    it('orders the eventos of the same date and hora by titulo', () => {
      const fechas = [
        fecha('2026-10-17', { titulo: 'Curso de discipulado', hora: '16:00:00' }),
        fecha('2026-10-17', { titulo: 'Almuerzo de confraternidad', hora: '16:00:00' }),
        fecha('2026-10-17', { titulo: 'Bautismo', hora: '16:00:00' }),
      ];

      expect(titulos(armarCalendario(cordobaCentral, fechas))).toEqual([
        'Almuerzo de confraternidad',
        'Bautismo',
        'Curso de discipulado',
      ]);
    });

    it('orders the titulos as Spanish text, so an accent does not send a word to the end', () => {
      const fechas = [
        fecha('2026-10-17', { titulo: 'Vigilia' }),
        fecha('2026-10-17', { titulo: 'Última cena' }),
        fecha('2026-10-17', { titulo: 'Bautismo' }),
      ];

      expect(titulos(armarCalendario(cordobaCentral, fechas))).toEqual([
        'Bautismo',
        'Última cena',
        'Vigilia',
      ]);
    });

    it('applies date before hora, and hora before titulo', () => {
      const fechas = [
        fecha('2026-10-18', { titulo: 'A', hora: '08:00:00' }),
        fecha('2026-10-17', { titulo: 'B', hora: '20:00:00' }),
        fecha('2026-10-17', { titulo: 'Z', hora: '09:00:00' }),
      ];

      expect(titulos(armarCalendario(cordobaCentral, fechas))).toEqual(['Z', 'B', 'A']);
    });
  });

  it('returns an empty calendario when there are no dates', () => {
    expect(armarCalendario(cordobaCentral, [])).toEqual([]);
  });

  it('does not modify the list it receives', () => {
    const fechas = [
      fecha('2026-11-04', { titulo: 'Segundo' }),
      fecha('2026-10-07', { titulo: 'Primero' }),
      fecha('2026-10-07', { titulo: 'Primero' }),
      fecha('2026-10-17', {
        titulo: 'De otra iglesia',
        duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-nueva-cordoba' },
      }),
    ];
    const copy = [...fechas];

    armarCalendario(cordobaCentral, fechas);

    expect(fechas).toEqual(copy);
    expect(titulos(fechas)).toEqual(['Segundo', 'Primero', 'Primero', 'De otra iglesia']);
  });
});
