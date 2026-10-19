import { supabase } from '@/shared/supabase';

import { nombreDeEncargado, type Encargado } from '../dominio/encargados';

export type EncargadosDeIglesia = {
  iglesia: { id: string; nombre: string };
  encargados: Encargado[];
};

/**
 * The iglesia and whoever holds a cargo on it, with their nombre, correo and
 * funcion. The policies let a secretaria de iglesia, the pastor of its distrito
 * and the admin read them (20261018000000_create_perfiles_y_secretaria.sql);
 * anyone else reads no cargo. Null when the iglesia does not exist.
 */
export async function getEncargadosDeIglesia(
  iglesiaId: string,
): Promise<EncargadosDeIglesia | null> {
  const [iglesia, cargos, correos] = await Promise.all([
    supabase.from('iglesias').select('id, nombre').eq('id', iglesiaId).maybeSingle(),
    supabase
      .from('cargos')
      .select('id, usuario_id, funcion, es_secretaria')
      .eq('iglesia_id', iglesiaId),
    supabase.rpc('get_usuario_emails'),
  ]);

  if (iglesia.error) {
    throw new Error(`Could not read the iglesia: ${iglesia.error.message}`);
  }
  if (cargos.error) {
    throw new Error(`Could not read the cargos: ${cargos.error.message}`);
  }
  if (correos.error) {
    throw new Error(`Could not read the correos: ${correos.error.message}`);
  }
  if (!iglesia.data) {
    return null;
  }

  const usuarioIds = [...new Set(cargos.data.map((cargo) => cargo.usuario_id))];
  const perfiles =
    usuarioIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('perfiles').select('usuario_id, nombre').in('usuario_id', usuarioIds);

  if (perfiles.error) {
    throw new Error(`Could not read the perfiles: ${perfiles.error.message}`);
  }

  const nombres = new Map(perfiles.data.map((perfil) => [perfil.usuario_id, perfil.nombre]));
  const correoDe = new Map(correos.data.map((fila) => [fila.usuario_id, fila.email]));

  return {
    iglesia: iglesia.data,
    encargados: cargos.data.map((cargo): Encargado => {
      const correo = correoDe.get(cargo.usuario_id) ?? null;
      return {
        cargoId: cargo.id,
        usuarioId: cargo.usuario_id,
        nombre: nombreDeEncargado(nombres.get(cargo.usuario_id) ?? null, correo),
        correo,
        funcion: cargo.funcion,
        esSecretaria: cargo.es_secretaria,
      };
    }),
  };
}
