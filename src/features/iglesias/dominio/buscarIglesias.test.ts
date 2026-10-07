import { buscarIglesias, type Iglesia } from './buscarIglesias';

function iglesia(overrides: Partial<Iglesia>): Iglesia {
  return {
    id: 'id-' + (overrides.nombre ?? 'sin-nombre'),
    nombre: 'Córdoba Central',
    direccion: 'Av. Colón 1250',
    localidad: 'Córdoba',
    distrito: 'Córdoba Centro',
    excluidaDelBuscador: false,
    ...overrides,
  };
}

const nombres = (iglesias: Iglesia[]) => iglesias.map((i) => i.nombre);

describe('buscarIglesias', () => {
  const iglesias = [
    iglesia({ nombre: 'Córdoba Central' }),
    iglesia({ nombre: 'Argüello' }),
    iglesia({ nombre: 'Villa María Centro' }),
    iglesia({ nombre: 'Iglesia de prueba', excluidaDelBuscador: true }),
  ];

  it('returns every church when the search text is empty', () => {
    expect(nombres(buscarIglesias(iglesias, ''))).toEqual([
      'Córdoba Central',
      'Argüello',
      'Villa María Centro',
    ]);
  });

  it('treats a search text made only of spaces as empty', () => {
    expect(buscarIglesias(iglesias, '   ')).toHaveLength(3);
  });

  it('matches by a part of the name', () => {
    expect(nombres(buscarIglesias(iglesias, 'Centr'))).toEqual([
      'Córdoba Central',
      'Villa María Centro',
    ]);
  });

  it('ignores upper and lower case', () => {
    expect(nombres(buscarIglesias(iglesias, 'VILLA maría'))).toEqual(['Villa María Centro']);
  });

  it('ignores accents and diaeresis, in the search text and in the name', () => {
    expect(nombres(buscarIglesias(iglesias, 'cordoba'))).toEqual(['Córdoba Central']);
    expect(nombres(buscarIglesias(iglesias, 'arguello'))).toEqual(['Argüello']);
    expect(nombres(buscarIglesias(iglesias, 'Villa Mariá'))).toEqual(['Villa María Centro']);
  });

  it('ignores spaces around the search text', () => {
    expect(nombres(buscarIglesias(iglesias, '  argüello '))).toEqual(['Argüello']);
  });

  it('never returns a church excluded from the search, even on an exact match', () => {
    expect(buscarIglesias(iglesias, 'Iglesia de prueba')).toEqual([]);
    expect(nombres(buscarIglesias(iglesias, ''))).not.toContain('Iglesia de prueba');
  });

  it('returns an empty list when nothing matches', () => {
    expect(buscarIglesias(iglesias, 'Rosario')).toEqual([]);
  });

  it('does not modify the list it receives', () => {
    const copy = [...iglesias];
    buscarIglesias(iglesias, 'cordoba');
    expect(iglesias).toEqual(copy);
  });
});
