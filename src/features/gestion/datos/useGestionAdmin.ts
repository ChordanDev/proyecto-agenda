import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { DatosDelDistrito, ValoresDeLaIglesia } from '../dominio/estructuraDelAdmin';
import { getEstructuraDelAdmin } from './getEstructuraDelAdmin';
import { guardarDistrito, type GuardarComo } from './guardarDistrito';
import { guardarIglesia, moverIglesia } from './guardarIglesia';

// Under ['cargos']: it holds the nombres of the pastores, and signing out
// removes it (forgetSesion).
export const ESTRUCTURA_DEL_ADMIN_QUERY_KEY = ['cargos', 'estructura-del-admin'] as const;

/** The asociacion of the admin with its distritos and iglesias; null when they are admin of none. */
export function useEstructuraDelAdmin() {
  return useQuery({ queryKey: ESTRUCTURA_DEL_ADMIN_QUERY_KEY, queryFn: getEstructuraDelAdmin });
}

/** The answer of a write of the admin: the id of what was saved, or a failure. */
export type ResultadoDelAdmin = { ok: true; id: string } | { ok: false };

/** What every write of the structure shares. */
function useEscribirEstructura<Variables>(escribir: (variables: Variables) => Promise<string>) {
  const queryClient = useQueryClient();

  return useMutation({
    // A write is never queued for later: without a connection it fails now and
    // the form keeps what was written.
    networkMode: 'always',
    mutationFn: async (variables: Variables): Promise<ResultadoDelAdmin> => {
      try {
        return { ok: true, id: await escribir(variables) };
      } catch {
        return { ok: false };
      }
    },
    // The structure is under every calendario, list of iglesias and option of
    // duenio: a new distrito or a moved iglesia changes all of them, so all is
    // read again. It changes rarely.
    onSettled: () => queryClient.invalidateQueries(),
  });
}

/**
 * Creates a distrito of the asociacion, or renames one. A new one keeps the id
 * the form chose on every try, so trying again never creates two.
 */
export function useGuardarDistrito(asociacionId: string, como: GuardarComo) {
  return useEscribirEstructura((valores: DatosDelDistrito) =>
    guardarDistrito(asociacionId, valores, como),
  );
}

/**
 * Creates an iglesia, or edits one, its distrito included. A new one keeps the
 * id the form chose on every try, so trying again never creates two.
 */
export function useGuardarIglesia(como: GuardarComo) {
  return useEscribirEstructura((valores: ValoresDeLaIglesia) => guardarIglesia(valores, como));
}

/** Moves an iglesia to another distrito: "Sacar" in Editar distrito. */
export function useMoverIglesia() {
  return useEscribirEstructura(async (variables: { iglesiaId: string; distritoId: string }) => {
    await moverIglesia(variables);
    return variables.iglesiaId;
  });
}
