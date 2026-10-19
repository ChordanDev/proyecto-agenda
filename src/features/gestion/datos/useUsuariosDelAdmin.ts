import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ResultadoDeCambioDeCorreo } from '../dominio/cambioDeCorreo';
import type { ResultadoDeInvitacion } from '../dominio/invitacion';
import type { Alta, CargoDelUsuario } from '../dominio/usuariosDelAdmin';
import { cambiarCorreo } from './cambiarCorreo';
import { editarCargo, type ResultadoDeEdicion } from './editarCargo';
import { getUsuariosDelAdmin } from './getUsuariosDelAdmin';
import { invitarCargo } from './invitarCargo';
import { quitarCargo } from './quitarCargo';

// Under ['cargos']: it holds nombres and correos, and signing out removes it
// (forgetSesion).
export const USUARIOS_DEL_ADMIN_QUERY_KEY = ['cargos', 'usuarios-del-admin'] as const;

/** The usuarios with cargos of the asociacion; waits for its id. */
export function useUsuariosDelAdmin(asociacionId: string | undefined) {
  return useQuery({
    queryKey: [...USUARIOS_DEL_ADMIN_QUERY_KEY, asociacionId],
    queryFn: () => getUsuariosDelAdmin(asociacionId ?? ''),
    enabled: asociacionId !== undefined,
  });
}

/**
 * What every write of the tab Usuarios shares. A write that throws answers
 * `fallo`, as a failure of the server.
 */
function useEscribirUsuario<Variables, Resultado>(
  escribir: (variables: Variables) => Promise<Resultado>,
  fallo: Resultado,
) {
  const queryClient = useQueryClient();

  return useMutation({
    // A write is never queued for later: without a connection it fails now and
    // the form keeps what was written.
    networkMode: 'always',
    mutationFn: async (variables: Variables): Promise<Resultado> => {
      try {
        return await escribir(variables);
      } catch {
        return fallo;
      }
    },
    // Every list of the gestion shows cargos: the usuarios, the pastores of the
    // distritos, the encargados of an iglesia. Also after a failure: a correo de
    // bienvenida that was not sent still leaves the cargo saved.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cargos'] }),
  });
}

/** Gives one cargo, creating the usuario when the correo has no account. */
export function useDarCargo() {
  return useEscribirUsuario((alta: Alta): Promise<ResultadoDeInvitacion> => invitarCargo(alta), {
    ok: false,
    falla: 'error_servidor',
  } as ResultadoDeInvitacion);
}

export type ResultadoDeEscritura = ResultadoDeEdicion | { ok: false; falla: 'error_servidor' };

/**
 * Changes the nombre of a usuario, through one of their cargos, whose funcion
 * stays as it is.
 */
export function useGuardarNombre() {
  return useEscribirUsuario(
    ({
      cargo,
      nombre,
    }: {
      cargo: CargoDelUsuario;
      nombre: string;
    }): Promise<ResultadoDeEscritura> =>
      editarCargo({ cargoId: cargo.cargoId, nombre, funcion: cargo.funcion }),
    { ok: false, falla: 'error_servidor' } as ResultadoDeEscritura,
  );
}

/** Changes the funcion of a cargo; the nombre of the usuario stays as it is. */
export function useGuardarFuncion() {
  return useEscribirUsuario(
    ({
      cargoId,
      nombre,
      funcion,
    }: {
      cargoId: string;
      /** The nombre of their perfil, unchanged. */
      nombre: string;
      funcion: string | null;
    }): Promise<ResultadoDeEscritura> => editarCargo({ cargoId, nombre, funcion }),
    { ok: false, falla: 'error_servidor' } as ResultadoDeEscritura,
  );
}

/** Removes one cargo; the others of the usuario, and their account, stay. */
export function useQuitarCargo() {
  return useEscribirUsuario(
    async (cargoId: string): Promise<{ ok: boolean }> => {
      await quitarCargo(cargoId);
      return { ok: true };
    },
    { ok: false },
  );
}

/** Changes the correo of a usuario: the old one stops working to sign in. */
export function useCambiarCorreo() {
  return useEscribirUsuario(
    (variables: { usuarioId: string; correo: string }): Promise<ResultadoDeCambioDeCorreo> =>
      cambiarCorreo(variables),
    { ok: false, falla: 'error_servidor' } as ResultadoDeCambioDeCorreo,
  );
}
