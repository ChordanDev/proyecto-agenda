import {
  getPasswordRecoveryErrorMessage,
  normalizeCode,
  validateCode,
  validateEmail,
  validatePassword,
} from './passwordRecovery';

describe('validateEmail', () => {
  it('accepts an email, trimmed', () => {
    expect(validateEmail('  marta@correo.com ')).toEqual({ ok: true, value: 'marta@correo.com' });
  });

  it.each(['', '   ', 'marta', 'marta@', 'marta@correo', '@correo.com', 'mar ta@correo.com'])(
    'rejects %p with a clear message',
    (email) => {
      expect(validateEmail(email)).toEqual({
        ok: false,
        message: 'Revisá el correo: falta algo o tiene un error.',
      });
    },
  );
});

describe('normalizeCode', () => {
  it('keeps only digits, up to six', () => {
    expect(normalizeCode(' 48-20 15 9')).toBe('482015');
  });
});

describe('validateCode', () => {
  it('accepts six digits', () => {
    expect(validateCode('482015')).toEqual({ ok: true, value: '482015' });
  });

  it.each(['', '48201', 'abcdef'])('rejects %p', (code) => {
    expect(validateCode(code)).toEqual({
      ok: false,
      message: 'Escribí los 6 dígitos del código.',
    });
  });
});

describe('validatePassword', () => {
  it('only asks for 8 characters: no uppercase, digits or symbols', () => {
    expect(validatePassword('abriluno')).toEqual({ ok: true, value: 'abriluno' });
  });

  it('counts characters, not bytes', () => {
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
      'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.',
    );
    expect(getPasswordRecoveryErrorMessage('code', { status: 429 })).toBe(
      'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.',
    );
  });

  it('points at the email when the service rejects its format', () => {
    expect(
      getPasswordRecoveryErrorMessage('email', { code: 'validation_failed', status: 400 }),
    ).toBe('Revisá el correo: falta algo o tiene un error.');
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
