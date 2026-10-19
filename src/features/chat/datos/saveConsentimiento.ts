import { supabase } from '@/shared/supabase';

import { getUsuarioId } from './usuarioId';

// Postgres unique_violation: the usuario already accepted, on another phone.
const ALREADY_SAVED = '23505';

/**
 * Saves that the usuario signed in accepted the aviso of OpenAI. Only the
 * usuario is written: the database sets the moment and allows no other column.
 * Returns whose consentimiento it saved.
 */
export async function saveConsentimiento(): Promise<string> {
  const usuarioId = await getUsuarioId();
  if (!usuarioId) {
    throw new Error('Cannot save the consentimiento without a session');
  }

  const { error } = await supabase.from('chat_consentimientos').insert({ usuario_id: usuarioId });

  if (error && error.code !== ALREADY_SAVED) {
    throw new Error(`Could not save the consentimiento: ${error.message}`);
  }

  return usuarioId;
}
