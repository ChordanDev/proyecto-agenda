import { getSignInErrorMessage, validateCredentials } from './signInErrors';

describe('getSignInErrorMessage', () => {
  it('shows one message for a wrong password, an unknown email and an unconfirmed email', () => {
    const wrongPassword = getSignInErrorMessage({ code: 'invalid_credentials', status: 400 });
    const unknownEmail = getSignInErrorMessage({ code: 'user_not_found', status: 400 });
    const unconfirmed = getSignInErrorMessage({ code: 'email_not_confirmed', status: 400 });

    expect(unknownEmail).toBe(wrongPassword);
    expect(unconfirmed).toBe(wrongPassword);
  });

  it('never says whether the email is registered', () => {
    const message = getSignInErrorMessage({ code: 'invalid_credentials' });

    expect(message).toBe('El email o la contraseña no son correctos. Revisalos y probá de nuevo.');
    expect(message).not.toMatch(/registrad|existe|encontr/i);
  });

  it('tells a lost connection apart', () => {
    expect(getSignInErrorMessage({ name: 'AuthRetryableFetchError', status: 0 })).toBe(
      'No hay conexión. Revisá tu internet y probá de nuevo.',
    );
  });

  it('tells too many attempts apart', () => {
    const expected = 'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.';

    expect(getSignInErrorMessage({ code: 'over_request_rate_limit', status: 429 })).toBe(expected);
    expect(getSignInErrorMessage({ status: 429 })).toBe(expected);
  });

  it('falls back to a generic message for anything else', () => {
    const expected = 'No pudimos iniciar sesión. Probá de nuevo en un momento.';

    expect(getSignInErrorMessage({ status: 500 })).toBe(expected);
    expect(getSignInErrorMessage({})).toBe(expected);
  });
});

describe('validateCredentials', () => {
  it('accepts an email and a password, and trims the email', () => {
    expect(validateCredentials({ email: '  marta@correo.com ', password: 'clave1234' })).toEqual({
      ok: true,
      email: 'marta@correo.com',
      password: 'clave1234',
    });
  });

  it('keeps the spaces of the password', () => {
    expect(validateCredentials({ email: 'marta@correo.com', password: ' clave ' })).toEqual({
      ok: true,
      email: 'marta@correo.com',
      password: ' clave ',
    });
  });

  it.each([
    ['an empty email', { email: '', password: 'clave1234' }],
    ['an email of spaces', { email: '   ', password: 'clave1234' }],
    ['an empty password', { email: 'marta@correo.com', password: '' }],
    ['both empty', { email: '', password: '' }],
  ])('rejects %s before calling the server', (_name, credentials) => {
    expect(validateCredentials(credentials)).toEqual({
      ok: false,
      message: 'Escribí tu email y tu contraseña.',
    });
  });
});
