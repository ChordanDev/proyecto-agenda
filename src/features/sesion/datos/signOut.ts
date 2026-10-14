import { AUTH_STORAGE_KEY, authStorage, supabase } from '@/shared/supabase';

// How long the client gets to sign out before the session is removed from the
// phone directly. With an expired token and no connection, the client first
// retries the renewal for about 25 s and then keeps the session.
const CLIENT_WAIT_MS = 500;

/**
 * Signs out on this phone only: the usuario stays signed in on any other one.
 * The client is asked first; whatever it answers, and however long it takes,
 * the session leaves the storage of the phone, so nobody gets in with it when
 * the connection comes back.
 */
export async function signOut(): Promise<void> {
  const fromClient = supabase.auth.signOut({ scope: 'local' });

  await Promise.race([fromClient.catch(() => undefined), wait(CLIENT_WAIT_MS)]);
  await authStorage.removeItem(AUTH_STORAGE_KEY);

  // A renewal still running can store a fresh session when the connection comes
  // back, and the client then keeps it: it is removed again once it ends.
  fromClient.finally(() => void authStorage.removeItem(AUTH_STORAGE_KEY)).catch(() => undefined);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
