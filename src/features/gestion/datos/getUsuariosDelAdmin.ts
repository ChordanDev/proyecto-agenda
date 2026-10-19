import { supabase } from '@/shared/supabase';

import { agruparUsuarios, type UsuarioDelAdmin } from '../dominio/usuariosDelAdmin';

/**
 * Everyone with a cargo on an iglesia or a distrito of the asociacion, with
 * their nombre, correo and cargos, ordered by nombre. The cargo of admin is
 * never among them.
 *
 * The policies let the admin read every cargo of their asociacion and the
 * perfiles and correos of whoever holds one
 * (20261018000000_create_perfiles_y_secretaria.sql); the cargos of other
 * places they may read are left out by their iglesia or distrito.
 */
export async function getUsuariosDelAdmin(asociacionId: string): Promise<UsuarioDelAdmin[]> {
  const distritos = await supabase
    .from('distritos')
    .select('id, nombre')
    .eq('asociacion_id', asociacionId);

  if (distritos.error) {
    throw new Error(`Could not read the distritos: ${distritos.error.message}`);
  }

  const distritoIds = distritos.data.map((distrito) => distrito.id);
  const [iglesias, cargos, correos] = await Promise.all([
    supabase.from('iglesias').select('id, nombre').in('distrito_id', distritoIds),
    supabase
      .from('cargos')
      .select('id, usuario_id, iglesia_id, distrito_id, asociacion_id, es_secretaria, funcion'),
    supabase.rpc('get_usuario_emails'),
  ]);

  if (iglesias.error) {
    throw new Error(`Could not read the iglesias: ${iglesias.error.message}`);
  }
  if (cargos.error) {
    throw new Error(`Could not read the cargos: ${cargos.error.message}`);
  }
  if (correos.error) {
    throw new Error(`Could not read the correos: ${correos.error.message}`);
  }

  const usuarioIds = [...new Set(cargos.data.map((cargo) => cargo.usuario_id))];
  const perfiles =
    usuarioIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('perfiles').select('usuario_id, nombre').in('usuario_id', usuarioIds);

  if (perfiles.error) {
    throw new Error(`Could not read the perfiles: ${perfiles.error.message}`);
  }

  return agruparUsuarios({
    cargos: cargos.data.map((cargo) => ({
      cargoId: cargo.id,
      usuarioId: cargo.usuario_id,
      iglesiaId: cargo.iglesia_id,
      distritoId: cargo.distrito_id,
      asociacionId: cargo.asociacion_id,
      esSecretaria: cargo.es_secretaria,
      funcion: cargo.funcion,
    })),
    perfiles: new Map(perfiles.data.map((perfil) => [perfil.usuario_id, perfil.nombre])),
    correos: new Map(correos.data.map((fila) => [fila.usuario_id, fila.email])),
    iglesias: new Map(iglesias.data.map((iglesia) => [iglesia.id, iglesia.nombre])),
    distritos: new Map(distritos.data.map((distrito) => [distrito.id, distrito.nombre])),
  });
}
