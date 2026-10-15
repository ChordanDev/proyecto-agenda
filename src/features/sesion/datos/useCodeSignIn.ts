import { useMutation, useQueryClient } from '@tanstack/react-query';

import { sendSignInCode, verifySignInCode } from './codeSignIn';

// Both steps talk to the auth service: a failed connection must come back as
// an error to show, not wait for a network that may not return.

export function useSendSignInCode() {
  return useMutation({ mutationFn: sendSignInCode, networkMode: 'always' });
}

/** Checks the code; on success the app knows there is a session. */
export function useVerifySignInCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifySignInCode,
    networkMode: 'always',
    onSuccess: async () => {
      queryClient.setQueryData(['sesion'], true);
      // The cargos of whoever was signed in before are not these ones.
      await queryClient.invalidateQueries({ queryKey: ['cargos'] });
    },
  });
}
