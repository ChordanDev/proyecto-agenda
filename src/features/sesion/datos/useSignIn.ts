import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signIn } from './signIn';

// Out of the app since #126: the sign-in is only with a code by email, with no
// password. Kept, with no screen using it, in case the password comes back.

/** Signs in with email and password; on success the app knows there is a session. */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signIn,
    // A failed connection must come back as an error to show, not wait for a
    // network that may not return.
    networkMode: 'always',
    onSuccess: async () => {
      queryClient.setQueryData(['sesion'], true);
      // The cargos of whoever was signed in before are not these ones.
      await queryClient.invalidateQueries({ queryKey: ['cargos'] });
    },
  });
}
