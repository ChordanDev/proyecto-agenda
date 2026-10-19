import { supabase } from '@/shared/supabase';

import type { IglesiaEnEstructura } from '../dominio/armarCalendario';

/** An iglesia with its place in the structure and the nombres a header shows. */
export type IglesiaConEstructura = IglesiaEnEstructura & {
  nombre: string;
  /** Nombre of its distrito. */
  distrito: string;
  /** Dada de baja: no cargo covers it (getIglesiasDeCargos). */
  deBaja: boolean;
};

/** Reads every iglesia with the levels it depends on, ordered by nombre. */
export async function getIglesiasEnEstructura(): Promise<IglesiaConEstructura[]> {
  const { data, error } = await supabase
    .from('iglesias')
    .select('id, nombre, distrito_id, de_baja, distritos (nombre, asociacion_id)')
    .order('nombre');

  if (error) {
    throw new Error(`Could not read the iglesias of the structure: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    distritoId: row.distrito_id,
    asociacionId: row.distritos.asociacion_id,
    distrito: row.distritos.nombre,
    deBaja: row.de_baja,
  }));
}
