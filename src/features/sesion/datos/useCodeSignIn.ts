import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { actualizarRecordatorios } from '@/features/recordatorios/datos/sincronizarRecordatorios';

import { sendSignInCode, verifySignInCode } from './codeSignIn';
import { rememberSesion } from './rememberSesion';

// Both steps talk to the auth service: a failed connection must come back as
// an error to show, not wait for a network that may not return.

export function useSendSignInCode() {
  return useMutation({ mutationFn: sendSignInCode, networkMode: 'always' });
}

/**
 * Once the session is known, the phone follows the iglesias of the usuario
 * instead of the iglesia elegida. In the background: entering must not wait
 * for the connection.
 */
async function enterSesion(queryClient: QueryClient) {
  await rememberSesion(queryClient);
  void actualizarRecordatorios(queryClient);
}

/** Checks the code; on success the app knows there is a session. */
export function useVerifySignInCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifySignInCode,
    networkMode: 'always',
    onSuccess: () => enterSesion(queryClient),
  });
}
