import { useMutation, useQueryClient } from '@tanstack/react-query';

import { setIglesiaElegida } from './iglesiaElegida';

/** Stores the iglesia elegida of this phone, by its id. */
export function useElegirIglesia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: setIglesiaElegida,
    // A write to the phone storage: it needs no connection.
    networkMode: 'always',
    // The mutation settles once the new value has been read again, so whoever
    // waits for it already finds the iglesia elegida.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['iglesiaElegida'] }),
  });
}
