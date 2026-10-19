import { supabase } from '@/shared/supabase';

import type { CargoDelGestor } from '../dominio/vistaDeGestion';

export type Gestor = {
  /** Null without a session. */
  usuarioId: string | null;
  cargos: CargoDelGestor[];
};

/**
 * The usuario signed in and their own cargos, with the mark of secretaria de
 * iglesia, which decides the vista of the gestion.
 *
 * The filter by usuario is needed: a gestor also reads the cargos they oversee
 * (getCargosDelUsuario).
 */
export async function getCargosDelGestor(): Promise<Gestor> {
  const { data: sesion, error: sesionError } = await supabase.auth.getSession();

  if (sesionError) {
    throw new Error(`Could not read the session: ${sesionError.message}`);
  }

  const usuarioId = sesion.session?.user.id ?? null;
  if (!usuarioId) {
    return { usuarioId: null, cargos: [] };
  }

  const { data, error } = await supabase
    .from('cargos')
    .select('id, iglesia_id, distrito_id, asociacion_id, es_secretaria')
    .eq('usuario_id', usuarioId);

  if (error) {
    throw new Error(`Could not read the cargos: ${error.message}`);
  }

  const cargos = data.map((row): CargoDelGestor => {
    // The database guarantees exactly one level per cargo (constraint
    // cargos_exactly_one_nivel), but the generated types cannot know it.
    if (row.iglesia_id) {
      return { nivel: 'iglesia', iglesiaId: row.iglesia_id, esSecretaria: row.es_secretaria };
    }

    if (row.distrito_id) {
      return { nivel: 'distrito', distritoId: row.distrito_id };
    }

    if (row.asociacion_id) {
      return { nivel: 'asociacion', asociacionId: row.asociacion_id };
    }

    throw new Error(`Cargo ${row.id} has no nivel`);
  });

  return { usuarioId, cargos };
}
