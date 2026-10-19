import { decidirBusqueda, MAX_COINCIDENCIAS } from './ambiguedad';

describe('decidirBusqueda', () => {
  it('has nothing to show when nothing matches', () => {
    expect(decidirBusqueda(0)).toBe('ninguna');
  });

  it('answers with every coincidencia up to three', () => {
    expect(MAX_COINCIDENCIAS).toBe(3);
    expect(decidirBusqueda(1)).toBe('responder');
    expect(decidirBusqueda(3)).toBe('responder');
  });

  it('asks to narrow the pregunta from four coincidencias', () => {
    expect(decidirBusqueda(4)).toBe('repreguntar');
    expect(decidirBusqueda(40)).toBe('repreguntar');
  });
});
