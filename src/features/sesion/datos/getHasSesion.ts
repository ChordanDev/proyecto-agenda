import { supabase } from '@/shared/supabase';

/** Tells whether there is a session on this phone. */
export async function getHasSesion(): Promise<boolean> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Could not read the session: ${error.message}`);
  }

  return data.session !== null;
}
