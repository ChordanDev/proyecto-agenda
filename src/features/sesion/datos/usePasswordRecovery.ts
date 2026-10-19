import { useMutation, useQueryClient } from '@tanstack/react-query';

import { choosePassword, sendCode, verifyCode } from './passwordRecovery';
import { discardUnfinishedRecovery } from './unfinishedRecovery';
import { forgetSesion } from './useLeaveSesion';
import { rememberSesion } from './rememberSesion';

// Out of the app since #126: the sign-in is only with a code by email, with no
// password. Kept, with no screen using it, in case the password comes back.

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
    onSuccess: () => rememberSesion(queryClient),
  });
}

/**
 * Leaves the flow after the code and before the password: the session the code
 * opened is signed out, as if the code had never been checked.
 */
export function useAbandonRecovery() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: discardUnfinishedRecovery,
    // Removing the session from the phone needs no connection.
    networkMode: 'always',
    onSettled: () => forgetSesion(queryClient),
  });
}
