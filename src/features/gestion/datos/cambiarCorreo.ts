import { supabase } from '@/shared/supabase';

import type { FallaDeCambioDeCorreo, ResultadoDeCambioDeCorreo } from '../dominio/cambioDeCorreo';
import { leerFalla } from './leerFalla';

const FALLAS: readonly FallaDeCambioDeCorreo[] = [
  'sin_sesion',
  'pedido_invalido',
  'sin_permiso',
  'correo_en_uso',
  'error_servidor',
];

/**
 * Changes the correo of a usuario through the server function
 * `cambiar-correo`. Only an admin can: the server decides it.
 */
export async function cambiarCorreo({
  usuarioId,
  correo,
}: {
  usuarioId: string;
  correo: string;
}): Promise<ResultadoDeCambioDeCorreo> {
  const { error } = await supabase.functions.invoke('cambiar-correo', {
    body: { usuarioId, correo },
  });

  if (error) {
    return { ok: false, falla: await leerFalla(error, FALLAS) };
  }
  return { ok: true };
}
