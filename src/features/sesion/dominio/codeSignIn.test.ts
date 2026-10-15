import {
  getCodeSignInErrorMessage,
  isUnregisteredEmail,
  normalizeCode,
  validateCode,
  validateEmail,
} from './codeSignIn';

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

describe('isUnregisteredEmail', () => {
  it('reads the refusal of the service to send a code to an email with no account', () => {
    expect(isUnregisteredEmail({ code: 'otp_disabled', status: 422 })).toBe(true);
  });

  it.each([{ code: 'over_email_send_rate_limit', status: 429 }, { status: 500 }, {}])(
    'is false for any other failure: %p',
    (info) => {
      expect(isUnregisteredEmail(info)).toBe(false);
    },
  );
});

describe('getCodeSignInErrorMessage', () => {
  it('says there is no connection on both steps', () => {
    const offline = { name: 'AuthRetryableFetchError', status: 0 };
    const message = 'No hay conexión. Revisá tu internet y probá de nuevo.';

    expect(getCodeSignInErrorMessage('email', offline)).toBe(message);
    expect(getCodeSignInErrorMessage('code', offline)).toBe(message);
  });

  it('says to wait after too many attempts', () => {
    const message =
      'Hiciste demasiados intentos. Esperá un rato (puede ser hasta una hora) y probá de nuevo.';

    expect(getCodeSignInErrorMessage('email', { code: 'over_email_send_rate_limit' })).toBe(
      message,
    );
    expect(getCodeSignInErrorMessage('code', { status: 429 })).toBe(message);
  });

  it('points at the email when the service rejects its format', () => {
    expect(getCodeSignInErrorMessage('email', { code: 'email_address_invalid' })).toBe(
      'Revisá el correo: falta algo o tiene un error.',
    );
  });

  it('reads a wrong code and an expired one the same', () => {
    expect(getCodeSignInErrorMessage('code', { code: 'otp_expired', status: 403 })).toBe(
      'El código no es correcto o ya venció. Pedí uno nuevo.',
    );
  });

  it('falls back to a message per step', () => {
    expect(getCodeSignInErrorMessage('email', { status: 500 })).toBe(
      'No pudimos enviar el código. Probá de nuevo en un momento.',
    );
    expect(getCodeSignInErrorMessage('code', { status: 500 })).toBe(
      'No pudimos revisar el código. Probá de nuevo en un momento.',
    );
  });
});
