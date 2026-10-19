import { useMutation, useQueryClient } from '@tanstack/react-query';

import { quitarEventoDeIglesia } from './escribirEvento';

/**
 * Quita an evento from the calendario of one of its iglesias sumadas. The
 * calendarios and the evento are read again: it leaves the calendario of that
 * iglesia, and the detail shows the list of iglesias without it.
 */
export function useQuitarEventoDeIglesia(eventoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // Like every write, it is never queued for later: it needs a connection now.
    networkMode: 'always',
    mutationFn: (iglesiaId: string) => quitarEventoDeIglesia(eventoId, iglesiaId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calendario'] }),
        queryClient.invalidateQueries({ queryKey: ['evento', eventoId] }),
      ]),
  });
}
