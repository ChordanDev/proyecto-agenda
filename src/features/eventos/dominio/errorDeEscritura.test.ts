import { clasificarError, getMensajeDeError } from './errorDeEscritura';

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

  it('asks to try again otherwise', () => {
    expect(getMensajeDeError('otro')).toBe('No se pudo guardar. Probá de nuevo en un momento.');
  });
});
