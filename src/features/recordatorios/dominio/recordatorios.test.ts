import {
  cambioQuienLoUsa,
  elegirIglesias,
  esFallaDeConexion,
  iglesiaElegidaVigente,
  iglesiasQuePuedeSeguir,
  mismoRegistro,
  modoDeRecordatorios,
  registroDeseado,
  registroInicial,
  type RegistroGuardado,
} from './recordatorios';

const iglesias = [
  { id: 'i1', distritoId: 'd1', asociacionId: 'a1' },
  { id: 'i2', distritoId: 'd1', asociacionId: 'a1' },
  { id: 'i3', distritoId: 'd2', asociacionId: 'a1' },
];

const encargado = [{ nivel: 'iglesia' as const, iglesiaId: 'i2' }];
const pastor = [{ nivel: 'distrito' as const, distritoId: 'd1' }];
const admin = [{ nivel: 'asociacion' as const, asociacionId: 'a1' }];

function guardado(registro: Partial<RegistroGuardado>): RegistroGuardado {
  return { encendido: true, iglesiaIds: [], conUsuario: false, delUsuario: false, ...registro };
}

describe('modoDeRecordatorios', () => {
  it('follows the iglesia elegida without a session or without cargos', () => {
    expect(modoDeRecordatorios(null)).toBe('iglesia-elegida');
    expect(modoDeRecordatorios([])).toBe('iglesia-elegida');
  });

  it('follows their iglesias for an encargado', () => {
    expect(modoDeRecordatorios(encargado)).toBe('sus-iglesias');
  });

  it('lets a pastor or an admin choose', () => {
    expect(modoDeRecordatorios(pastor)).toBe('eligiendo');
    expect(modoDeRecordatorios(admin)).toBe('eligiendo');
    expect(modoDeRecordatorios([...encargado, ...pastor])).toBe('eligiendo');
  });
});

describe('registroInicial', () => {
  it('turns a hermano on, following their iglesia elegida', () => {
    expect(registroInicial({ cargos: null, iglesiaElegidaId: 'i1' })).toEqual({
      encendido: true,
      iglesiaIds: ['i1'],
    });
  });

  it('turns an encargado on, following their iglesia and not the iglesia elegida', () => {
    expect(registroInicial({ cargos: encargado, iglesiaElegidaId: 'i1' })).toEqual({
      encendido: true,
      iglesiaIds: ['i2'],
    });
  });

  it('starts a pastor off, with no iglesia chosen', () => {
    expect(registroInicial({ cargos: pastor, iglesiaElegidaId: 'i1' })).toEqual({
      encendido: false,
      iglesiaIds: [],
    });
  });

  it('starts an admin off, with no iglesia chosen', () => {
    expect(registroInicial({ cargos: admin, iglesiaElegidaId: 'i1' })).toEqual({
      encendido: false,
      iglesiaIds: [],
    });
  });

  it('follows nothing for a hermano who has not chosen an iglesia yet', () => {
    expect(registroInicial({ cargos: null, iglesiaElegidaId: null })).toEqual({
      encendido: true,
      iglesiaIds: [],
    });
  });
});

describe('iglesiasQuePuedeSeguir', () => {
  it('offers a pastor the iglesias of their distrito', () => {
    expect(iglesiasQuePuedeSeguir(pastor, iglesias)).toEqual(['i1', 'i2']);
  });

  it('no longer offers a pastor an iglesia that moved to another distrito', () => {
    const movida = iglesias.map((iglesia) =>
      iglesia.id === 'i2' ? { ...iglesia, distritoId: 'd2' } : iglesia,
    );

    expect(iglesiasQuePuedeSeguir(pastor, movida)).toEqual(['i1']);
  });

  it('does not offer an iglesia dada de baja', () => {
    const conBaja = iglesias.map((iglesia) =>
      iglesia.id === 'i2' ? { ...iglesia, deBaja: true } : iglesia,
    );

    expect(iglesiasQuePuedeSeguir(admin, conBaja)).toEqual(['i1', 'i3']);
  });

  it('offers an admin every iglesia of their asociacion', () => {
    expect(iglesiasQuePuedeSeguir(admin, iglesias)).toEqual(['i1', 'i2', 'i3']);
  });
});

describe('registroDeseado', () => {
  it('registers a phone never saved with its initial value', () => {
    expect(
      registroDeseado({ cargos: null, iglesiaElegidaId: 'i1', guardado: null, iglesias }),
    ).toEqual({ encendido: true, iglesiaIds: ['i1'] });
  });

  it('makes a hermano follow the new iglesia elegida, keeping the switch', () => {
    expect(
      registroDeseado({
        cargos: null,
        iglesiaElegidaId: 'i3',
        guardado: guardado({ encendido: false, iglesiaIds: ['i1'] }),
        iglesias,
      }),
    ).toEqual({ encendido: false, iglesiaIds: ['i3'] });
  });

  it('keeps an encargado on their iglesia when the iglesia elegida changes', () => {
    expect(
      registroDeseado({
        cargos: encargado,
        iglesiaElegidaId: 'i3',
        guardado: guardado({ iglesiaIds: ['i2'], conUsuario: true, delUsuario: true }),
        iglesias,
      }),
    ).toEqual({ encendido: true, iglesiaIds: ['i2'] });
  });

  it('goes back to the iglesia elegida, on, once the session is closed', () => {
    expect(
      registroDeseado({
        cargos: null,
        iglesiaElegidaId: 'i1',
        guardado: guardado({ encendido: false, iglesiaIds: ['i2', 'i3'], conUsuario: true }),
        iglesias,
      }),
    ).toEqual({ encendido: true, iglesiaIds: ['i1'] });
  });

  it('starts again from the initial value when another usuario signs in', () => {
    expect(
      registroDeseado({
        cargos: pastor,
        iglesiaElegidaId: 'i1',
        guardado: guardado({ iglesiaIds: ['i1'], conUsuario: true, delUsuario: false }),
        iglesias,
      }),
    ).toEqual({ encendido: false, iglesiaIds: [] });
  });

  it('keeps what a pastor chose, without the iglesias their cargos no longer cover', () => {
    expect(
      registroDeseado({
        cargos: pastor,
        iglesiaElegidaId: 'i1',
        guardado: guardado({ iglesiaIds: ['i2', 'i3'], conUsuario: true, delUsuario: true }),
        iglesias,
      }),
    ).toEqual({ encendido: true, iglesiaIds: ['i2'] });
  });

  it('drops an iglesia dada de baja a pastor had chosen', () => {
    expect(
      registroDeseado({
        cargos: pastor,
        iglesiaElegidaId: 'i1',
        guardado: guardado({ iglesiaIds: ['i1', 'i2'], conUsuario: true, delUsuario: true }),
        iglesias: iglesias.map((iglesia) =>
          iglesia.id === 'i2' ? { ...iglesia, deBaja: true } : iglesia,
        ),
      }),
    ).toEqual({ encendido: true, iglesiaIds: ['i1'] });
  });

  it('turns a pastor off when none of their chosen iglesias is left', () => {
    expect(
      registroDeseado({
        cargos: pastor,
        iglesiaElegidaId: 'i1',
        guardado: guardado({ iglesiaIds: ['i3'], conUsuario: true, delUsuario: true }),
        iglesias,
      }),
    ).toEqual({ encendido: false, iglesiaIds: [] });
  });
});

describe('elegirIglesias', () => {
  it('turns on with the iglesias chosen', () => {
    expect(elegirIglesias(['i1', 'i2'])).toEqual({ encendido: true, iglesiaIds: ['i1', 'i2'] });
  });

  it('turns off when none is chosen', () => {
    expect(elegirIglesias([])).toEqual({ encendido: false, iglesiaIds: [] });
  });
});

describe('mismoRegistro', () => {
  it('ignores the order of the iglesias', () => {
    expect(
      mismoRegistro(
        { encendido: true, iglesiaIds: ['i1', 'i2'] },
        { encendido: true, iglesiaIds: ['i2', 'i1'] },
      ),
    ).toBe(true);
  });

  it('tells a different switch or iglesia apart', () => {
    expect(
      mismoRegistro(
        { encendido: true, iglesiaIds: ['i1'] },
        { encendido: false, iglesiaIds: ['i1'] },
      ),
    ).toBe(false);
    expect(
      mismoRegistro(
        { encendido: true, iglesiaIds: ['i1'] },
        { encendido: true, iglesiaIds: ['i2'] },
      ),
    ).toBe(false);
  });
});

describe('cambioQuienLoUsa', () => {
  it('tells a phone saved by a usuario apart once signed out', () => {
    expect(cambioQuienLoUsa(null, guardado({ conUsuario: true }))).toBe(true);
    expect(cambioQuienLoUsa(null, guardado({ conUsuario: false }))).toBe(false);
  });

  it('tells a phone saved by someone else apart with a session', () => {
    expect(cambioQuienLoUsa(encargado, guardado({ conUsuario: false }))).toBe(true);
    expect(cambioQuienLoUsa(encargado, guardado({ conUsuario: true, delUsuario: true }))).toBe(
      false,
    );
  });
});

describe('iglesiaElegidaVigente', () => {
  const conBaja = [
    { id: 'i1', distritoId: 'd1', asociacionId: 'a1', deBaja: false },
    { id: 'i2', distritoId: 'd1', asociacionId: 'a1', deBaja: true },
  ];

  it('keeps an active iglesia elegida', () => {
    expect(iglesiaElegidaVigente('i1', conBaja)).toBe('i1');
  });

  it('drops an iglesia elegida dada de baja: the hermano chooses again', () => {
    expect(iglesiaElegidaVigente('i2', conBaja)).toBeNull();
  });

  it('keeps nothing when none was chosen', () => {
    expect(iglesiaElegidaVigente(null, conBaja)).toBeNull();
  });
});

describe('esFallaDeConexion', () => {
  it('takes a request that never reached the server as a connection failure', () => {
    // What the queries throw when PostgREST could not fetch.
    expect(
      esFallaDeConexion(new Error('Could not save the phone: TypeError: Network request failed')),
    ).toBe(true);
    // What fetchWithTimeout rejects with when the request gets no answer.
    expect(
      esFallaDeConexion(new TypeError('Network request failed: no answer in 15 seconds')),
    ).toBe(true);
    expect(esFallaDeConexion(new TypeError('Failed to fetch'))).toBe(true);
    // A FunctionsFetchError of supabase-js.
    expect(esFallaDeConexion(new Error('Failed to send a request to the Edge Function'))).toBe(
      true,
    );
  });

  it('does not take what a connection cannot fix as a connection failure', () => {
    expect(
      esFallaDeConexion(
        new Error('The app has no EAS projectId: run `eas init` to get a push token.'),
      ),
    ).toBe(false);
    // A 42501 of the base.
    expect(
      esFallaDeConexion(
        new Error('Could not save the phone: permission denied for function guardar_dispositivo'),
      ),
    ).toBe(false);
  });

  it('does not take a value that is not an error as a connection failure', () => {
    expect(esFallaDeConexion('Network request failed')).toBe(false);
    expect(esFallaDeConexion(undefined)).toBe(false);
  });
});
