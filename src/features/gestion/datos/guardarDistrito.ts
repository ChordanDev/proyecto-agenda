import { supabase } from '@/shared/supabase';

import type { DatosDelDistrito } from '../dominio/estructuraDelAdmin';

/**
 * Creating a distrito with the id the app chose, the same on every try, or
 * editing an existing one.
 */
export type GuardarComo = { crear: string } | { editar: string };

/** Postgres rejected an insert because a row with its id already exists. */
export const DUPLICADO = '23505';

/**
 * Creates a distrito in the asociacion, or renames one. Only the admin of the
 * asociacion can (20261022100000_write_distritos_e_iglesias.sql). Returns its
 * id.
 *
 * A create sent again after its answer was lost finds the distrito already
 * created, and renames it to what the form holds instead of creating another.
 */
export async function guardarDistrito(
  asociacionId: string,
  valores: DatosDelDistrito,
  como: GuardarComo,
): Promise<string> {
  if ('crear' in como) {
    const { error } = await supabase
      .from('distritos')
      .insert({ id: como.crear, asociacion_id: asociacionId, nombre: valores.nombre })
      .select('id')
      .single();

    if (!error) {
      return como.crear;
    }
    if (error.code !== DUPLICADO) {
      throw new Error(`Could not create the distrito: ${error.message}`);
    }
  }

  const id = 'crear' in como ? como.crear : como.editar;
  const { data, error } = await supabase
    .from('distritos')
    .update({ nombre: valores.nombre })
    .eq('id', id)
    .select('id');

  if (error) {
    throw new Error(`Could not save the distrito: ${error.message}`);
  }
  // A policy that does not cover the row updates nothing, without an error.
  if (data.length === 0) {
    throw new Error(`The distrito ${id} was not saved`);
  }

  return id;
}
