import { useQuery } from '@tanstack/react-query';

import { useSesion } from '@/features/sesion/datos/useSesion';

import { getEncargadosDeIglesia } from './getEncargadosDeIglesia';

// Under ['cargos']: signing out removes them (forgetSesion), correos included.
export function encargadosQueryKey(iglesiaId: string) {
  return ['cargos', 'encargados', iglesiaId] as const;
}

/** The iglesia and its encargados; it only reads them while there is a session. */
export function useEncargadosDeIglesia(iglesiaId: string) {
  const hasSesion = useSesion() === true;

  return useQuery({
    queryKey: encargadosQueryKey(iglesiaId),
    queryFn: () => getEncargadosDeIglesia(iglesiaId),
    enabled: hasSesion,
  });
}
