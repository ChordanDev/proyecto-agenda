import { supabase } from '@/shared/supabase';

import type { DistritoDeBaja, IglesiaDeBaja } from '../dominio/bajaDeEstructura';
import type { DistritoDelAdmin } from '../dominio/distritosSinPastor';
import { nombreDeEncargado } from '../dominio/encargados';
import { ordenarPorNombre, type IglesiaDelAdmin } from '../dominio/estructuraDelAdmin';

export type EstructuraDelAdmin = {
  asociacion: { id: string; nombre: string };
  /** The active ones: what the gestion counts and lists. */
  distritos: DistritoDelAdmin[];
  iglesias: IglesiaDelAdmin[];
  /** Those dados de baja, listed apart to reactivar them. */
  distritosDeBaja: DistritoDeBaja[];
  iglesiasDeBaja: IglesiaDeBaja[];
};

/**
 * The asociacion the usuario signed in is admin of, with its distritos (each
 * with its pastores) and its iglesias, ordered by nombre, and apart those
 * dados de baja. Null when they are admin of none.
 *
 * There is one asociacion for now: an admin of several sees the first one.
 * The policies let the admin read the cargos de pastor of their asociacion and
 * the perfiles and correos of whoever holds them
 * (20261018000000_create_perfiles_y_secretaria.sql).
 */
export async function getEstructuraDelAdmin(): Promise<EstructuraDelAdmin | null> {
  const { data: sesion, error: sesionError } = await supabase.auth.getSession();

  if (sesionError) {
    throw new Error(`Could not read the session: ${sesionError.message}`);
  }

  const usuarioId = sesion.session?.user.id;
  if (!usuarioId) {
    return null;
  }

  const cargos = await supabase
    .from('cargos')
    .select('asociacion_id')
    .eq('usuario_id', usuarioId)
    .not('asociacion_id', 'is', null)
    .order('asociacion_id')
    .limit(1);

  if (cargos.error) {
    throw new Error(`Could not read the cargos: ${cargos.error.message}`);
  }

  const asociacionId = cargos.data[0]?.asociacion_id;
  if (!asociacionId) {
    return null;
  }

  const [asociacion, distritos] = await Promise.all([
    supabase.from('asociaciones').select('id, nombre').eq('id', asociacionId).single(),
    supabase.from('distritos').select('id, nombre, de_baja').eq('asociacion_id', asociacionId),
  ]);

  if (asociacion.error) {
    throw new Error(`Could not read the asociacion: ${asociacion.error.message}`);
  }
  if (distritos.error) {
    throw new Error(`Could not read the distritos: ${distritos.error.message}`);
  }

  const distritoIds = distritos.data.map((distrito) => distrito.id);
  const [todas, pastores, encargados, correos] = await Promise.all([
    supabase
      .from('iglesias')
      .select('id, nombre, direccion, localidad, distrito_id, de_baja')
      .in('distrito_id', distritoIds),
    supabase.from('cargos').select('usuario_id, distrito_id').in('distrito_id', distritoIds),
    // Every cargo on an iglesia the admin reads: those of their asociacion.
    supabase.from('cargos').select('iglesia_id').not('iglesia_id', 'is', null),
    supabase.rpc('get_usuario_emails'),
  ]);

  if (todas.error) {
    throw new Error(`Could not read the iglesias: ${todas.error.message}`);
  }
  if (pastores.error) {
    throw new Error(`Could not read the pastores: ${pastores.error.message}`);
  }
  if (encargados.error) {
    throw new Error(`Could not read the encargados: ${encargados.error.message}`);
  }
  if (correos.error) {
    throw new Error(`Could not read the correos: ${correos.error.message}`);
  }

  const usuarioIds = [...new Set(pastores.data.map((cargo) => cargo.usuario_id))];
  const perfiles =
    usuarioIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('perfiles').select('usuario_id, nombre').in('usuario_id', usuarioIds);

  if (perfiles.error) {
    throw new Error(`Could not read the perfiles: ${perfiles.error.message}`);
  }

  const nombreDe = new Map(perfiles.data.map((perfil) => [perfil.usuario_id, perfil.nombre]));
  const correoDe = new Map(correos.data.map((fila) => [fila.usuario_id, fila.email]));
  const distritoDe = new Map(distritos.data.map((distrito) => [distrito.id, distrito]));
  const iglesias = todas.data.filter((iglesia) => !iglesia.de_baja);
  const encargadosDe = new Map<string, number>();
  for (const cargo of encargados.data) {
    if (cargo.iglesia_id !== null) {
      encargadosDe.set(cargo.iglesia_id, (encargadosDe.get(cargo.iglesia_id) ?? 0) + 1);
    }
  }

  return {
    asociacion: asociacion.data,
    distritos: ordenarPorNombre(
      distritos.data
        .filter((distrito) => !distrito.de_baja)
        .map((distrito): DistritoDelAdmin => ({
          id: distrito.id,
          nombre: distrito.nombre,
          cantidadDeIglesias: iglesias.filter((iglesia) => iglesia.distrito_id === distrito.id)
            .length,
          pastores: pastores.data
            .filter((cargo) => cargo.distrito_id === distrito.id)
            .map((cargo) =>
              nombreDeEncargado(
                nombreDe.get(cargo.usuario_id) ?? null,
                correoDe.get(cargo.usuario_id) ?? null,
              ),
            ),
        })),
    ),
    iglesias: ordenarPorNombre(
      iglesias.map((iglesia): IglesiaDelAdmin => ({
        id: iglesia.id,
        nombre: iglesia.nombre,
        direccion: iglesia.direccion,
        localidad: iglesia.localidad,
        distritoId: iglesia.distrito_id,
        distritoNombre: distritoDe.get(iglesia.distrito_id)?.nombre ?? '',
        cantidadDeEncargados: encargadosDe.get(iglesia.id) ?? 0,
      })),
    ),
    distritosDeBaja: ordenarPorNombre(
      distritos.data
        .filter((distrito) => distrito.de_baja)
        .map((distrito): DistritoDeBaja => ({ id: distrito.id, nombre: distrito.nombre })),
    ),
    iglesiasDeBaja: ordenarPorNombre(
      todas.data
        .filter((iglesia) => iglesia.de_baja)
        .map((iglesia): IglesiaDeBaja => {
          const distrito = distritoDe.get(iglesia.distrito_id);
          return {
            id: iglesia.id,
            nombre: iglesia.nombre,
            distritoNombre: distrito?.nombre ?? '',
            distritoDeBaja: distrito?.de_baja ?? false,
          };
        }),
    ),
  };
}
