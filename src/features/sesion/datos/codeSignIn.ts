import { supabase } from '@/shared/supabase';

import {
  getCodeSignInErrorMessage,
  isUnregisteredEmail,
  type CodeSignInStep,
} from '../dominio/codeSignIn';
import { markRecoveryFinished } from './unfinishedRecovery';

/** A failed step of the sign-in; its message is the one to show the person. */
export class CodeSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CodeSignInError';
  }
}

type AuthError = { code?: string; name?: string; status?: number } | null;

/**
 * Runs a call of the auth service and turns any failure into a message for its
 * step. A failure that `accept` takes counts as a success.
 */
async function runStep(
  step: CodeSignInStep,
  call: () => Promise<{ error: AuthError }>,
  accept: (error: NonNullable<AuthError>) => boolean = () => false,
): Promise<void> {
  try {
    const { error } = await call();

    if (error && !accept(error)) {
      throw new CodeSignInError(
        getCodeSignInErrorMessage(step, {
          code: error.code,
          name: error.name,
          status: error.status,
        }),
      );
    }
  } catch (error) {
    throw error instanceof CodeSignInError
      ? error
      : new CodeSignInError(getCodeSignInErrorMessage(step, {}));
  }
}

/**
 * Asks for a 6-digit code by email. The usuarios are loaded beforehand, so no
 * account is ever created here. An email with no account gets no email, and the
 * app answers the same as for a registered one.
 */
export function sendSignInCode(email: string): Promise<void> {
  return runStep(
    'email',
    () => supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } }),
    isUnregisteredEmail,
  );
}

/**
 * Checks the code; a right one signs the usuario in. The client keeps the
 * session in the secure storage of the phone and renews it until it is closed.
 */
export async function verifySignInCode({
  email,
  code,
}: {
  email: string;
  code: string;
}): Promise<void> {
  await runStep('code', () => supabase.auth.verifyOtp({ email, token: code, type: 'email' }));
  // A password flow left halfway by an older version of the app would sign
  // this session out the next time the app opens. The session is already open:
  // failing to clear the mark must not fail the sign-in, whose code is spent.
  await markRecoveryFinished().catch(() => undefined);
}
