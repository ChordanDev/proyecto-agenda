import {
  formatFechaYHora,
  getDuenioDelDetalle,
  getEnfasisDelDetalle,
  hasText,
} from './detalleDeEvento';

describe('formatFechaYHora', () => {
  it('writes the day, then the hora without seconds', () => {
    expect(formatFechaYHora('2026-10-10', '19:00:00')).toBe('Sábado 10 de octubre · 19:00');
  });

  it('keeps the minutes of the hora', () => {
    expect(formatFechaYHora('2026-10-14', '09:30:00')).toBe('Miércoles 14 de octubre · 09:30');
  });
});

describe('getEnfasisDelDetalle', () => {
  it('gives the lema and, under it, the nombre of the enfasis', () => {
    expect(getEnfasisDelDetalle('nuevas_generaciones')).toEqual({
      lema: 'Integramos',
      nombre: 'Nuevas Generaciones',
    });
    expect(getEnfasisDelDetalle('identidad')).toEqual({ lema: 'Somos', nombre: 'Identidad' });
  });

  it('names the actividad regular alone, without a second line', () => {
    expect(getEnfasisDelDetalle(null)).toEqual({ lema: 'Actividad regular', nombre: null });
  });
});

describe('getDuenioDelDetalle', () => {
  it('names an iglesia and says it is seen in its calendario', () => {
    expect(getDuenioDelDetalle({ alcance: 'iglesia', iglesiaId: 'i1' }, 'Córdoba Central')).toEqual(
      {
        nombre: 'Iglesia Córdoba Central',
        seVe: 'Se ve en el calendario de esta iglesia',
      },
    );
  });

  it('does not repeat the level when the nombre already starts with it', () => {
    expect(
      getDuenioDelDetalle({ alcance: 'iglesia', iglesiaId: 'i1' }, 'Iglesia de prueba').nombre,
    ).toBe('Iglesia de prueba');
    expect(
      getDuenioDelDetalle({ alcance: 'distrito', distritoId: 'd1' }, 'distrito Norte').nombre,
    ).toBe('distrito Norte');
  });

  it('names a distrito and says it is seen in all its iglesias', () => {
    expect(getDuenioDelDetalle({ alcance: 'distrito', distritoId: 'd1' }, 'Córdoba Norte')).toEqual(
      {
        nombre: 'Distrito Córdoba Norte',
        seVe: 'Se ve en todas las iglesias del distrito',
      },
    );
  });

  it('names an asociacion by its own nombre, which already says what it is', () => {
    expect(
      getDuenioDelDetalle(
        { alcance: 'asociacion', asociacionId: 'a1' },
        'Asociación Argentina Central',
      ),
    ).toEqual({
      nombre: 'Asociación Argentina Central',
      seVe: 'Se ve en todas las iglesias de la asociación',
    });
  });
});

describe('hasText', () => {
  it('shows a field with text', () => {
    expect(hasText('Templo')).toBe(true);
  });

  it('hides a field that is missing, empty or only spaces', () => {
    expect(hasText(null)).toBe(false);
    expect(hasText('')).toBe(false);
    expect(hasText('   ')).toBe(false);
  });
});
