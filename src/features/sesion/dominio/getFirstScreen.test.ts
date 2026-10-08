import { getFirstScreen } from './getFirstScreen';

describe('getFirstScreen', () => {
  it('opens on the Bienvenida when there is no iglesia elegida and no session', () => {
    expect(getFirstScreen({ hasIglesiaElegida: false, hasSesion: false })).toBe('bienvenida');
  });

  it('goes straight to the calendar when there is an iglesia elegida', () => {
    expect(getFirstScreen({ hasIglesiaElegida: true, hasSesion: false })).toBe('calendario');
  });

  it('goes straight to the calendar when there is a session', () => {
    expect(getFirstScreen({ hasIglesiaElegida: false, hasSesion: true })).toBe('calendario');
  });

  it('goes straight to the calendar when there are both', () => {
    expect(getFirstScreen({ hasIglesiaElegida: true, hasSesion: true })).toBe('calendario');
  });
});
