import { supabase } from '@/shared/supabase';

import type { Iglesia } from '../dominio/buscarIglesias';

/**
 * Reads every church with the name of its distrito and its coordinates when it
 * has them, ordered by name. Those dadas de baja come too, with their mark: the
 * buscador leaves them out, and an iglesia elegida that was given de baja is
 * told apart from one that was never chosen.
 */
export async function getIglesias(): Promise<Iglesia[]> {
  const { data, error } = await supabase
    .from('iglesias')
    .select(
      'id, nombre, direccion, ciudad, provincia, excluida_del_buscador, de_baja, latitud, longitud, distritos (nombre)',
    )
    .order('nombre');

  if (error) {
    throw new Error(`Could not read iglesias: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    ciudad: row.ciudad,
    provincia: row.provincia,
    distrito: row.distritos.nombre,
    excluidaDelBuscador: row.excluida_del_buscador,
    deBaja: row.de_baja,
    ...(row.latitud !== null &&
      row.longitud !== null && { coordenadas: { latitud: row.latitud, longitud: row.longitud } }),
  }));
}
