import { supabase } from '@/shared/supabase';

import type { MotivoDeReporte } from '../dominio/reporte';
import { getUsuarioId } from './usuarioId';

// Postgres unique_violation: a try before saved this reporte, and its answer was lost.
const ALREADY_SAVED = '23505';

/**
 * Saves the reporte of a respuesta by the usuario signed in: who and why,
 * never the texto. The database sets the moment and nobody reads it back from
 * the app. The `id` makes a reporte sent again count once.
 */
export async function saveReporte(reporte: { id: string; motivo: MotivoDeReporte }): Promise<void> {
  const usuarioId = await getUsuarioId();
  if (!usuarioId) {
    throw new Error('Cannot save a reporte without a session');
  }

  // Without .select(): the usuario cannot read reportes, not even their own.
  const { error } = await supabase
    .from('chat_reportes')
    .insert({ id: reporte.id, usuario_id: usuarioId, motivo: reporte.motivo });

  if (error && error.code !== ALREADY_SAVED) {
    throw new Error(`Could not save the reporte: ${error.message}`);
  }
}
