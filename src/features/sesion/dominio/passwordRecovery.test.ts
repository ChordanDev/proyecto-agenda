import { getPasswordRecoveryErrorMessage, validatePassword } from './passwordRecovery';

describe('validatePassword', () => {
  it('only asks for 8 characters: no uppercase, digits or symbols', () => {
    expect(validatePassword('abriluno')).toEqual({ ok: true, value: 'abriluno' });
  });

  it('counts characters, not code units', () => {
    // Four emoji are 8 UTF-16 code units, but only 4 characters.
    expect(validatePassword('😀😀😀😀')).toEqual({
      ok: false,
      message: 'Tiene que tener al menos 8 caracteres.',
    });
    expect(validatePassword('ñandú123')).toEqual({ ok: true, value: 'ñandú123' });
  });

  it('keeps the spaces the person typed', () => {
    expect(validatePassword(' abril 2 ')).toEqual({ ok: true, value: ' abril 2 ' });
  });

  it('rejects fewer than 8 characters', () => {
    expect(validatePassword('abril26')).toEqual({
      ok: false,
      message: 'Tiene que tener al menos 8 caracteres.',
    });
  });
});

describe('getPasswordRecoveryErrorMessage', () => {
  it('says there is no connection on any step', () => {
    expect(getPasswordRecoveryErrorMessage('email', { name: 'AuthRetryableFetchError' })).toBe(
      'No hay conexión. Revisá tu internet y probá de nuevo.',
    );
    expect(getPasswordRecoveryErrorMessage('code', { status: 0 })).toBe(
      'No hay conexión. Revisá tu internet y probá de nuevo.',
    );
  });

  it('says to wait after too many attempts', () => {
    expect(getPasswordRecoveryErrorMessage('email', { code: 'over_email_send_rate_limit' })).toBe(
      'Hiciste demasiados intentos. Esperá un rato (puede ser hasta una hora) y probá de nuevo.',
    );
    expect(getPasswordRecoveryErrorMessage('code', { status: 429 })).toBe(
      'Hiciste demasiados intentos. Esperá un rato (puede ser hasta una hora) y probá de nuevo.',
    );
  });

  it('points at the email when the service rejects its format', () => {
    expect(
      getPasswordRecoveryErrorMessage('email', { code: 'validation_failed', status: 400 }),
    ).toBe('Revisá el correo: falta algo o tiene un error.');
    expect(getPasswordRecoveryErrorMessage('email', { code: 'email_address_invalid' })).toBe(
      'Revisá el correo: falta algo o tiene un error.',
    );
  });

  it('reads a wrong code and an expired one the same', () => {
    expect(getPasswordRecoveryErrorMessage('code', { code: 'otp_expired', status: 403 })).toBe(
      'El código no es correcto o ya venció. Pedí uno nuevo.',
    );
  });

  it('explains a password the service finds too weak or the same as before', () => {
    expect(getPasswordRecoveryErrorMessage('password', { code: 'weak_password' })).toBe(
      'Tiene que tener al menos 8 caracteres.',
    );
    expect(getPasswordRecoveryErrorMessage('password', { code: 'same_password' })).toBe(
      'Es la misma contraseña que tenías. Elegí otra.',
    );
  });

  it('falls back to a message per step', () => {
    expect(getPasswordRecoveryErrorMessage('email', {})).toBe(
      'No pudimos enviar el código. Probá de nuevo en un momento.',
    );
    expect(getPasswordRecoveryErrorMessage('code', {})).toBe(
      'No pudimos revisar el código. Probá de nuevo en un momento.',
    );
    expect(getPasswordRecoveryErrorMessage('password', {})).toBe(
      'No pudimos guardar la contraseña. Probá de nuevo en un momento.',
    );
  });
});
