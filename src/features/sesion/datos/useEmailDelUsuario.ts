import { useQuery } from '@tanstack/react-query';

import { getEmailDelUsuario } from './getEmailDelUsuario';
import { useSesion } from './useSesion';

/**
 * The email of the usuario; it only reads it while there is a session. Under
 * the key of the session, so whoever invalidates the session reads it again.
 */
export function useEmailDelUsuario() {
  const hasSesion = useSesion() === true;

  return useQuery({
    queryKey: ['sesion', 'email'],
    queryFn: getEmailDelUsuario,
    enabled: hasSesion,
    // The client answers from what it holds, without a request.
    networkMode: 'always',
    retry: false,
    staleTime: Infinity,
  });
}
