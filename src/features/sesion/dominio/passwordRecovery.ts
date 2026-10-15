import type { Check } from './codeSignIn';
import type { SignInErrorInfo } from './signInErrors';

// Out of the app since #126: the sign-in is only with a code by email, with no
// password. Kept, with no screen using it, in case the password comes back.

// The email and the code are checked as in the sign-in with a code.
export { normalizeCode, validateCode, validateEmail, type Check } from './codeSignIn';

/**
 * First access and password recovery are one flow of three steps: the email,
 * the 6-digit code that arrives there, and the new password.
 */
export type PasswordRecoveryStep = 'email' | 'code' | 'password';

const MIN_PASSWORD_LENGTH = 8;

const MESSAGES = {
  invalidEmail: 'Revisá el correo: falta algo o tiene un error.',
  wrongCode: 'El código no es correcto o ya venció. Pedí uno nuevo.',
  shortPassword: `Tiene que tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
  samePassword: 'Es la misma contraseña que tenías. Elegí otra.',
  network: 'No hay conexión. Revisá tu internet y probá de nuevo.',
  // The emails of the codes have a limit per hour: the wait can be that long.
  rateLimited:
    'Hiciste demasiados intentos. Esperá un rato (puede ser hasta una hora) y probá de nuevo.',
  generic: {
    email: 'No pudimos enviar el código. Probá de nuevo en un momento.',
    code: 'No pudimos revisar el código. Probá de nuevo en un momento.',
    password: 'No pudimos guardar la contraseña. Probá de nuevo en un momento.',
  },
} as const;

/**
 * The only rule of a password is its length: no uppercase, digits or symbols.
 * It is kept as typed, spaces included.
 */
export function validatePassword(password: string): Check {
  return [...password].length >= MIN_PASSWORD_LENGTH
    ? { ok: true, value: password }
    : { ok: false, message: MESSAGES.shortPassword };
}

const RATE_LIMIT_CODES = ['over_request_rate_limit', 'over_email_send_rate_limit'];
const HTTP_TOO_MANY_REQUESTS = 429;

/**
 * The message for a step that failed at the auth service. Asking for a code
 * never fails because an email is not registered: the service answers the same
 * for every email, so no message here can tell it either.
 */
export function getPasswordRecoveryErrorMessage(
  step: PasswordRecoveryStep,
  { code, name, status }: SignInErrorInfo,
): string {
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

  if (step === 'email' && (code === 'validation_failed' || code === 'email_address_invalid')) {
    return MESSAGES.invalidEmail;
  }

  // The service answers a wrong code and an expired one the same way.
  if (step === 'code' && code === 'otp_expired') {
    return MESSAGES.wrongCode;
  }

  if (step === 'password' && code === 'weak_password') {
    return MESSAGES.shortPassword;
  }

  if (step === 'password' && code === 'same_password') {
    return MESSAGES.samePassword;
  }

  return MESSAGES.generic[step];
}
