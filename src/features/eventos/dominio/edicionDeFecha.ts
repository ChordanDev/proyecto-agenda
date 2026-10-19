import { formatDayHeading } from '../../calendario/dominio/calendarioTexts.ts';
import { parseLocalDate } from '../../calendario/dominio/localDate.ts';
import { isSameDuenio } from '../../lugares/dominio/lugar.ts';

import type { Evento, Repeticion } from './evento.ts';
import {
  cambiaSoloUnLugarDeLista,
  getExcepcionesPerdidas,
  puedeMoverFecha,
  type CamposDeFecha,
  type Excepcion,
  type FechaDeSerie,
} from './excepcion.ts';
import {
  formularioDesdeEvento,
  validarFormulario,
  type CampoDelFormulario,
  type EventoAGuardar,
  type FormularioDeEvento,
} from './formularioDeEvento.ts';
import { formatRepeticionDelDetalle } from './repeticion.ts';

/** What the form of a single date of a series needs besides the form. */
export type EdicionDeFecha = {
  /** The date of the series being changed, where its excepcion is anchored. */
  fechaOriginal: string;
  /** The series as it is, without the excepcion of the date. */
  serie: Evento;
  /** The dates of the series, the deleted ones included (`EventoDetallado.fechas`). */
  fechas: readonly string[];
  excepciones: readonly Excepcion[];
};

/** What a single date keeps of its own: the fields that are not the ones of the series. */
export type ExcepcionAGuardar = Pick<Excepcion, 'fecha' | 'fechaNueva' | 'cambios'>;

export type ResultadoDeFecha =
  | { ok: true; excepcion: ExcepcionAGuardar }
  | { ok: false; errores: Partial<Record<CampoDelFormulario, string>> };

/**
 * Whether Editar and Borrar first ask "only this date" or "the whole series":
 * only for an evento that repeats, and only to whoever can edit it. An iglesia
 * sumada never edits, so it never sees it.
 */
export function muestraHojaDeSerie(evento: Pick<Evento, 'repeticion'>, puedeEditar: boolean) {
  return puedeEditar && evento.repeticion !== 'ninguna';
}

/**
 * Whether Borrar asks the same: the last date left of a series is deleted with
 * the whole series (public.borrar_fecha rejects it), so then it does not ask.
 */
export function muestraHojaDeBorrar(
  evento: Pick<Evento, 'repeticion'>,
  puedeEditar: boolean,
  cantidadDeFechas: number,
): boolean {
  return muestraHojaDeSerie(evento, puedeEditar) && cantidadDeFechas > 1;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** A date inside a sentence: "sábado 17 de octubre". */
function formatDia(fecha: string): string {
  return lowerFirst(formatDayHeading(fecha));
}

/**
 * The sheet of Editar or Borrar on a date of a series. It reminds how the
 * evento repeats, which `primeraFecha` tells.
 */
export function getHojaDeSerie(
  accion: 'editar' | 'borrar',
  fecha: string,
  repeticion: Repeticion,
  primeraFecha: string,
): { pregunta: string; recordatorio: string; soloEsta: string } {
  return {
    pregunta: accion === 'editar' ? '¿Qué querés cambiar?' : '¿Qué querés borrar?',
    recordatorio: `Este evento se repite ${lowerFirst(formatRepeticionDelDetalle(repeticion, primeraFecha))}.`,
    soloEsta: `Solo el ${formatDia(fecha)}`,
  };
}

/** What deleting a single date asks before going ahead. */
export function getConfirmacionDeBorrarFecha(fecha: string): {
  titulo: string;
  mensaje: string;
  boton: string;
} {
  const dia = formatDia(fecha);

  return {
    titulo: '¿Borrar esta fecha?',
    mensaje: `Se borra solo el ${dia}. Las demás fechas siguen.`,
    // "sábado 17 de octubre" → "sábado 17".
    boton: `Borrar el ${dia.split(' de ')[0]}`,
  };
}

/**
 * The date the detail shows: the one seen on the day it was opened from, or,
 * once that date moved away, the date it was; the first one otherwise.
 */
export function getVistaAbierta(
  vistas: readonly FechaDeSerie[],
  fecha: string | undefined,
): FechaDeSerie | undefined {
  return (
    vistas.find((vista) => vista.fecha === fecha) ??
    vistas.find((vista) => vista.fechaOriginal === fecha) ??
    vistas[0]
  );
}

/** The note of the detail of a date with changes of its own. */
export const NOTA_DE_CAMBIOS_PROPIOS =
  'Esta fecha tiene cambios propios. Las demás fechas de la serie no cambiaron.';

/** The first sentence on top of the form of a single date. */
export function getLeyendaDeUnaFecha(fecha: string): string {
  return `Estás cambiando solo el ${formatDia(fecha)}.`;
}

/** The rest of the legend on top of the form of a single date. */
export const LEYENDA_DEL_RESTO = 'Las demás fechas de la serie no cambian.';

/** Under the form of a single date: what it cannot change. */
export const PIE_DE_UNA_FECHA =
  'El dueño, la repetición, "Hasta", la fecha de fin y las iglesias sumadas se cambian en toda la serie.';

/**
 * The form of a single date, loaded with the date as it is seen (the series
 * with its excepcion) on the day it is seen. It has none of the fields of the
 * series: it does not repeat, nor last several days.
 */
export function formularioDeFecha(vista: Evento, fecha: string): FormularioDeEvento {
  return {
    ...formularioDesdeEvento(vista, [fecha]),
    repeticion: 'ninguna',
    finDeSerie: null,
    fechaFin: null,
  };
}

/** What the date has that is not the one of the series, field by field. */
function getCambios(evento: EventoAGuardar, serie: Evento): Partial<CamposDeFecha> {
  const cambios: Partial<CamposDeFecha> = {};

  if (evento.titulo !== serie.titulo) cambios.titulo = evento.titulo;
  if (evento.hora !== serie.hora) cambios.hora = evento.hora;
  // A lugar of the list is told by its id; one written by hand, by its nombre.
  if (
    evento.lugarId !== serie.lugarId ||
    (evento.lugarId === null && evento.lugar !== serie.lugar)
  ) {
    cambios.lugar = evento.lugar;
    cambios.lugarId = evento.lugarId;
  }
  if (evento.descripcion !== serie.descripcion) cambios.descripcion = evento.descripcion;
  if (evento.enfasis !== serie.enfasis) cambios.enfasis = evento.enfasis;

  return cambios;
}

/**
 * Checks the form of a single date and gives what to save of it: only the
 * fields that are not the ones of the series, so a later change of the series
 * reaches the others. The date can move to a day that is not another date of
 * the same series.
 */
export function validarFormularioDeFecha(
  formulario: FormularioDeEvento,
  contexto: { hoy: string } & EdicionDeFecha,
): ResultadoDeFecha {
  const { hoy, fechaOriginal, serie, fechas, excepciones } = contexto;
  const result = validarFormulario(
    { ...formulario, duenio: serie.duenio },
    { hoy, editando: true },
  );
  const errores = result.ok ? {} : { ...result.errores };

  if (
    formulario.fecha !== null &&
    !puedeMoverFecha(fechaOriginal, formulario.fecha, fechas, excepciones)
  ) {
    errores.fecha = 'Ese día ya tiene otra fecha de esta serie.';
  }

  if (!result.ok || Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const dia = result.evento.fechas[0];

  return {
    ok: true,
    excepcion: {
      fecha: fechaOriginal,
      fechaNueva: dia === fechaOriginal ? null : dia,
      cambios: getCambios(result.evento, serie),
    },
  };
}

type Motivo =
  | 'mezclados'
  | 'no-se-repite'
  | 'fuera-de-hasta'
  | 'fuera-de-la-serie'
  | 'lugar-de-otro-duenio'
  | 'dia-ocupado';

const MOTIVOS: Record<Motivo, [singular: string, plural: string]> = {
  mezclados: [
    'que pierde sus cambios propios con los cambios de la serie',
    'que pierden sus cambios propios con los cambios de la serie',
  ],
  'no-se-repite': ['porque el evento deja de repetirse', 'porque el evento deja de repetirse'],
  'fuera-de-hasta': ['que queda fuera del nuevo "Hasta"', 'que quedan fuera del nuevo "Hasta"'],
  'fuera-de-la-serie': [
    'que deja de ser una fecha de la serie',
    'que dejan de ser fechas de la serie',
  ],
  'lugar-de-otro-duenio': [
    'que tiene un lugar del dueño anterior',
    'que tienen un lugar del dueño anterior',
  ],
  'dia-ocupado': [
    'que se movió a un día que ahora tiene la serie',
    'que se movieron a días que ahora tiene la serie',
  ],
};

function getMotivo(
  excepcion: Excepcion,
  nueva: Pick<EventoAGuardar, 'repeticion' | 'finDeSerie' | 'fechas'>,
  cambiaDuenio: boolean,
): Motivo {
  if (nueva.repeticion === 'ninguna') return 'no-se-repite';
  if (nueva.finDeSerie !== null && excepcion.fecha > nueva.finDeSerie) return 'fuera-de-hasta';
  if (!nueva.fechas.includes(excepcion.fecha)) return 'fuera-de-la-serie';
  if (cambiaDuenio && cambiaSoloUnLugarDeLista(excepcion)) return 'lugar-de-otro-duenio';
  return 'dia-ocupado';
}

/** "el sábado 15 de mayo y el sábado 19 de junio de 2027": the year once, unless it is this one. */
function formatDias(fechas: readonly string[], hoy: string): string {
  const years = new Set(fechas.map((fecha) => parseLocalDate(fecha).year));
  const yearOfHoy = parseLocalDate(hoy).year;
  const oneYear = years.size === 1;
  const dias = fechas.map((fecha) => {
    const { year } = parseLocalDate(fecha);
    return `el ${formatDia(fecha)}${oneYear || year === yearOfHoy ? '' : ` de ${year}`}`;
  });
  const [year] = years;
  const lista =
    dias.length === 1 ? dias[0] : `${dias.slice(0, -1).join(', ')} y ${dias[dias.length - 1]}`;

  return oneYear && year !== yearOfHoy ? `${lista} de ${year}` : lista;
}

/**
 * What saving the whole series asks first when dates with changes of their
 * own would be lost (`getExcepcionesPerdidas`): how many, which ones and why.
 * `anterior` is the series as it is: a new duenio drops the lugares of the
 * list of the old one. Null when none is lost.
 */
export function getAvisoDePerdidas(
  excepciones: readonly Excepcion[],
  nueva: Pick<EventoAGuardar, 'repeticion' | 'finDeSerie' | 'fechas' | 'duenio'>,
  hoy: string,
  anterior?: Pick<Evento, 'duenio'>,
): { titulo: string; cantidad: string; cuales: string } | null {
  const cambiaDuenio = anterior !== undefined && !isSameDuenio(anterior.duenio, nueva.duenio);
  const perdidas = getExcepcionesPerdidas(
    excepciones,
    nueva.fechas,
    nueva.repeticion !== 'ninguna',
    { cambiaDuenio },
  );

  if (perdidas.length === 0) {
    return null;
  }

  const una = perdidas.length === 1;
  const motivos = new Set(perdidas.map((excepcion) => getMotivo(excepcion, nueva, cambiaDuenio)));
  // Lost for different reasons, what they share is losing their own changes.
  const motivo = motivos.size === 1 ? [...motivos][0] : 'mezclados';
  const dias = formatDias(
    perdidas.map(({ fecha }) => fecha),
    hoy,
  );

  return {
    titulo: '¿Guardar los cambios de la serie?',
    cantidad: una
      ? '1 fecha con cambios propios se va a perder.'
      : `${perdidas.length} fechas con cambios propios se van a perder.`,
    cuales: `${una ? 'Es' : 'Son'} ${dias}, ${MOTIVOS[motivo][una ? 0 : 1]}.`,
  };
}
