import { supabase } from '@/shared/supabase';

import { getSignInErrorMessage, type Credentials } from '../dominio/signInErrors';

// Out of the app since #126: the sign-in is only with a code by email, with no
// password. Kept, with no screen using it, in case the password comes back.

/** A failed sign-in; its message is the one to show the person. */
export class SignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SignInError';
  }
}

/**
 * Signs in with email and password. The client keeps the session in the secure
 * storage of the phone and renews it until it is closed.
 */
export async function signIn({ email, password }: Credentials): Promise<void> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      throw new SignInError(
        getSignInErrorMessage({ code: error.code, name: error.name, status: error.status }),
      );
    }
  } catch (error) {
    throw error instanceof SignInError ? error : new SignInError(getSignInErrorMessage({}));
  }
}
