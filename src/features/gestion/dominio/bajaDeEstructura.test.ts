import {
  getBloqueoDeBajaDeDistrito,
  getConfirmacionDeBajaDeDistrito,
  getConfirmacionDeBajaDeIglesia,
  getConfirmacionDeReactivarDistrito,
  getConfirmacionDeReactivarIglesia,
  getSubtituloDeIglesiaDeBaja,
  puedeReactivarIglesia,
  type IglesiaDeBaja,
} from './bajaDeEstructura';

function iglesiaDeBaja(overrides: Partial<IglesiaDeBaja> = {}): IglesiaDeBaja {
  return {
    id: 'los-molles',
    nombre: 'Iglesia Los Molles',
    distritoNombre: 'Distrito Sur',
    distritoDeBaja: false,
    ...overrides,
  };
}

describe('getConfirmacionDeBajaDeIglesia', () => {
  it('says what dar de baja does, with how many encargados lose the cargo', () => {
    expect(getConfirmacionDeBajaDeIglesia('Iglesia Las Rosas', 2)).toEqual({
      titulo: '¿Dar de baja Iglesia Las Rosas?',
      textos: [
        'Deja de aparecer en el buscador, en el calendario y en la gestión. Sus 2 encargados pierden el cargo.',
        'Sus eventos quedan guardados y vuelven si la reactivás. Los encargados no vuelven solos.',
      ],
    });
  });

  it('speaks of a single encargado', () => {
    expect(getConfirmacionDeBajaDeIglesia('Iglesia Las Rosas', 1).textos[0]).toBe(
      'Deja de aparecer en el buscador, en el calendario y en la gestión. Su encargado pierde el cargo.',
    );
  });

  it('says nothing about cargos when it has no encargado', () => {
    expect(getConfirmacionDeBajaDeIglesia('Iglesia Las Rosas', 0).textos).toEqual([
      'Deja de aparecer en el buscador, en el calendario y en la gestión. No tiene encargados.',
      'Sus eventos quedan guardados y vuelven si la reactivás.',
    ]);
  });
});

describe('getConfirmacionDeReactivarIglesia', () => {
  it('says that its eventos come back and its encargados do not', () => {
    expect(getConfirmacionDeReactivarIglesia('Iglesia Los Molles')).toEqual({
      titulo: '¿Reactivar Iglesia Los Molles?',
      textos: [
        'Vuelve a aparecer en el buscador, en el calendario y en la gestión, con sus eventos.',
        'Sus encargados no vuelven solos: hay que agregarlos de nuevo.',
      ],
    });
  });
});

describe('getConfirmacionDeBajaDeDistrito', () => {
  it('says what dar de baja does, with its pastor', () => {
    expect(getConfirmacionDeBajaDeDistrito('Distrito Oeste', 1)).toEqual({
      titulo: '¿Dar de baja Distrito Oeste?',
      textos: [
        'Deja de aparecer en la gestión y sus eventos de distrito dejan de verse. Su pastor pierde el cargo.',
        'Sus eventos quedan guardados y vuelven si lo reactivás. El pastor no vuelve solo.',
      ],
    });
  });

  it('speaks of several pastores', () => {
    expect(getConfirmacionDeBajaDeDistrito('Distrito Oeste', 2).textos).toEqual([
      'Deja de aparecer en la gestión y sus eventos de distrito dejan de verse. Sus 2 pastores pierden el cargo.',
      'Sus eventos quedan guardados y vuelven si lo reactivás. Los pastores no vuelven solos.',
    ]);
  });

  it('says nothing about cargos when it has no pastor', () => {
    expect(getConfirmacionDeBajaDeDistrito('Distrito Oeste', 0).textos).toEqual([
      'Deja de aparecer en la gestión y sus eventos de distrito dejan de verse. No tiene pastor.',
      'Sus eventos quedan guardados y vuelven si lo reactivás.',
    ]);
  });
});

describe('getConfirmacionDeReactivarDistrito', () => {
  it('says that its eventos come back, and its pastor and its iglesias do not', () => {
    expect(getConfirmacionDeReactivarDistrito('Distrito Oeste')).toEqual({
      titulo: '¿Reactivar Distrito Oeste?',
      textos: [
        'Vuelve a aparecer en la gestión, con sus eventos de distrito.',
        'Su pastor no vuelve solo: hay que nombrarlo de nuevo. Sus iglesias dadas de baja siguen de baja hasta que las reactives.',
      ],
    });
  });
});

describe('getBloqueoDeBajaDeDistrito', () => {
  it('lets a distrito without active iglesias be given de baja', () => {
    expect(getBloqueoDeBajaDeDistrito(0)).toBeNull();
  });

  it('asks to move its active iglesias to another distrito first', () => {
    expect(getBloqueoDeBajaDeDistrito(3)).toBe(
      'Para darlo de baja, pasá antes sus 3 iglesias a otro distrito.',
    );
    expect(getBloqueoDeBajaDeDistrito(1)).toBe(
      'Para darlo de baja, pasá antes su iglesia a otro distrito.',
    );
  });
});

describe('iglesias dadas de baja', () => {
  it('says which distrito an iglesia dada de baja was in', () => {
    expect(getSubtituloDeIglesiaDeBaja(iglesiaDeBaja())).toBe('Era del Distrito Sur');
  });

  it('is reactivada only in an active distrito', () => {
    expect(puedeReactivarIglesia(iglesiaDeBaja())).toBe(true);
    expect(puedeReactivarIglesia(iglesiaDeBaja({ distritoDeBaja: true }))).toBe(false);
  });

  it('asks to reactivar its distrito first when that one is de baja too', () => {
    expect(getSubtituloDeIglesiaDeBaja(iglesiaDeBaja({ distritoDeBaja: true }))).toBe(
      'Era del Distrito Sur, que está dado de baja: reactivá antes el distrito.',
    );
  });
});
