import { supabase } from '@/shared/supabase';

import type { Iglesia } from '../dominio/buscarIglesias';

/** Reads every church with the name of its distrito, ordered by name. */
export async function getIglesias(): Promise<Iglesia[]> {
  const { data, error } = await supabase
    .from('iglesias')
    .select('id, nombre, direccion, localidad, excluida_del_buscador, distritos (nombre)')
    .order('nombre');

  if (error) {
    throw new Error(`Could not read iglesias: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    direccion: row.direccion,
    localidad: row.localidad,
    distrito: row.distritos.nombre,
    excluidaDelBuscador: row.excluida_del_buscador,
  }));
}
