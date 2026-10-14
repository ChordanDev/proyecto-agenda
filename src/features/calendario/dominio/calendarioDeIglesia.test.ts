import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';
import { armarCalendarioDeIglesia, type IglesiaConNombres } from './calendarioDeIglesia';

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
      armarCalendarioDeIglesia(cordobaCentral, [propio], { 'distrito-centro': 'Distrito Centro' }),
    ).toEqual({
      iglesia: { nombre: 'Córdoba Central', distrito: 'Distrito Centro' },
      fechas: [propio],
      nombresDeDistritos: { 'distrito-centro': 'Distrito Centro' },
    });
  });

  it('keeps only the dates that belong to the iglesia', () => {
    const ajeno = fecha('2026-10-17', 'Almuerzo', {
      duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-nueva-cordoba' },
    });

    expect(armarCalendarioDeIglesia(cordobaCentral, [ajeno], {}).fechas).toEqual([]);
  });

  it('signals an iglesia that does not exist with a null iglesia and an empty calendario', () => {
    expect(armarCalendarioDeIglesia(null, [fecha('2026-10-07', 'Culto')], { a: 'b' })).toEqual({
      iglesia: null,
      fechas: [],
      nombresDeDistritos: {},
    });
  });
});
