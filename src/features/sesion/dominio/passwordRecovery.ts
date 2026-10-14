import type { SignInErrorInfo } from './signInErrors';

/**
 * First access and password recovery are one flow of three steps: the email,
 * the 6-digit code that arrives there, and the new password.
 */
export type PasswordRecoveryStep = 'email' | 'code' | 'password';

export type Check = { ok: true; value: string } | { ok: false; message: string };

const CODE_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;

const MESSAGES = {
  invalidEmail: 'Revisá el correo: falta algo o tiene un error.',
  incompleteCode: `Escribí los ${CODE_LENGTH} dígitos del código.`,
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

// Something, an @, something, a dot and something, without spaces. The auth
// service checks the rest.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The email, trimmed: a phone keyboard often leaves a trailing space. */
export function validateEmail(email: string): Check {
  const trimmed = email.trim();

  return EMAIL_SHAPE.test(trimmed)
    ? { ok: true, value: trimmed }
    : { ok: false, message: MESSAGES.invalidEmail };
}

/** What the code field keeps of what was typed or pasted: its digits, up to six. */
export function normalizeCode(text: string): string {
  return text.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

export function validateCode(code: string): Check {
  return new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)
    ? { ok: true, value: code }
    : { ok: false, message: MESSAGES.incompleteCode };
}

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
