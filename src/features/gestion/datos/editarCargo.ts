import { supabase } from '@/shared/supabase';

/**
 * The answer of public.editar_cargo when the nombre would change but the usuario
 * holds a cargo the gestor does not manage: their perfil is not the gestor's to
 * change.
 */
const NOMBRE_COMPARTIDO = 'their nombre cannot change';

export type ResultadoDeEdicion = { ok: true } | { ok: false; falla: 'nombre_compartido' };

/**
 * Changes the nombre of whoever holds a cargo and the funcion of the cargo. A
 * null funcion removes it. A mark of secretaria de iglesia names or removes
 * one; without it the mark stays. The database rejects it when the usuario
 * signed in does not manage the cargo, or cannot give that mark
 * (public.editar_cargo); that, and anything else that fails, throws.
 */
export async function editarCargo({
  cargoId,
  nombre,
  funcion,
  esSecretaria,
}: {
  cargoId: string;
  nombre: string;
  funcion: string | null;
  esSecretaria?: boolean;
}): Promise<ResultadoDeEdicion> {
  const { error } = await supabase.rpc('editar_cargo', {
    cargo_id: cargoId,
    nombre,
    funcion: funcion ?? undefined,
    es_secretaria: esSecretaria,
  });

  if (error) {
    if (error.message.includes(NOMBRE_COMPARTIDO)) {
      return { ok: false, falla: 'nombre_compartido' };
    }
    throw new Error(`Could not edit the cargo: ${error.message}`);
  }
  return { ok: true };
}
