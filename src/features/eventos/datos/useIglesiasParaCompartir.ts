import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/shared/supabase';

import type { IglesiaParaCompartir } from '../dominio/opcionesParaCompartir';

/**
 * Reads every iglesia of the asociacion with its distrito and its coordenadas
 * when it has them: the ones an evento can be shared with.
 */
export async function getIglesiasParaCompartir(): Promise<IglesiaParaCompartir[]> {
  const { data, error } = await supabase
    .from('iglesias')
    .select('id, nombre, distrito_id, latitud, longitud, distritos (nombre)');

  if (error) {
    throw new Error(`Could not read the iglesias to share with: ${error.message}`);
  }

  return data.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    distritoId: row.distrito_id,
    distrito: row.distritos.nombre,
    ...(row.latitud !== null &&
      row.longitud !== null && { coordenadas: { latitud: row.latitud, longitud: row.longitud } }),
  }));
}

/** The iglesias an evento can be shared with; undefined while they are read. */
export function useIglesiasParaCompartir() {
  return useQuery({ queryKey: ['iglesias-para-compartir'], queryFn: getIglesiasParaCompartir });
}
