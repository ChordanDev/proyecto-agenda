import { CATEGORIAS } from '@/features/eventos/dominio/categoria';
import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento } from './armarCalendario';
import {
  countHiddenCategorias,
  filterFechasByCategorias,
  formatFiltroSummary,
  toggleCategoria,
} from './filtroDeCategorias';

function fecha(titulo: string, enfasis: Evento['enfasis']): FechaDeEvento {
  return {
    fecha: '2026-10-10',
    evento: {
      id: 'evento-' + titulo,
      titulo,
      lugar: null,
      descripcion: null,
      enfasis,
      duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-cordoba-central' },
      hora: '20:00:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      iglesiasSumadas: [],
    },
  };
}

const fechas = [
  fecha('Identidad', 'identidad'),
  fecha('Liderazgo', 'liderazgo'),
  fecha('Generaciones', 'nuevas_generaciones'),
  fecha('Discipulado', 'discipulado'),
  fecha('Regular', null),
];
const titulos = (result: FechaDeEvento[]) => result.map(({ evento }) => evento.titulo);

describe('filterFechasByCategorias', () => {
  it('keeps every fecha when all the options are selected', () => {
    expect(titulos(filterFechasByCategorias(fechas, CATEGORIAS))).toEqual([
      'Identidad',
      'Liderazgo',
      'Generaciones',
      'Discipulado',
      'Regular',
    ]);
  });

  it('keeps only the eventos of the selected enfasis', () => {
    expect(titulos(filterFechasByCategorias(fechas, ['S', 'H']))).toEqual([
      'Identidad',
      'Discipulado',
    ]);
  });

  it('matches the eventos without enfasis with the actividad regular', () => {
    expect(titulos(filterFechasByCategorias(fechas, ['R']))).toEqual(['Regular']);
  });

  it('leaves the actividad regular out when it is not selected', () => {
    expect(titulos(filterFechasByCategorias(fechas, ['S', 'F', 'I', 'H']))).not.toContain(
      'Regular',
    );
  });

  it('shows nothing when nothing is selected, as the design says "Nada seleccionado"', () => {
    expect(filterFechasByCategorias(fechas, [])).toEqual([]);
  });

  it('keeps the order of the fechas', () => {
    expect(titulos(filterFechasByCategorias(fechas, ['R', 'S']))).toEqual(['Identidad', 'Regular']);
  });
});

describe('toggleCategoria', () => {
  it('removes a selected option', () => {
    expect(toggleCategoria(CATEGORIAS, 'F')).toEqual(['S', 'I', 'H', 'R']);
  });

  it('adds an option back in the order of the design', () => {
    expect(toggleCategoria(['S', 'R'], 'H')).toEqual(['S', 'H', 'R']);
  });
});

describe('countHiddenCategorias', () => {
  it('counts the options that are not selected', () => {
    expect(countHiddenCategorias(CATEGORIAS)).toBe(0);
    expect(countHiddenCategorias(['S', 'R'])).toBe(3);
    expect(countHiddenCategorias([])).toBe(5);
  });
});

describe('formatFiltroSummary', () => {
  it('says everything is shown when all the options are selected', () => {
    expect(formatFiltroSummary(CATEGORIAS)).toBe('Mostrando todo');
  });

  it('lists the lemas of the selected options', () => {
    expect(formatFiltroSummary(['S', 'R'])).toBe('Mostrando: Somos, Actividad regular');
  });

  it('says nothing is selected when no option is', () => {
    expect(formatFiltroSummary([])).toBe('Nada seleccionado');
  });
});
