import { supabase } from '@/shared/supabase';

import type { Cargo } from '../dominio/cargo';

/**
 * Reads the cargos of the usuario who is signed in. The database only returns
 * their own: the policy of `cargos` compares the usuario with the session.
 */
export async function getCargosDelUsuario(): Promise<Cargo[]> {
  const { data, error } = await supabase
    .from('cargos')
    .select('id, iglesia_id, distrito_id, asociacion_id');

  if (error) {
    throw new Error(`Could not read the cargos: ${error.message}`);
  }

  return data.map((row): Cargo => {
    // The database guarantees exactly one level per cargo (constraint
    // cargos_exactly_one_nivel), but the generated types cannot know it.
    if (row.iglesia_id) {
      return { nivel: 'iglesia', iglesiaId: row.iglesia_id };
    }

    if (row.distrito_id) {
      return { nivel: 'distrito', distritoId: row.distrito_id };
    }

    if (row.asociacion_id) {
      return { nivel: 'asociacion', asociacionId: row.asociacion_id };
    }

    throw new Error(`Cargo ${row.id} has no nivel`);
  });
}
