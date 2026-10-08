import { CATEGORIAS, getCategoria, getLema } from './categoria';

describe('getCategoria', () => {
  it('gives each enfasis its key of the design', () => {
    expect(getCategoria('identidad')).toBe('S');
    expect(getCategoria('liderazgo')).toBe('F');
    expect(getCategoria('nuevas_generaciones')).toBe('I');
    expect(getCategoria('discipulado')).toBe('H');
  });

  it('gives an evento without enfasis the key of the actividad regular', () => {
    expect(getCategoria(null)).toBe('R');
  });
});

describe('CATEGORIAS', () => {
  it('lists the four enfasis and then the actividad regular, in the order of the design', () => {
    expect(CATEGORIAS).toEqual(['S', 'F', 'I', 'H', 'R']);
  });
});

describe('getLema', () => {
  it('gives the lema of each enfasis', () => {
    expect(getLema('identidad')).toBe('Somos');
    expect(getLema('liderazgo')).toBe('Formamos');
    expect(getLema('nuevas_generaciones')).toBe('Integramos');
    expect(getLema('discipulado')).toBe('Hacemos');
  });

  it('names the actividad regular, which has no lema', () => {
    expect(getLema(null)).toBe('Actividad regular');
  });
});
