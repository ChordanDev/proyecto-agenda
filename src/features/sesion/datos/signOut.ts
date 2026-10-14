import { supabase } from '@/shared/supabase';

/**
 * Signs out on this phone only: the usuario stays signed in on any other one.
 * The client removes the session from the phone even when it cannot tell the
 * server (no connection, or a usuario already deleted), so only a session that
 * is still there counts as a failure.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' });

  const { data } = await supabase.auth.getSession();

  if (data.session !== null) {
    throw new Error('Could not sign out: the session is still on this phone');
  }
}
