import { supabase } from '@/shared/supabase';

import { clasificarError, type TipoDeError } from '../dominio/errorDeEscritura';
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

function toErrorDeEscritura(error: { code?: string; message: string }): ErrorDeEscritura {
  return new ErrorDeEscritura(clasificarError(error.code, error.message), error.message);
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
    throw toErrorDeEscritura(error);
  }

  return data;
}

/** Deletes an evento with its dates (public.borrar_evento). */
export async function borrarEvento(id: string): Promise<void> {
  const { error } = await supabase.rpc('borrar_evento', { evento_id: id });

  if (error) {
    throw toErrorDeEscritura(error);
  }
}
