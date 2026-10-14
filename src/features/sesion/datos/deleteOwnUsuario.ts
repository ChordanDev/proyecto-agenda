import { supabase } from '@/shared/supabase';

import { signOut } from './signOut';

/**
 * Deletes the usuario who is signed in, with their cargos; the eventos they
 * loaded stay. The database function only acts on the usuario of the session.
 * Then the session, which belongs to nobody any more, leaves the phone.
 */
export async function deleteOwnUsuario(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_usuario');

  if (error) {
    throw new Error(`Could not delete the usuario: ${error.message}`);
  }

  await signOut();
}
