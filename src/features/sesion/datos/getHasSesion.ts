import { AUTH_STORAGE_KEY, authStorage, supabase } from '@/shared/supabase';

// How long the client gets to answer before the stored session decides. The
// client waits for its first renewal of an expired token, which without a
// connection retries for about 25 s; the first screen cannot wait that long.
const CLIENT_WAIT_MS = 500;

const TIMED_OUT = Symbol('timed out');

/**
 * Tells whether there is a session on this phone. The client answers when it
 * has finished starting; if it takes too long, the session stored on the phone
 * answers instead and the renewal goes on in the background. `onLateAnswer`
 * runs if the client answers after that, so whoever asked can read it again:
 * the renewal may have found the session no longer valid.
 */
export async function getHasSesion(onLateAnswer?: () => void): Promise<boolean> {
  const fromClient = readFromClient();
  const first = await Promise.race([fromClient, wait(CLIENT_WAIT_MS)]);

  if (first !== TIMED_OUT) {
    return first;
  }

  // Whatever the client says later, success or failure, is news.
  fromClient.then(
    () => onLateAnswer?.(),
    () => onLateAnswer?.(),
  );

  return hasStoredSession();
}

async function readFromClient(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Could not read the session: ${error.message}`);
  }

  return data.session !== null;
}

function wait(ms: number): Promise<typeof TIMED_OUT> {
  return new Promise((resolve) => setTimeout(() => resolve(TIMED_OUT), ms));
}

/**
 * Whether the phone keeps a session, read as the client stores it. Signing out
 * removes it, and so does a renewal the server rejects, so it is only there
 * while the session may still be valid.
 */
async function hasStoredSession(): Promise<boolean> {
  const stored = await authStorage.getItem(AUTH_STORAGE_KEY);

  if (stored === null) {
    return false;
  }

  try {
    const session: unknown = JSON.parse(stored);
    return (
      typeof session === 'object' &&
      session !== null &&
      'refresh_token' in session &&
      typeof session.refresh_token === 'string'
    );
  } catch {
    return false;
  }
}
