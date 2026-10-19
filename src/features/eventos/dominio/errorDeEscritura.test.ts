import {
  clasificarError,
  clasificarErrorDeFecha,
  getMensajeDeError,
  necesitaReleerElEvento,
} from './errorDeEscritura';

describe('clasificarError', () => {
  it('tells a request that never reached the server', () => {
    expect(clasificarError(undefined, 'TypeError: Network request failed')).toBe('sin-conexion');
    expect(clasificarError('', 'Failed to fetch')).toBe('sin-conexion');
  });

  it('tells a write the cargos do not allow', () => {
    // A policy that rejects the row, and an evento the policy hides.
    expect(clasificarError('42501', 'new row violates row-level security policy')).toBe(
      'sin-permiso',
    );
    expect(clasificarError('P0002', 'There is no evento the usuario can edit')).toBe('sin-permiso');
  });

  it('tells an evento that was deleted meanwhile from one the policy hides', () => {
    // Both fail with P0002; only reading the evento again tells them apart.
    const message = 'There is no evento the usuario can edit';

    expect(clasificarError('P0002', message, { eventoExiste: false })).toBe('no-existe');
    expect(clasificarError('P0002', message, { eventoExiste: true })).toBe('sin-permiso');
  });

  it('needs to read the evento again only for P0002', () => {
    expect(necesitaReleerElEvento('P0002')).toBe(true);
    expect(necesitaReleerElEvento('42501')).toBe(false);
    expect(necesitaReleerElEvento(undefined)).toBe(false);
  });

  it('leaves anything else as an error to try again', () => {
    expect(clasificarError('23505', 'duplicate key value violates unique constraint')).toBe('otro');
  });
});

describe('getMensajeDeError', () => {
  it('asks for a connection when there is none', () => {
    expect(getMensajeDeError('sin-conexion')).toBe(
      'Hace falta conexión a internet. Revisá la conexión y probá de nuevo.',
    );
  });

  it('says the cargos do not allow it', () => {
    expect(getMensajeDeError('sin-permiso')).toBe('Tus cargos no te permiten cambiar este evento.');
  });

  it('says the evento no longer exists', () => {
    expect(getMensajeDeError('no-existe')).toBe(
      'Este evento ya no existe: lo borraron mientras lo tenías abierto.',
    );
  });

  it('asks to try again otherwise', () => {
    expect(getMensajeDeError('otro')).toBe('No se pudo guardar. Probá de nuevo en un momento.');
  });
});

describe('clasificarErrorDeFecha', () => {
  it('tells a date of a series that changed meanwhile', () => {
    // A date deleted or no longer of the series, or a day another date took.
    expect(
      clasificarErrorDeFecha('23514', 'The fecha 2026-10-17 of the evento e1 was deleted'),
    ).toBe('fecha-cambiada');
    expect(getMensajeDeError('fecha-cambiada')).toBe(
      'Esta fecha de la serie cambió mientras la tenías abierta. Volvé al evento y probá de nuevo.',
    );
  });

  it('tells the last date left of a series only when deleting a date', () => {
    // borrar_fecha rejects it: the cached dates of the series were old. Any
    // other 22023 is an invalid value, as for every write.
    expect(
      clasificarErrorDeFecha('22023', 'The last fecha of the evento e1', { borrandoFecha: true }),
    ).toBe('fecha-cambiada');
    expect(clasificarErrorDeFecha('22023', 'invalid value')).toBe('otro');
  });

  it('classifies any other error as every write does', () => {
    expect(clasificarErrorDeFecha('42501', 'rls')).toBe('sin-permiso');
    expect(clasificarErrorDeFecha('P0002', 'gone', { eventoExiste: false })).toBe('no-existe');
  });
});

describe('clasificarError', () => {
  it('keeps a check of another write, such as a lugar, as any other error', () => {
    expect(clasificarError('23514', 'new row violates check constraint')).toBe('otro');
  });
});
