import { supabase } from '@/shared/supabase';

/** What is given de baja or reactivado: an iglesia or a distrito, by its id. */
export type Baja = { iglesiaId: string } | { distritoId: string };

/**
 * Gives an iglesia or a distrito de baja. Only the admin of its asociacion can,
 * and a distrito only without active iglesias
 * (20261024000000_baja_de_iglesias_y_distritos.sql). Its cargos are removed.
 */
export async function darDeBaja(baja: Baja): Promise<void> {
  const { error } =
    'iglesiaId' in baja
      ? await supabase.rpc('dar_de_baja_iglesia', { iglesia_id: baja.iglesiaId })
      : await supabase.rpc('dar_de_baja_distrito', { distrito_id: baja.distritoId });

  if (error) {
    throw new Error(`Could not dar de baja: ${error.message}`);
  }
}

/**
 * Reactiva an iglesia or a distrito dado de baja, with its eventos and without
 * its cargos. An iglesia only in an active distrito.
 */
export async function reactivar(baja: Baja): Promise<void> {
  const { error } =
    'iglesiaId' in baja
      ? await supabase.rpc('reactivar_iglesia', { iglesia_id: baja.iglesiaId })
      : await supabase.rpc('reactivar_distrito', { distrito_id: baja.distritoId });

  if (error) {
    throw new Error(`Could not reactivar: ${error.message}`);
  }
}
