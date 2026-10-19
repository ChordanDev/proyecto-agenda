// The cargos of a usuario, with the place each level has in the structure:
// what puedeGestionarCargo needs. Shared by `invitar` and `cambiar-correo`.
//
// Read with service_role: a gestor reads the cargos of others through row level
// security, but these are read on the server, which decides with them.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import type { CargoEnEstructura } from '../../../src/features/sesion/dominio/puedeGestionarCargo.ts';

export async function leerCargosEnEstructura(
  servidor: SupabaseClient<Database>,
  usuarioId: string,
): Promise<CargoEnEstructura[]> {
  const { data, error } = await servidor
    .from('cargos')
    .select(
      'id, iglesia_id, distrito_id, asociacion_id, es_secretaria, iglesias(distrito_id, distritos(asociacion_id)), distritos(asociacion_id)',
    )
    .eq('usuario_id', usuarioId);

  if (error) {
    throw new Error(`Could not read the cargos: ${error.message}`);
  }

  return data.map((fila): CargoEnEstructura => {
    // The database guarantees exactly one level per cargo (constraint
    // cargos_exactly_one_nivel), but the generated types cannot know it.
    if (fila.iglesia_id && fila.iglesias?.distritos) {
      return {
        nivel: 'iglesia',
        iglesiaId: fila.iglesia_id,
        distritoId: fila.iglesias.distrito_id,
        asociacionId: fila.iglesias.distritos.asociacion_id,
        esSecretaria: fila.es_secretaria,
      };
    }
    if (fila.distrito_id && fila.distritos) {
      return {
        nivel: 'distrito',
        distritoId: fila.distrito_id,
        asociacionId: fila.distritos.asociacion_id,
      };
    }
    if (fila.asociacion_id) {
      return { nivel: 'asociacion', asociacionId: fila.asociacion_id };
    }
    throw new Error(`Cargo ${fila.id} has no nivel`);
  });
}

/** The id of the usuario with this correo, or null. */
export async function buscarUsuarioPorCorreo(
  servidor: SupabaseClient<Database>,
  correo: string,
): Promise<string | null> {
  const { data, error } = await servidor.rpc('get_usuario_id_por_correo', { correo });

  if (error) {
    throw new Error(`Could not look for the usuario: ${error.message}`);
  }
  return data;
}
