import { supabase } from '@/shared/supabase';

import type { ValoresDeLaIglesia } from '../dominio/estructuraDelAdmin';

/**
 * Creates an iglesia, or edits one when `iglesiaId` is given. Editing its
 * distrito moves it: its calendario follows the new distrito, and its eventos,
 * lugares and encargados stay with it. Only the admin of the asociacion can
 * (20261022100000_write_distritos_e_iglesias.sql). Returns its id.
 */
export async function guardarIglesia({
  iglesiaId,
  valores,
}: {
  iglesiaId: string | null;
  valores: ValoresDeLaIglesia;
}): Promise<string> {
  const fila = {
    nombre: valores.nombre,
    direccion: valores.direccion,
    localidad: valores.localidad,
    distrito_id: valores.distritoId,
  };

  if (iglesiaId === null) {
    const { data, error } = await supabase.from('iglesias').insert(fila).select('id').single();

    if (error) {
      throw new Error(`Could not create the iglesia: ${error.message}`);
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from('iglesias')
    .update(fila)
    .eq('id', iglesiaId)
    .select('id');

  if (error) {
    throw new Error(`Could not save the iglesia: ${error.message}`);
  }
  // A policy that does not cover the row updates nothing, without an error.
  if (data.length === 0) {
    throw new Error(`The iglesia ${iglesiaId} was not saved`);
  }

  return iglesiaId;
}

/** Moves an iglesia to another distrito, keeping the rest of it. */
export async function moverIglesia({
  iglesiaId,
  distritoId,
}: {
  iglesiaId: string;
  distritoId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from('iglesias')
    .update({ distrito_id: distritoId })
    .eq('id', iglesiaId)
    .select('id');

  if (error) {
    throw new Error(`Could not move the iglesia: ${error.message}`);
  }
  if (data.length === 0) {
    throw new Error(`The iglesia ${iglesiaId} was not moved`);
  }
}
