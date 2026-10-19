import { supabase } from '@/shared/supabase';

/** The zona horaria of the asociacion of the usuario signed in, as an IANA name. */
export async function getZonaHoraria(): Promise<string> {
  const { data, error } = await supabase.rpc('get_zona_horaria_de_usuario');

  if (error) {
    throw new Error(`Could not read the zona horaria: ${error.message}`);
  }

  return data;
}
