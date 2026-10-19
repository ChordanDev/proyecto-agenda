import { distanciaEnMetros, formatDistancia } from './distancia';

describe('distanciaEnMetros', () => {
  it('measures the distance between Córdoba and Buenos Aires within 1 %', () => {
    const cordoba = { latitud: -31.4201, longitud: -64.1888 };
    const buenosAires = { latitud: -34.6037, longitud: -58.3816 };

    // Great-circle distance between both city centres: about 646 km.
    const expected = 646_000;

    expect(Math.abs(distanciaEnMetros(cordoba, buenosAires) - expected)).toBeLessThan(
      expected * 0.01,
    );
  });

  it('is zero for the same point', () => {
    const punto = { latitud: -31.4201, longitud: -64.1888 };

    expect(distanciaEnMetros(punto, punto)).toBe(0);
  });

  it('is the same in both directions', () => {
    const a = { latitud: -31.4201, longitud: -64.1888 };
    const b = { latitud: -32.9442, longitud: -60.6505 };

    expect(distanciaEnMetros(a, b)).toBeCloseTo(distanciaEnMetros(b, a), 6);
  });
});

describe('formatDistancia', () => {
  it.each([
    [999, 'a 999 m'],
    [1000, 'a 1 km'],
    [9940, 'a 9,9 km'],
    [10_000, 'a 10 km'],
  ])('formats %d m as "%s"', (metros, texto) => {
    expect(formatDistancia(metros)).toBe(texto);
  });

  it('rounds the metres below 1 km', () => {
    expect(formatDistancia(799.6)).toBe('a 800 m');
  });

  it('uses one decimal with a comma below 10 km', () => {
    expect(formatDistancia(3_210)).toBe('a 3,2 km');
  });

  it('drops the decimal when it is zero below 10 km', () => {
    expect(formatDistancia(2_010)).toBe('a 2 km');
  });

  it('has no decimals from 10 km', () => {
    expect(formatDistancia(25_400)).toBe('a 25 km');
  });

  it('shows 1 km when the metres round up to 1000', () => {
    expect(formatDistancia(999.7)).toBe('a 1 km');
  });

  it('shows 10 km when the kilometres round up to 10', () => {
    expect(formatDistancia(9_960)).toBe('a 10 km');
  });
});
