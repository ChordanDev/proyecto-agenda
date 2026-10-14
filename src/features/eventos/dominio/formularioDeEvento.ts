import { formatTime } from '@/features/calendario/dominio/calendarioTexts';
import { getWeekday, parseLocalDate } from '@/features/calendario/dominio/localDate';

import { getCategoria, type Categoria } from './categoria';
import type { Duenio, Enfasis, Evento, Repeticion } from './evento';

/**
 * What the form of an evento holds while it is filled in. Texts are kept as
 * typed; `validarFormulario` turns them into an evento to save.
 */
export type FormularioDeEvento = {
  titulo: string;
  /** Null until it is chosen. */
  duenio: Duenio | null;
  /** Local date, `YYYY-MM-DD`; null until it is chosen. */
  fecha: string | null;
  /** As typed: "19:00", "19", "1930"… */
  hora: string;
  /** Last day of an evento of several days; null for one day. A date only, no hora. */
  fechaFin: string | null;
  lugar: string;
  descripcion: string;
  /** One of the four enfasis or `R` for the actividad regular; null until one is chosen. */
  categoria: Categoria | null;
};

export type CampoDelFormulario = 'titulo' | 'duenio' | 'fecha' | 'hora' | 'fechaFin' | 'enfasis';

/** An evento ready to be saved, with every date it has. */
export type EventoAGuardar = Omit<Evento, 'id' | 'iglesiasSumadas'> & {
  /** One for a single date; one per occurrence for a series. */
  fechas: string[];
};

export type ResultadoDelFormulario =
  | { ok: true; evento: EventoAGuardar }
  | { ok: false; errores: Partial<Record<CampoDelFormulario, string>> };

const ENFASIS_OF_CATEGORIA: Record<Categoria, Enfasis | null> = {
  S: 'identidad',
  F: 'liderazgo',
  I: 'nuevas_generaciones',
  H: 'discipulado',
  R: null,
};

// "19", "1930", "19:30" or "19.30", with one or two digits for the hora.
const HORA_PATTERN = /^(\d{1,2})(?:[:.]?(\d{2}))?$/;

/**
 * Reads a hora as people write it ("19", "9:30", "1930") and gives it as the
 * database keeps it, `HH:MM:SS`. Null when it is not a hora of the day.
 */
export function parseHora(text: string): string | null {
  const match = HORA_PATTERN.exec(text.trim());

  if (match === null) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = match[2] === undefined ? 0 : Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  const pad = (value: number) => String(value).padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:00`;
}

/** An optional text: trimmed, and missing when nothing is left. */
function optionalText(text: string): string | null {
  const trimmed = text.trim();

  return trimmed === '' ? null : trimmed;
}

/**
 * Checks the form and, when nothing is missing, gives the evento to save.
 * Title, duenio, fecha, hora and one of the five options of enfasis are
 * required; every missing one is told at once, so the person fixes them all.
 */
export function validarFormulario(formulario: FormularioDeEvento): ResultadoDelFormulario {
  const titulo = formulario.titulo.trim();
  const hora = parseHora(formulario.hora);
  const errores: Partial<Record<CampoDelFormulario, string>> = {};

  if (titulo === '') {
    errores.titulo = 'Escribí el título del evento.';
  }
  if (formulario.duenio === null) {
    errores.duenio = 'Elegí de quién es el evento.';
  }
  if (formulario.fecha === null) {
    errores.fecha = 'Elegí la fecha del evento.';
  }
  if (hora === null) {
    errores.hora = 'Escribí la hora, por ejemplo 19:00.';
  }
  // Local `YYYY-MM-DD` dates order as plain text.
  if (
    formulario.fecha !== null &&
    formulario.fechaFin !== null &&
    formulario.fechaFin < formulario.fecha
  ) {
    errores.fechaFin = 'La fecha de fin no puede ser anterior a la de inicio.';
  }
  if (formulario.categoria === null) {
    errores.enfasis = 'Elegí un énfasis o "Actividad regular".';
  }

  if (
    formulario.duenio === null ||
    formulario.fecha === null ||
    hora === null ||
    formulario.categoria === null ||
    Object.keys(errores).length > 0
  ) {
    return { ok: false, errores };
  }

  const repeticion: Repeticion = 'ninguna';

  return {
    ok: true,
    evento: {
      titulo,
      lugar: optionalText(formulario.lugar),
      descripcion: optionalText(formulario.descripcion),
      enfasis: ENFASIS_OF_CATEGORIA[formulario.categoria],
      duenio: formulario.duenio,
      hora,
      // An end on the first day is an evento of one day.
      fechaFin: formulario.fechaFin === formulario.fecha ? null : formulario.fechaFin,
      repeticion,
      finDeSerie: null,
      fechas: [formulario.fecha],
    },
  };
}

/**
 * The form of a new evento: nothing chosen but what is given. The duenio comes
 * chosen only when it is the single possible one, and the fecha is the day
 * selected in the calendario.
 */
export function formularioVacio(duenio: Duenio | null, fecha: string | null): FormularioDeEvento {
  return {
    titulo: '',
    duenio,
    fecha,
    hora: '',
    fechaFin: null,
    lugar: '',
    descripcion: '',
    categoria: null,
  };
}

/** The form of an evento being edited, loaded with what it has. */
export function formularioDesdeEvento(
  evento: Evento,
  fechas: readonly string[],
): FormularioDeEvento {
  return {
    titulo: evento.titulo,
    duenio: evento.duenio,
    fecha: fechas[0] ?? null,
    hora: formatTime(evento.hora),
    fechaFin: evento.fechaFin,
    lugar: evento.lugar ?? '',
    descripcion: evento.descripcion ?? '',
    categoria: getCategoria(evento.enfasis),
  };
}

const SHORT_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const SHORT_MONTHS = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/** A fecha in a field of the form: "Sáb 17 oct 2026". */
export function formatFechaDelCampo(fecha: string): string {
  const { year, month, day } = parseLocalDate(fecha);

  return `${SHORT_WEEKDAYS[getWeekday(fecha)]} ${day} ${SHORT_MONTHS[month - 1]} ${year}`;
}

/** This form saves one date and its end: a series would lose its other dates. */
export function seEditaEnElFormulario(evento: Evento): boolean {
  return evento.repeticion === 'ninguna';
}
