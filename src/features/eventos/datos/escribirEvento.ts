import { supabase } from '@/shared/supabase';

import {
  clasificarError,
  necesitaReleerElEvento,
  type TipoDeError,
} from '../dominio/errorDeEscritura';
import type { EventoAGuardar } from '../dominio/formularioDeEvento';

/** A write of an evento that failed, with what the person can do about it. */
export class ErrorDeEscritura extends Error {
  constructor(
    readonly tipo: TipoDeError,
    message: string,
  ) {
    super(message);
    this.name = 'ErrorDeEscritura';
  }
}

type ApiError = { code?: string; message: string };

/** Whether the evento is still there; undefined when it cannot be read. */
async function getEventoExiste(id: string): Promise<boolean | undefined> {
  const { data, error } = await supabase.from('eventos').select('id').eq('id', id).maybeSingle();

  return error ? undefined : data !== null;
}

/**
 * The failure of a write of the evento `id`. When the error does not say whether
 * the evento still exists, it reads it again to tell.
 */
async function toErrorDeEscritura(error: ApiError, id?: string): Promise<ErrorDeEscritura> {
  const eventoExiste =
    id !== undefined && necesitaReleerElEvento(error.code) ? await getEventoExiste(id) : undefined;

  return new ErrorDeEscritura(
    clasificarError(error.code, error.message, { eventoExiste }),
    error.message,
  );
}

/** A null of the domain is an argument left out: the function defaults it to null. */
function orOmitted<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

/**
 * Saves an evento with all its dates in one call (public.guardar_evento):
 * either both are saved or neither is. Without `id` it creates the evento.
 * Returns the id of the evento saved.
 */
export async function guardarEvento(evento: EventoAGuardar, id?: string): Promise<string> {
  const { duenio } = evento;
  const { data, error } = await supabase.rpc('guardar_evento', {
    evento_id: id,
    titulo: evento.titulo,
    lugar: orOmitted(evento.lugar),
    descripcion: orOmitted(evento.descripcion),
    enfasis: orOmitted(evento.enfasis),
    alcance: duenio.alcance,
    duenio_iglesia_id: duenio.alcance === 'iglesia' ? duenio.iglesiaId : undefined,
    duenio_distrito_id: duenio.alcance === 'distrito' ? duenio.distritoId : undefined,
    duenio_asociacion_id: duenio.alcance === 'asociacion' ? duenio.asociacionId : undefined,
    hora: evento.hora,
    fecha_fin: orOmitted(evento.fechaFin),
    repeticion: evento.repeticion,
    fin_de_serie: orOmitted(evento.finDeSerie),
    fechas: evento.fechas,
  });

  if (error) {
    throw await toErrorDeEscritura(error, id);
  }

  return data;
}

/**
 * Deletes an evento with its dates (public.borrar_evento). An evento someone
 * else deleted meanwhile is already what was asked for.
 */
export async function borrarEvento(id: string): Promise<void> {
  const { error } = await supabase.rpc('borrar_evento', { evento_id: id });

  if (error) {
    const failure = await toErrorDeEscritura(error, id);

    if (failure.tipo !== 'no-existe') {
      throw failure;
    }
  }
}
