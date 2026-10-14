import { getEncabezadoDeCalendario } from './encabezadoDeCalendario';

const central = { nombre: 'Córdoba Central', distrito: 'Córdoba Centro' };
const nueva = { nombre: 'Nueva Córdoba', distrito: 'Córdoba Centro' };
const arguello = { nombre: 'Argüello', distrito: 'Córdoba Norte' };

describe('getEncabezadoDeCalendario', () => {
  it('shows the nombre and the distrito of a single iglesia', () => {
    expect(getEncabezadoDeCalendario([central])).toEqual({
      titulo: 'Córdoba Central',
      subtitulo: 'Córdoba Centro',
    });
  });

  it('shows the distrito and the count when the iglesias share the distrito', () => {
    expect(getEncabezadoDeCalendario([central, nueva])).toEqual({
      titulo: 'Mis iglesias',
      subtitulo: 'Córdoba Centro · 2 iglesias',
    });
  });

  it('shows only the count when the iglesias are of several distritos', () => {
    expect(getEncabezadoDeCalendario([central, nueva, arguello])).toEqual({
      titulo: 'Mis iglesias',
      subtitulo: '3 iglesias',
    });
  });
});
