import { supabase } from '@/shared/supabase';

import type { Cargo } from '../dominio/cargo';

/**
 * Reads the cargos of the usuario who is signed in, and no other.
 *
 * The filter by usuario is needed: a secretaria de iglesia, a pastor or an
 * admin can also read the cargos they oversee, and those are not theirs.
 */
export async function getCargosDelUsuario(): Promise<Cargo[]> {
  const { data: sesion, error: sesionError } = await supabase.auth.getSession();

  if (sesionError) {
    throw new Error(`Could not read the session: ${sesionError.message}`);
  }

  const usuarioId = sesion.session?.user.id;
  if (!usuarioId) {
    return [];
  }

  const { data, error } = await supabase
    .from('cargos')
    .select('id, iglesia_id, distrito_id, asociacion_id')
    .eq('usuario_id', usuarioId);

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
