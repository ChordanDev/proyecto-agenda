import { AUTH_STORAGE_KEY, authStorage, supabase } from '@/shared/supabase';

// How long the client gets to sign out before the session is removed from the
// phone directly.
const CLIENT_WAIT_MS = 500;
// The client renews a token with less than this left before using it
// (EXPIRY_MARGIN_MS in @supabase/auth-js): to it, that token has expired.
const EXPIRY_MARGIN_MS = 90 * 1000;

type StoredSession = { refreshToken: string; expiresAtMs: number | null };

/**
 * Signs out on this phone only: the usuario stays signed in on any other one.
 *
 * An expired session is only removed from the phone: asking the client to sign
 * it out makes it renew the token first, which without a connection retries for
 * about 25 s and then keeps the session. A valid one is signed out by the
 * client (it tells the server), and removed from the phone if the client does
 * not manage to. Only the session being closed is ever removed: one stored by a
 * later sign-in on this phone stays.
 */
export async function signOut(): Promise<void> {
  const closing = await readStoredSession();

  if (closing === null) {
    return;
  }

  if (closing.expiresAtMs === null || closing.expiresAtMs - Date.now() >= EXPIRY_MARGIN_MS) {
    const fromClient = supabase.auth.signOut({ scope: 'local' });
    await Promise.race([fromClient.catch(() => undefined), wait(CLIENT_WAIT_MS)]);
    // Once the client ends, whatever it answered, the session must be gone.
    fromClient.finally(() => removeIfStillStored(closing)).catch(() => undefined);
  }

  await removeIfStillStored(closing);
}

async function readStoredSession(): Promise<StoredSession | null> {
  const stored = await authStorage.getItem(AUTH_STORAGE_KEY);

  if (stored === null) {
    return null;
  }

  try {
    const session: unknown = JSON.parse(stored);
    if (
      typeof session !== 'object' ||
      session === null ||
      !('refresh_token' in session) ||
      typeof session.refresh_token !== 'string'
    ) {
      return null;
    }
    const expiresAt = 'expires_at' in session ? session.expires_at : undefined;
    return {
      refreshToken: session.refresh_token,
      expiresAtMs: typeof expiresAt === 'number' ? expiresAt * 1000 : null,
    };
  } catch {
    return null;
  }
}

/** Removes the stored session only if it is still the one being closed. */
async function removeIfStillStored(closing: StoredSession): Promise<void> {
  const current = await readStoredSession();

  if (current?.refreshToken === closing.refreshToken) {
    await authStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
