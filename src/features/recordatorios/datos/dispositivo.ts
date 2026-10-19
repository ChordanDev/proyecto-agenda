import { supabase } from '@/shared/supabase';

import type { Registro, RegistroGuardado } from '../dominio/recordatorios';

/** What the phone of `token` has saved, or `null` when it was never saved. */
export async function getDispositivo(token: string): Promise<RegistroGuardado | null> {
  const { data, error } = await supabase.rpc('get_dispositivo', { token });

  if (error) {
    throw new Error(`Could not read the phone: ${error.message}`);
  }

  const row = data[0];
  return row === undefined
    ? null
    : {
        encendido: row.encendido,
        iglesiaIds: row.iglesia_ids,
        conUsuario: row.con_usuario,
        delUsuario: row.del_usuario,
      };
}

/**
 * Saves the switch and the iglesias of the phone of `token`. The database
 * decides again which iglesias the session may follow.
 */
export async function guardarDispositivo(token: string, registro: Registro): Promise<void> {
  const { error } = await supabase.rpc('guardar_dispositivo', {
    token,
    encendido: registro.encendido,
    iglesia_ids: [...registro.iglesiaIds],
  });

  if (error) {
    throw new Error(`Could not save the phone: ${error.message}`);
  }
}
