import { supabase } from '@/shared/supabase';

/**
 * Changes the nombre of whoever holds a cargo and the funcion of the cargo. A
 * null funcion removes it. The database rejects it when the usuario signed in
 * does not manage the cargo (public.editar_cargo).
 */
export async function editarCargo({
  cargoId,
  nombre,
  funcion,
}: {
  cargoId: string;
  nombre: string;
  funcion: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc('editar_cargo', {
    cargo_id: cargoId,
    nombre,
    funcion: funcion ?? undefined,
  });

  if (error) {
    throw new Error(`Could not edit the cargo: ${error.message}`);
  }
}
