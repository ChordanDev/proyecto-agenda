import { supabase } from '@/shared/supabase';

import type { DatosDelDistrito } from '../dominio/estructuraDelAdmin';

/**
 * Creates a distrito in the asociacion, or renames one when `distritoId` is
 * given. Only the admin of the asociacion can
 * (20261022100000_write_distritos_e_iglesias.sql). Returns its id.
 */
export async function guardarDistrito({
  asociacionId,
  distritoId,
  valores,
}: {
  asociacionId: string;
  distritoId: string | null;
  valores: DatosDelDistrito;
}): Promise<string> {
  if (distritoId === null) {
    const { data, error } = await supabase
      .from('distritos')
      .insert({ asociacion_id: asociacionId, nombre: valores.nombre })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Could not create the distrito: ${error.message}`);
    }

    return data.id;
  }

  const { data, error } = await supabase
    .from('distritos')
    .update({ nombre: valores.nombre })
    .eq('id', distritoId)
    .select('id');

  if (error) {
    throw new Error(`Could not save the distrito: ${error.message}`);
  }
  // A policy that does not cover the row updates nothing, without an error.
  if (data.length === 0) {
    throw new Error(`The distrito ${distritoId} was not saved`);
  }

  return distritoId;
}
