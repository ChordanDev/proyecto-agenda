import { supabase } from '@/shared/supabase';

import type {
  FallaDeInvitacion,
  LugarDeInvitacion,
  ResultadoDeInvitacion,
} from '../dominio/invitacion';
import { leerFalla } from './leerFalla';

const FALLAS: readonly FallaDeInvitacion[] = [
  'sin_sesion',
  'pedido_invalido',
  'sin_permiso',
  'correo_no_enviado',
  'error_servidor',
];

export type Invitacion = {
  nombre: string;
  correo: string;
  funcion: string | null;
  lugar: LugarDeInvitacion;
};

/**
 * Gives a cargo to the usuario of a correo through the server function
 * `invitar`, which creates the usuario when the correo has no account and sends
 * the correo de bienvenida. The server decides whether the usuario signed in
 * may give it.
 */
export async function invitarCargo({
  nombre,
  correo,
  funcion,
  lugar,
}: Invitacion): Promise<ResultadoDeInvitacion> {
  const { data, error } = await supabase.functions.invoke<{ usuarioNuevo: boolean }>('invitar', {
    body: {
      nombre,
      correo,
      funcion,
      ...(lugar.nivel === 'iglesia'
        ? { iglesiaId: lugar.iglesiaId, esSecretaria: lugar.esSecretaria }
        : { distritoId: lugar.distritoId }),
    },
  });

  if (error) {
    return { ok: false, falla: await leerFalla(error, FALLAS) };
  }
  return { ok: true, usuarioNuevo: data?.usuarioNuevo ?? false };
}
