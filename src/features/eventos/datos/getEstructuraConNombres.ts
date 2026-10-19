import { supabase } from '@/shared/supabase';

import type { EstructuraConNombres } from '../dominio/opcionesDeDuenio';

/**
 * Reads every asociacion, distrito and iglesia with its nombre: the duenios a
 * form can offer. Those dados de baja are no duenio of anything new.
 */
export async function getEstructuraConNombres(): Promise<EstructuraConNombres> {
  const [asociaciones, distritos, iglesias] = await Promise.all([
    supabase.from('asociaciones').select('id, nombre'),
    supabase.from('distritos').select('id, nombre, asociacion_id').eq('de_baja', false),
    supabase.from('iglesias').select('id, nombre, distrito_id').eq('de_baja', false),
  ]);

  const error = asociaciones.error ?? distritos.error ?? iglesias.error;

  if (error) {
    throw new Error(`Could not read the structure: ${error.message}`);
  }

  return {
    asociaciones: asociaciones.data ?? [],
    distritos: (distritos.data ?? []).map((row) => ({
      id: row.id,
      nombre: row.nombre,
      asociacionId: row.asociacion_id,
    })),
    iglesias: (iglesias.data ?? []).map((row) => ({
      id: row.id,
      nombre: row.nombre,
      distritoId: row.distrito_id,
    })),
  };
}
