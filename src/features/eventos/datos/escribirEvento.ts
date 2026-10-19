import { supabase } from '@/shared/supabase';

import {
  clasificarError,
  clasificarErrorDeFecha,
  necesitaReleerElEvento,
  type TipoDeErrorDeFecha,
} from '../dominio/errorDeEscritura';
import type { ExcepcionAGuardar } from '../dominio/edicionDeFecha';
import type { EventoAGuardar } from '../dominio/formularioDeEvento';

/** A write of an evento that failed, with what the person can do about it. */
export class ErrorDeEscritura extends Error {
  constructor(
    readonly tipo: TipoDeErrorDeFecha,
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
async function toErrorDeEscritura(
  error: ApiError,
  id?: string,
  clasificar: typeof clasificarErrorDeFecha = clasificarError,
): Promise<ErrorDeEscritura> {
  const eventoExiste =
    id !== undefined && necesitaReleerElEvento(error.code) ? await getEventoExiste(id) : undefined;

  return new ErrorDeEscritura(
    clasificar(error.code, error.message, { eventoExiste }),
    error.message,
  );
}

/** A null of the domain is an argument left out: the function defaults it to null. */
function orOmitted<T>(value: T | null): T | undefined {
  return value ?? undefined;
}

/**
 * Which evento a save writes: a new one, with the id the app chose for it, or
 * an existing one.
 */
export type EventoDestino = { crear: string } | { editar: string };

/**
 * Saves an evento with all its dates in one call (public.guardar_evento):
 * either both are saved or neither is. A create sent again with the same id
 * saves the evento once. Returns the id of the evento saved.
 */
export async function guardarEvento(
  evento: EventoAGuardar,
  destino: EventoDestino,
): Promise<string> {
  const { duenio } = evento;
  const { data, error } = await supabase.rpc('guardar_evento', {
    evento_id: 'editar' in destino ? destino.editar : undefined,
    nuevo_evento_id: 'crear' in destino ? destino.crear : undefined,
    titulo: evento.titulo,
    // A lugar of the list goes by its id; only a lugar written by hand goes as text.
    lugar: evento.lugarId === null ? orOmitted(evento.lugar) : undefined,
    lugar_id: orOmitted(evento.lugarId),
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
    // Left out, the evento keeps the iglesias sumadas it has.
    iglesias_sumadas:
      evento.iglesiasSumadas === undefined ? undefined : [...evento.iglesiasSumadas],
  });

  if (error) {
    // A create sent again ends as an edit of its own id: either id is the one to read.
    throw await toErrorDeEscritura(error, 'editar' in destino ? destino.editar : destino.crear);
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

/**
 * Quita an evento from the calendario of an iglesia sumada
 * (public.quitar_evento_de_iglesia): the evento stays for its duenio and the
 * other iglesias. An evento the iglesia no longer has is already what was asked
 * for.
 */
export async function quitarEventoDeIglesia(eventoId: string, iglesiaId: string): Promise<void> {
  const { error } = await supabase.rpc('quitar_evento_de_iglesia', {
    evento_id: eventoId,
    iglesia_id: iglesiaId,
  });

  if (error) {
    throw await toErrorDeEscritura(error, eventoId);
  }
}

/**
 * Saves what a single date of a series has of its own
 * (public.guardar_excepcion), replacing what it had. Only the fields that
 * changed are sent: the others are read from the series. A field emptied goes
 * with its flag, as null is a value of its own.
 */
export async function guardarExcepcion(
  eventoId: string,
  { fecha, fechaNueva, cambios }: ExcepcionAGuardar,
): Promise<void> {
  const cambiaLugar = 'lugar' in cambios || 'lugarId' in cambios;
  const lugarId = cambios.lugarId ?? null;
  const { error } = await supabase.rpc('guardar_excepcion', {
    evento_id: eventoId,
    fecha,
    ...(fechaNueva !== null && { fecha_nueva: fechaNueva }),
    ...(cambios.titulo !== undefined && { titulo: cambios.titulo }),
    ...(cambios.hora !== undefined && { hora: cambios.hora }),
    ...(cambiaLugar && {
      cambia_lugar: true,
      // A lugar of the list goes by its id; only a lugar written by hand goes as text.
      ...(lugarId === null ? { lugar: orOmitted(cambios.lugar ?? null) } : { lugar_id: lugarId }),
    }),
    ...('descripcion' in cambios && {
      cambia_descripcion: true,
      descripcion: orOmitted(cambios.descripcion ?? null),
    }),
    ...('enfasis' in cambios && {
      cambia_enfasis: true,
      enfasis: orOmitted(cambios.enfasis ?? null),
    }),
  });

  if (error) {
    throw await toErrorDeEscritura(error, eventoId, clasificarErrorDeFecha);
  }
}

/**
 * Deletes a single date of a series (public.borrar_fecha); the others stay. A
 * series deleted meanwhile is already what was asked for.
 */
export async function borrarFecha(eventoId: string, fecha: string): Promise<void> {
  const { error } = await supabase.rpc('borrar_fecha', { evento_id: eventoId, fecha });

  if (error) {
    const failure = await toErrorDeEscritura(error, eventoId, (code, message, contexto) =>
      clasificarErrorDeFecha(code, message, { ...contexto, borrandoFecha: true }),
    );

    if (failure.tipo !== 'no-existe') {
      throw failure;
    }
  }
}
