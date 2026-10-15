import type { Duenio } from '@/features/eventos/dominio/evento';
import { clasificarError, type TipoDeError } from '@/features/eventos/dominio/errorDeEscritura';
import { getDuenioId } from '@/features/eventos/dominio/opcionesDeDuenio';
import { supabase } from '@/shared/supabase';

import type { Lugar } from '../dominio/lugar';
import { LUGAR_COLUMNS, toDuenioColumns, toLugar } from './lugarRow';

/** A save of a lugar that failed, with what the person can do about it. */
export class ErrorDeLugar extends Error {
  constructor(
    readonly tipo: TipoDeError,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorDeLugar';
  }
}

const DUENIO_COLUMN = {
  iglesia: 'duenio_iglesia_id',
  distrito: 'duenio_distrito_id',
  asociacion: 'duenio_asociacion_id',
} as const;

/**
 * The lugares of the list of a duenio. A duenio has a handful, far below the
 * rows PostgREST answers at once, so a single page reads them all.
 */
export async function getLugaresDelDuenio(duenio: Duenio): Promise<Lugar[]> {
  const { data, error } = await supabase
    .from('lugares')
    .select(LUGAR_COLUMNS)
    .eq(DUENIO_COLUMN[duenio.alcance], getDuenioId(duenio));

  if (error) {
    throw new Error(`Could not read the lugares: ${error.message}`);
  }

  return data.map(toLugar);
}

/**
 * Saves a lugar in the list of a duenio (public.guardar_lugar). A nombre the
 * list already has gives that lugar back instead of a second one, so a save
 * sent again after a lost answer does not fail.
 */
export async function guardarLugar(nombre: string, duenio: Duenio): Promise<Lugar> {
  const { data, error } = await supabase
    .rpc('guardar_lugar', { nombre, ...toDuenioColumns(duenio) })
    .single();

  if (error) {
    throw new ErrorDeLugar(clasificarError(error.code, error.message), error.message);
  }

  return toLugar(data);
}
