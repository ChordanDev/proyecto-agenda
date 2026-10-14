import { supabase } from '@/shared/supabase';

import {
  getPasswordRecoveryErrorMessage,
  type PasswordRecoveryStep,
} from '../dominio/passwordRecovery';
import { markRecoveryFinished, markRecoveryStarted } from './unfinishedRecovery';

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

/**
 * Checks the code; a right one signs the usuario in, to choose their password.
 * The flow is marked as unfinished first, so the session cannot outlive it.
 */
export async function verifyCode({ email, code }: { email: string; code: string }): Promise<void> {
  await markRecoveryStarted();

  try {
    await runStep('code', () => supabase.auth.verifyOtp({ email, token: code, type: 'recovery' }));
  } catch (error) {
    // A wrong code opens no session: there is nothing to discard.
    await markRecoveryFinished();
    throw error;
  }
}

/** Stores the new password of the usuario signed in by the code. */
export async function choosePassword(password: string): Promise<void> {
  await runStep('password', () => supabase.auth.updateUser({ password }));
  await markRecoveryFinished();
}
