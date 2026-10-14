import { useQuery } from '@tanstack/react-query';

import { getEmailDelUsuario } from './getEmailDelUsuario';
import { useSesion } from './useSesion';

/**
 * The email of the usuario; it only reads it while there is a session. Leaving
 * the session (signing out or deleting the usuario) removes it, so the next
 * usuario to sign in reads their own.
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
