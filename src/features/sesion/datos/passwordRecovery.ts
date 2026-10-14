import { supabase } from '@/shared/supabase';

import {
  getPasswordRecoveryErrorMessage,
  type PasswordRecoveryStep,
} from '../dominio/passwordRecovery';

/** A failed step of the flow; its message is the one to show the person. */
export class PasswordRecoveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PasswordRecoveryError';
  }
}

type AuthError = { code?: string; name?: string; status?: number } | null;

/** Runs a call of the auth service and turns any failure into a message for its step. */
async function runStep(
  step: PasswordRecoveryStep,
  call: () => Promise<{ error: AuthError }>,
): Promise<void> {
  try {
    const { error } = await call();

    if (error) {
      throw new PasswordRecoveryError(
        getPasswordRecoveryErrorMessage(step, {
          code: error.code,
          name: error.name,
          status: error.status,
        }),
      );
    }
  } catch (error) {
    throw error instanceof PasswordRecoveryError
      ? error
      : new PasswordRecoveryError(getPasswordRecoveryErrorMessage(step, {}));
  }
}

/**
 * Asks for a 6-digit code by email. The usuarios are loaded beforehand, so the
 * first access is a recovery too. The service answers the same whether the
 * email is registered or not, and sends nothing for one that is not.
 */
export function sendCode(email: string): Promise<void> {
  return runStep('email', () => supabase.auth.resetPasswordForEmail(email));
}

/** Checks the code; a right one signs the usuario in, to choose their password. */
export function verifyCode({ email, code }: { email: string; code: string }): Promise<void> {
  return runStep('code', () => supabase.auth.verifyOtp({ email, token: code, type: 'recovery' }));
}

/** Stores the new password of the usuario signed in by the code. */
export function choosePassword(password: string): Promise<void> {
  return runStep('password', () => supabase.auth.updateUser({ password }));
}
