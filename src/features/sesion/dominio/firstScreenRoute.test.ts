import { firstScreenRoute } from './firstScreenRoute';

describe('firstScreenRoute', () => {
  it('maps the bienvenida to its route', () => {
    expect(firstScreenRoute('bienvenida')).toBe('/bienvenida');
  });

  it('maps the calendario to its route', () => {
    expect(firstScreenRoute('calendario')).toBe('/calendario');
  });
});
