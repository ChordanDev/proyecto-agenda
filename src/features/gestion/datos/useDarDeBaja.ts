import { useMutation, useQueryClient } from '@tanstack/react-query';

import { darDeBaja, reactivar, type Baja } from './darDeBaja';

/** What every change of baja shares: true when it was done. */
function useCambiarBaja(cambiar: (baja: Baja) => Promise<void>) {
  const queryClient = useQueryClient();

  return useMutation({
    // Never queued for later: without a connection it fails now.
    networkMode: 'always',
    mutationFn: async (baja: Baja): Promise<boolean> => {
      try {
        await cambiar(baja);
        return true;
      } catch {
        return false;
      }
    },
    // An iglesia or a distrito that leaves or comes back changes every
    // calendario, list of iglesias, option of duenio and the cargos: all is
    // read again, as after any write of the structure. Not awaited, so the
    // form closes before the iglesia it shows leaves the list.
    onSettled: () => {
      void queryClient.invalidateQueries();
    },
  });
}

/** "Dar de baja" of an iglesia or a distrito, for the admin. */
export function useDarDeBaja() {
  return useCambiarBaja(darDeBaja);
}

/** "Reactivar" of an iglesia or a distrito dado de baja, for the admin. */
export function useReactivar() {
  return useCambiarBaja(reactivar);
}
