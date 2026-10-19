import { supabase } from '@/shared/supabase';

/**
 * Removes a cargo, at once. The usuario keeps their account: without cargos,
 * they are a hermano. The database rejects it when the usuario signed in does
 * not manage the cargo (public.quitar_cargo).
 */
export async function quitarCargo(cargoId: string): Promise<void> {
  const { error } = await supabase.rpc('quitar_cargo', { cargo_id: cargoId });

  if (error) {
    throw new Error(`Could not remove the cargo: ${error.message}`);
  }
}
