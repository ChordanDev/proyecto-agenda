import type { SignInErrorInfo } from './signInErrors';

/**
 * Encargados, pastores and admins sign in only with a 6-digit code sent to
 * their email, with no password (#126): the email, then the code. The first
 * access and every later one are the same path.
 */
export type CodeSignInStep = 'email' | 'code';

export type Check = { ok: true; value: string } | { ok: false; message: string };

const CODE_LENGTH = 6;

const MESSAGES = {
  invalidEmail: 'Revisá el correo: falta algo o tiene un error.',
  incompleteCode: `Escribí los ${CODE_LENGTH} dígitos del código.`,
  wrongCode: 'El código no es correcto o ya venció. Pedí uno nuevo.',
  network: 'No hay conexión. Revisá tu internet y probá de nuevo.',
  // The emails of the codes have a limit per hour: the wait can be that long.
  rateLimited:
    'Hiciste demasiados intentos. Esperá un rato (puede ser hasta una hora) y probá de nuevo.',
  generic: {
    email: 'No pudimos enviar el código. Probá de nuevo en un momento.',
    code: 'No pudimos revisar el código. Probá de nuevo en un momento.',
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
 * Whether the service refused to send a code because the email has no account.
 * The app never creates one, and answers as if the code had been sent, so the
 * screen never tells whether an email is registered.
 */
export function isUnregisteredEmail({ code }: SignInErrorInfo): boolean {
  return code === 'otp_disabled';
}

const RATE_LIMIT_CODES = ['over_request_rate_limit', 'over_email_send_rate_limit'];
const HTTP_TOO_MANY_REQUESTS = 429;

/** The message for a step that failed at the auth service. */
export function getCodeSignInErrorMessage(
  step: CodeSignInStep,
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

  return MESSAGES.generic[step];
}
