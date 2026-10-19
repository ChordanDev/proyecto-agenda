import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { FallaDeGestion, ValoresDelEncargado } from '../dominio/encargados';
import { editarCargo } from './editarCargo';
import { invitarCargo } from './invitarCargo';
import { quitarCargo } from './quitarCargo';
import { encargadosQueryKey } from './useEncargadosDeIglesia';

/** The answer of a write of the gestion; a write that throws fails as `error_servidor`. */
export type ResultadoDeGestion = { ok: true } | { ok: false; falla: FallaDeGestion };

/** After a write, the encargados of the iglesia are read again, so the list shows it. */
function useInvalidarEncargados(iglesiaId: string) {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: encargadosQueryKey(iglesiaId) });
}

/** What every write of the gestion shares. */
function useEscribir<Variables>(
  iglesiaId: string,
  escribir: (variables: Variables) => Promise<ResultadoDeGestion>,
) {
  const invalidar = useInvalidarEncargados(iglesiaId);

  return useMutation({
    // A write is never queued for later: without a connection it fails now and
    // the form keeps what was written.
    networkMode: 'always',
    mutationFn: async (variables: Variables): Promise<ResultadoDeGestion> => {
      try {
        return await escribir(variables);
      } catch {
        return { ok: false, falla: 'error_servidor' };
      }
    },
    // Also after a failure: a correo de bienvenida that was not sent still
    // leaves the cargo saved.
    onSettled: () => invalidar(),
  });
}

/**
 * Adds an encargado to the iglesia: gives the cargo to the usuario of the
 * correo, as a common encargado. Only the pastor or the admin name a
 * secretaria de iglesia.
 */
export function useAgregarEncargado(iglesiaId: string) {
  return useEscribir(iglesiaId, ({ nombre, correo, funcion }: ValoresDelEncargado) =>
    invitarCargo({
      nombre,
      correo,
      funcion,
      lugar: { nivel: 'iglesia', iglesiaId, esSecretaria: false },
    }),
  );
}

/** Changes the nombre and the funcion of an encargado. */
export function useEditarEncargado(iglesiaId: string, cargoId: string) {
  return useEscribir(iglesiaId, ({ nombre, funcion }: ValoresDelEncargado) =>
    editarCargo({ cargoId, nombre, funcion }),
  );
}

/** Removes the cargo of an encargado; their account stays. */
export function useQuitarEncargado(iglesiaId: string, cargoId: string) {
  return useEscribir(iglesiaId, async () => {
    await quitarCargo(cargoId);
    return { ok: true } as const;
  });
}
