import { useQuery } from '@tanstack/react-query';

import { useSesion } from '@/features/sesion/datos/useSesion';

import { getGestionDelPastor } from './getGestionDelPastor';

// Under ['cargos']: signing out removes them (forgetSesion), correos included.
export const GESTION_DEL_PASTOR_QUERY_KEY = ['cargos', 'pastor'] as const;

/**
 * The iglesias of the distritos of the pastor and their encargados; it only
 * reads them while there is a session and the distritos are known.
 */
export function useGestionDelPastor(distritoIds: readonly string[] | null) {
  const hasSesion = useSesion() === true;

  return useQuery({
    queryKey: [...GESTION_DEL_PASTOR_QUERY_KEY, distritoIds],
    // The month of the eventos is the one in course each time it is read.
    queryFn: () => getGestionDelPastor(distritoIds ?? [], new Date()),
    enabled: hasSesion && distritoIds !== null && distritoIds.length > 0,
  });
}
