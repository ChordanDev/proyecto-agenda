import { supabase } from '@/shared/supabase';

/** The email of the usuario signed in on this phone, or null without a session. */
export async function getEmailDelUsuario(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Could not read the session: ${error.message}`);
  }

  return data.session?.user.email ?? null;
}
