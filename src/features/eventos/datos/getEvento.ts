import { supabase } from '@/shared/supabase';

import type { Evento } from '../dominio/evento';
import { toEvento } from './eventoRow';

/** An evento with what its detail shows besides its own columns. */
export type EventoDetallado = {
  evento: Evento;
  /** Nombre of the iglesia, distrito or asociacion that owns it. */
  nombreDelDuenio: string;
  /** Its dates, in order: one, or one per occurrence of a series. */
  fechas: string[];
};

/**
 * Every column of the evento, its dates and the nombre of its duenio. The
 * duenio is named by its foreign key: iglesias also reach eventos through
 * iglesias_sumadas, and PostgREST cannot tell the two apart by itself.
 */
const EVENTO_COLUMNS = `
  id, titulo, lugar, descripcion, enfasis, alcance,
  duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
  hora, fecha_fin, repeticion, fin_de_serie,
  iglesias_sumadas (iglesia_id),
  eventos_fechas (fecha),
  iglesias!eventos_duenio_iglesia_id_fkey (nombre),
  distritos!eventos_duenio_distrito_id_fkey (nombre),
  asociaciones!eventos_duenio_asociacion_id_fkey (nombre)
` as const;

/** Reads an evento for its detail; null when it does not exist (any more). */
export async function getEvento(id: string): Promise<EventoDetallado | null> {
  const { data, error } = await supabase
    .from('eventos')
    .select(EVENTO_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read the evento: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const nombreDelDuenio =
    data.iglesias?.nombre ?? data.distritos?.nombre ?? data.asociaciones?.nombre;

  // The foreign keys keep a duenio from disappearing while it owns eventos.
  if (nombreDelDuenio === undefined) {
    throw new Error(`Evento ${id} has no duenio to name`);
  }

  return {
    evento: toEvento(data),
    nombreDelDuenio,
    // Local `YYYY-MM-DD` strings order as plain text.
    fechas: data.eventos_fechas.map(({ fecha }) => fecha).sort(),
  };
}
