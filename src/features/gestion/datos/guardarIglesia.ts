import { supabase } from '@/shared/supabase';

import type { ValoresDeLaIglesia } from '../dominio/estructuraDelAdmin';
import { DUPLICADO, type GuardarComo } from './guardarDistrito';

/**
 * Creates an iglesia, or edits one. Editing its distrito moves it: its
 * calendario follows the new distrito, and its eventos, lugares and encargados
 * stay with it. Only the admin of the asociacion can
 * (20261022100000_write_distritos_e_iglesias.sql). Returns its id.
 *
 * A create sent again after its answer was lost finds the iglesia already
 * created, and saves what the form holds on it instead of creating another.
 */
export async function guardarIglesia(
  valores: ValoresDeLaIglesia,
  como: GuardarComo,
): Promise<string> {
  const fila = {
    nombre: valores.nombre,
    direccion: valores.direccion,
    localidad: valores.localidad,
    distrito_id: valores.distritoId,
  };

  if ('crear' in como) {
    const { error } = await supabase
      .from('iglesias')
      .insert({ id: como.crear, ...fila })
      .select('id')
      .single();

    if (!error) {
      return como.crear;
    }
    if (error.code !== DUPLICADO) {
      throw new Error(`Could not create the iglesia: ${error.message}`);
    }
  }

  const id = 'crear' in como ? como.crear : como.editar;
  const { data, error } = await supabase.from('iglesias').update(fila).eq('id', id).select('id');

  if (error) {
    throw new Error(`Could not save the iglesia: ${error.message}`);
  }
  // A policy that does not cover the row updates nothing, without an error.
  if (data.length === 0) {
    throw new Error(`The iglesia ${id} was not saved`);
  }

  return id;
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
