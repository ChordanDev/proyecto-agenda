import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { deleteOwnUsuario } from './deleteOwnUsuario';
import { signOut } from './signOut';

/**
 * What the app knows once the session is gone: there is none, and the data of
 * the usuario does not stay behind for whoever signs in next.
 */
function forgetSesion(queryClient: QueryClient) {
  queryClient.setQueryData(['sesion'], false);
  queryClient.removeQueries({ queryKey: ['sesion', 'email'] });
  queryClient.removeQueries({ queryKey: ['cargos'] });
}

/** Signs out on this phone. */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    // Removing the session from the phone needs no connection.
    networkMode: 'always',
    onSuccess: () => forgetSesion(queryClient),
  });
}

/** "Eliminar mi cuenta": deletes the usuario who is signed in, then signs out. */
export function useDeleteOwnUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteOwnUsuario,
    // A failed connection must come back as an error to show, not wait for a
    // network that may not return.
    networkMode: 'always',
    onSuccess: () => forgetSesion(queryClient),
  });
}
