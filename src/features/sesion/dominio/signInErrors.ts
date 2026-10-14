/**
 * What the app knows about a failed sign-in, as plain data: the datos layer
 * copies it from the error of the auth service so that this file knows nothing
 * of Supabase.
 */
export type SignInErrorInfo = {
  /** Machine-readable code of the auth service, e.g. `invalid_credentials`. */
  code?: string;
  name?: string;
  status?: number;
};

const MESSAGES = {
  // One message for every case that would tell whether an email is registered:
  // wrong password, unknown email and an email that was never confirmed.
  invalidCredentials: 'El email o la contraseña no son correctos. Revisalos y probá de nuevo.',
  network: 'No hay conexión. Revisá tu internet y probá de nuevo.',
  rateLimited: 'Hiciste demasiados intentos. Esperá unos minutos y probá de nuevo.',
  generic: 'No pudimos iniciar sesión. Probá de nuevo en un momento.',
  emptyFields: 'Escribí tu email y tu contraseña.',
} as const;

const INVALID_CREDENTIALS_CODES = ['invalid_credentials', 'user_not_found', 'email_not_confirmed'];
const RATE_LIMIT_CODES = ['over_request_rate_limit', 'over_email_send_rate_limit'];
const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * The message shown for a failed sign-in. It never says whether an email is
 * registered, so a wrong email and a wrong password read the same.
 */
export function getSignInErrorMessage({ code, name, status }: SignInErrorInfo): string {
  if (code !== undefined && INVALID_CREDENTIALS_CODES.includes(code)) {
    return MESSAGES.invalidCredentials;
  }

  // The client reports a request that never got an answer under this name.
  if (name === 'AuthRetryableFetchError' || status === 0) {
    return MESSAGES.network;
  }

  if (
    (code !== undefined && RATE_LIMIT_CODES.includes(code)) ||
    status === HTTP_TOO_MANY_REQUESTS
  ) {
    return MESSAGES.rateLimited;
  }

  return MESSAGES.generic;
}

export type Credentials = { email: string; password: string };

export type CredentialsCheck =
  { ok: true; email: string; password: string } | { ok: false; message: string };

/**
 * Catches empty fields before any request. The email is trimmed (a phone
 * keyboard often leaves a trailing space); the password is kept as typed.
 */
export function validateCredentials({ email, password }: Credentials): CredentialsCheck {
  const trimmedEmail = email.trim();

  if (trimmedEmail === '' || password === '') {
    return { ok: false, message: MESSAGES.emptyFields };
  }

  return { ok: true, email: trimmedEmail, password };
}
