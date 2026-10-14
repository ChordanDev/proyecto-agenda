import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento, IglesiaEnEstructura } from './armarCalendario';
import {
  filterFechasByIglesia,
  getIglesiaSeleccionada,
  hasFiltroDeIglesia,
} from './filtroDeIglesia';

const central: IglesiaEnEstructura = {
  id: 'iglesia-central',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};
const barrioNorte: IglesiaEnEstructura = {
  id: 'iglesia-barrio-norte',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};
const iglesias = [central, barrioNorte];

function fecha(titulo: string, overrides: Partial<Evento> = {}): FechaDeEvento {
  return {
    fecha: '2026-10-10',
    evento: {
      id: 'evento-' + titulo,
      titulo,
      lugar: null,
      descripcion: null,
      enfasis: null,
      duenio: { alcance: 'iglesia', iglesiaId: central.id },
      hora: '10:00:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      iglesiasSumadas: [],
      ...overrides,
    },
  };
}

const deCentral = fecha('Santa Cena');
const deBarrioNorte = fecha('Día de la identidad', {
  duenio: { alcance: 'iglesia', iglesiaId: barrioNorte.id },
});
const delDistrito = fecha('Escuela de líderes', {
  duenio: { alcance: 'distrito', distritoId: 'distrito-norte' },
});
const deLaAsociacion = fecha('Congreso de Jóvenes', {
  duenio: { alcance: 'asociacion', asociacionId: 'asociacion-central' },
});
const compartidoConCentral = fecha('Sociedad de jóvenes', {
  duenio: { alcance: 'iglesia', iglesiaId: barrioNorte.id },
  iglesiasSumadas: [central.id],
});
const fechas = [deCentral, deBarrioNorte, delDistrito, deLaAsociacion, compartidoConCentral];
const titulos = (result: FechaDeEvento[]) => result.map(({ evento }) => evento.titulo).sort();

describe('hasFiltroDeIglesia', () => {
  it('shows the filter when the cargos cover more than one iglesia', () => {
    expect(hasFiltroDeIglesia(iglesias)).toBe(true);
  });

  it('hides the filter when the cargos cover a single iglesia', () => {
    expect(hasFiltroDeIglesia([central])).toBe(false);
  });
});

describe('filterFechasByIglesia', () => {
  it('keeps every fecha with "Todas" selected', () => {
    expect(filterFechasByIglesia(fechas, iglesias, null)).toEqual(fechas);
  });

  it('keeps the calendario of the selected iglesia: its own eventos, those of its distrito and asociacion, and those shared with it', () => {
    expect(titulos(filterFechasByIglesia(fechas, iglesias, central.id))).toEqual(
      titulos([deCentral, delDistrito, deLaAsociacion, compartidoConCentral]),
    );
  });

  it('leaves out the eventos of the other iglesias of the distrito', () => {
    expect(titulos(filterFechasByIglesia(fechas, iglesias, barrioNorte.id))).toEqual(
      titulos([deBarrioNorte, delDistrito, deLaAsociacion, compartidoConCentral]),
    );
  });

  it('keeps every fecha when the selected iglesia is no longer covered', () => {
    expect(filterFechasByIglesia(fechas, [barrioNorte], central.id)).toEqual(fechas);
  });
});

describe('getIglesiaSeleccionada', () => {
  it('keeps the selected iglesia while the cargos cover it', () => {
    expect(getIglesiaSeleccionada(iglesias, central.id)).toBe(central.id);
  });

  it('is "Todas" when the selected iglesia is no longer covered', () => {
    expect(getIglesiaSeleccionada([barrioNorte], central.id)).toBeNull();
  });

  it('stays "Todas" when nothing is selected', () => {
    expect(getIglesiaSeleccionada(iglesias, null)).toBeNull();
  });
});
