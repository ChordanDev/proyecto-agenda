import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { actualizarRecordatorios } from '@/features/recordatorios/datos/sincronizarRecordatorios';

import { deleteOwnUsuario } from './deleteOwnUsuario';
import { signOut } from './signOut';

/**
 * What the app knows once the session is gone: there is none, and the data of
 * the usuario does not stay behind for whoever signs in next. Removing a query
 * also drops it from the copy saved on the phone. The calendario of the iglesia
 * elegida stays: any hermano may see it, and it is what there is to show offline.
 */
export function forgetSesion(queryClient: QueryClient) {
  queryClient.setQueryData(['sesion'], false);
  queryClient.removeQueries({ queryKey: ['sesion', 'email'] });
  queryClient.removeQueries({ queryKey: ['cargos'] });
  // Its key does not say whose cargos it was read with.
  queryClient.removeQueries({ queryKey: ['calendario', 'usuario'] });
  // Everything of the chat belongs to the usuario, such as their consentimiento.
  queryClient.removeQueries({ queryKey: ['chat'] });
}

/**
 * Once the session is gone, the phone follows the iglesia elegida again. In
 * the background: leaving must not wait for the connection.
 */
function leaveSesion(queryClient: QueryClient) {
  forgetSesion(queryClient);
  void actualizarRecordatorios(queryClient);
}

/** Signs out on this phone. */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    // Removing the session from the phone needs no connection.
    networkMode: 'always',
    onSuccess: () => leaveSesion(queryClient),
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
    onSuccess: () => leaveSesion(queryClient),
  });
}
