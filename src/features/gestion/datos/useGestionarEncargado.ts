import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { FallaDeGestion, ValoresDelEncargado } from '../dominio/encargados';
import { editarCargo } from './editarCargo';
import { invitarCargo } from './invitarCargo';
import { quitarCargo } from './quitarCargo';
import { encargadosQueryKey } from './useEncargadosDeIglesia';
import { GESTION_DEL_PASTOR_QUERY_KEY } from './useGestionDelPastor';

/** The answer of a write of the gestion; a write that throws fails as `error_servidor`. */
export type ResultadoDeGestion = { ok: true } | { ok: false; falla: FallaDeGestion };

/**
 * After a write, the encargados of the iglesia and the gestion of the pastor
 * are read again, so the lists show it.
 */
function useInvalidarEncargados() {
  const queryClient = useQueryClient();

  return (iglesiaId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: encargadosQueryKey(iglesiaId) }),
      queryClient.invalidateQueries({ queryKey: GESTION_DEL_PASTOR_QUERY_KEY }),
    ]);
}

/** What every write of the gestion shares; `iglesiaDe` says which iglesia it changes. */
function useEscribir<Variables>(
  escribir: (variables: Variables) => Promise<ResultadoDeGestion>,
  iglesiaDe: (variables: Variables) => string,
) {
  const invalidar = useInvalidarEncargados();

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
    onSettled: (_resultado, _error, variables) => invalidar(iglesiaDe(variables)),
  });
}

export type NuevoEncargado = {
  valores: ValoresDelEncargado;
  iglesiaId: string;
  /** Only the pastor or the admin name a secretaria de iglesia; the server decides again. */
  esSecretaria: boolean;
};

/**
 * Adds an encargado to an iglesia: gives the cargo to the usuario of the
 * correo, as a common encargado or as a secretaria de iglesia.
 */
export function useAgregarEncargado() {
  return useEscribir(
    ({ valores: { nombre, correo, funcion }, iglesiaId, esSecretaria }: NuevoEncargado) =>
      invitarCargo({
        nombre,
        correo,
        funcion,
        lugar: { nivel: 'iglesia', iglesiaId, esSecretaria },
      }),
    ({ iglesiaId }) => iglesiaId,
  );
}

/**
 * Changes the nombre and the funcion of an encargado and, when given, their
 * mark of secretaria de iglesia.
 */
export function useEditarEncargado(iglesiaId: string, cargoId: string) {
  return useEscribir(
    ({ nombre, funcion, esSecretaria }: ValoresDelEncargado & { esSecretaria?: boolean }) =>
      editarCargo({ cargoId, nombre, funcion, esSecretaria }),
    () => iglesiaId,
  );
}

/** Removes the cargo of an encargado; their account stays. */
export function useQuitarEncargado(iglesiaId: string, cargoId: string) {
  return useEscribir(
    async () => {
      await quitarCargo(cargoId);
      return { ok: true } as const;
    },
    () => iglesiaId,
  );
}
