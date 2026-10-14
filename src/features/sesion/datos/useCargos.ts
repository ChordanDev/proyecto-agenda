import { useQuery } from '@tanstack/react-query';

import { getCargosDelUsuario } from './getCargosDelUsuario';
import { useSesion } from './useSesion';

/** The cargos of the usuario; it only reads them while there is a session. */
export function useCargos() {
  const hasSesion = useSesion() === true;

  return useQuery({
    queryKey: ['cargos'],
    queryFn: getCargosDelUsuario,
    enabled: hasSesion,
  });
}
