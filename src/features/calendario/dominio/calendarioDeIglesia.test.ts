import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';
import { armarCalendarioDeIglesia, type IglesiaConNombres } from './calendarioDeIglesia';
import { getEventosDelDia } from './dayOfCalendario';

const SIN_NOMBRES = { distritos: {}, iglesias: {} };

const cordobaCentral: IglesiaConNombres = {
  id: 'iglesia-cordoba-central',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
  nombre: 'Córdoba Central',
  distrito: 'Distrito Centro',
};

function fecha(fechaLocal: string, titulo: string, overrides: Partial<Evento> = {}): FechaDeEvento {
  return {
    fecha: fechaLocal,
    evento: {
      id: 'evento-' + titulo,
      titulo,
      lugar: null,
      lugarId: null,
      descripcion: null,
      enfasis: null,
      duenio: { alcance: 'iglesia', iglesiaId: cordobaCentral.id },
      hora: '20:00:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      iglesiasSumadas: [],
      ...overrides,
    },
  };
}

describe('armarCalendarioDeIglesia', () => {
  it('returns the nombre and distrito of the iglesia with its calendario', () => {
    const propio = fecha('2026-10-07', 'Culto de oración');

    expect(
      armarCalendarioDeIglesia(cordobaCentral, [propio], {
        distritos: { 'distrito-centro': 'Distrito Centro' },
        iglesias: {},
      }),
    ).toEqual({
      iglesia: { nombre: 'Córdoba Central', distrito: 'Distrito Centro' },
      fechas: [propio],
      nombresDeDistritos: { 'distrito-centro': 'Distrito Centro' },
      etiquetas: {},
    });
  });

  it('keeps only the dates that belong to the iglesia', () => {
    const ajeno = fecha('2026-10-17', 'Almuerzo', {
      duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-nueva-cordoba' },
    });

    expect(armarCalendarioDeIglesia(cordobaCentral, [ajeno], SIN_NOMBRES).fechas).toEqual([]);
  });

  it('signals an iglesia that does not exist with a null iglesia and an empty calendario', () => {
    expect(
      armarCalendarioDeIglesia(null, [fecha('2026-10-07', 'Culto')], {
        distritos: { a: 'b' },
        iglesias: {},
      }),
    ).toEqual({ iglesia: null, fechas: [], nombresDeDistritos: {}, etiquetas: {} });
  });

  it('labels the eventos shared with the iglesia by who shares them', () => {
    const sumado = fecha('2026-10-10', 'Sociedad de jóvenes', {
      duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-barrio-norte' },
      iglesiasSumadas: [cordobaCentral.id],
    });

    expect(
      armarCalendarioDeIglesia(cordobaCentral, [sumado], {
        distritos: {},
        iglesias: { 'iglesia-barrio-norte': 'Barrio Norte' },
      }).etiquetas,
    ).toEqual({ [sumado.evento.id]: 'Compartido por Iglesia Barrio Norte' });
  });

  it('shows once, with no shared label, an evento sumado that the iglesia also sees by its alcance', () => {
    // The iglesia was sumada to an evento of another distrito, then moved to it.
    const delDistrito = fecha('2026-10-10', 'Escuela de líderes', {
      duenio: { alcance: 'distrito', distritoId: 'distrito-centro' },
      iglesiasSumadas: [cordobaCentral.id],
    });
    const calendario = armarCalendarioDeIglesia(cordobaCentral, [delDistrito, delDistrito], {
      distritos: { 'distrito-centro': 'Distrito Centro' },
      iglesias: {},
    });

    expect(getEventosDelDia(calendario.fechas, '2026-10-10')).toHaveLength(1);
    expect(calendario.etiquetas).toEqual({ [delDistrito.evento.id]: 'Distrito Centro' });
  });
});
