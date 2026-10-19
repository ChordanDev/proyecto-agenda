import { getMiIglesia } from './miIglesia';

describe('getMiIglesia', () => {
  const iglesias = [
    { id: 'a', nombre: 'Iglesia Central', distrito: 'Distrito Norte', deBaja: false },
    { id: 'b', nombre: 'Iglesia del Sur', distrito: 'Distrito Sur', deBaja: false },
    { id: 'c', nombre: 'Iglesia Los Molles', distrito: 'Distrito Sur', deBaja: true },
  ];

  it('returns the nombre and distrito of the iglesia elegida', () => {
    expect(getMiIglesia('b', iglesias)).toEqual({
      nombre: 'Iglesia del Sur',
      distrito: 'Distrito Sur',
    });
  });

  it('returns null when this phone has no iglesia elegida', () => {
    expect(getMiIglesia(null, iglesias)).toBeNull();
  });

  it('returns null when the iglesia elegida no longer exists', () => {
    expect(getMiIglesia('z', iglesias)).toBeNull();
  });

  it('returns null when the iglesia elegida was dada de baja, so the phone chooses another one', () => {
    expect(getMiIglesia('c', iglesias)).toBeNull();
  });
});
