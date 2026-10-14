import { useMutation, useQueryClient } from '@tanstack/react-query';

import { choosePassword, sendCode, verifyCode } from './passwordRecovery';

// Every step talks to the auth service: a failed connection must come back as
// an error to show, not wait for a network that may not return.

export function useSendCode() {
  return useMutation({ mutationFn: sendCode, networkMode: 'always' });
}

export function useVerifyCode() {
  return useMutation({ mutationFn: verifyCode, networkMode: 'always' });
}

/**
 * Stores the new password. Only then the app counts the session: the code
 * signs the usuario in, but the flow is not over until there is a password.
 */
export function useChoosePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: choosePassword,
    networkMode: 'always',
    onSuccess: async () => {
      queryClient.setQueryData(['sesion'], true);
      // The cargos of whoever was signed in before are not these ones.
      await queryClient.invalidateQueries({ queryKey: ['cargos'] });
    },
  });
}
