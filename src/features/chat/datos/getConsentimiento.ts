import { supabase } from '@/shared/supabase';

import { getUsuarioId } from './usuarioId';

/**
 * Whether the usuario signed in accepted the aviso of OpenAI, on any phone:
 * the consentimiento is per usuario.
 */
export async function getConsentimiento(): Promise<boolean> {
  const usuarioId = await getUsuarioId();
  if (!usuarioId) {
    return false;
  }

  const { data, error } = await supabase
    .from('chat_consentimientos')
    .select('usuario_id')
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read the consentimiento: ${error.message}`);
  }

  return data !== null;
}
