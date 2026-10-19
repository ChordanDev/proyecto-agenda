import { formatLongDate, formatTime } from '@/features/calendario/dominio/calendarioTexts';
import { getWeekday, parseLocalDate } from '@/features/calendario/dominio/localDate';
import { isSameDuenio, type LugarElegido } from '@/features/lugares/dominio/lugar';

import { getCategoria, type Categoria } from './categoria';
import { isFechaPasada } from './fechaPasada';
import type { Duenio, Enfasis, Evento, Repeticion } from './evento';
import { getIglesiasParaSumar, type IglesiaParaSumar } from './iglesiasParaSumar';
import { getFechasDeSerie, getTopeDeHasta } from './repeticion';

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
  /** A series cannot last several days: one excludes the other. */
  repeticion: Repeticion;
  /** "Hasta": the last day the series can have a date on. Only used when it repeats. */
  finDeSerie: string | null;
  /** Optional: null is "Sin lugar". */
  lugar: LugarElegido | null;
  descripcion: string;
  /** One of the four enfasis or `R` for the actividad regular; null until one is chosen. */
  categoria: Categoria | null;
  /** Ids of the iglesias to share the evento with, in the order they were chosen. */
  iglesiasSumadas: readonly string[];
};

export type CampoDelFormulario =
  'titulo' | 'duenio' | 'fecha' | 'hora' | 'fechaFin' | 'repeticion' | 'finDeSerie' | 'enfasis';

/** What the rules of "Hasta" need besides the form. */
export type ContextoDelFormulario = {
  /** Today, by the clock of the phone. */
  hoy: string;
  /** Whether an existing evento is being edited: editing renews a series. */
  editando: boolean;
  /**
   * The iglesias of the asociacion, once they are read: with them, the sumadas
   * that see the evento by its alcance are left out after the duenio changes.
   */
  iglesias?: readonly IglesiaParaSumar[];
  /**
   * The form as it was opened. While neither its duenio nor its sumadas
   * change, the sumadas are not sent: the ones loaded can be old, and sending
   * them would undo what was shared, or what an iglesia quito, meanwhile.
   */
  inicial?: FormularioDeEvento;
};

/** An evento ready to be saved, with every date it has. */
export type EventoAGuardar = Omit<Evento, 'id' | 'iglesiasSumadas'> & {
  /** One for a single date; one per occurrence for a series. */
  fechas: string[];
  /**
   * Ids of the iglesias to share the evento with, replacing the ones it has.
   * Left out, the evento keeps its iglesias sumadas: a writer that does not
   * show them must not undo what was shared, or what an iglesia quito.
   */
  iglesiasSumadas?: readonly string[];
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

// "19", "1930", "19:30" or "19.30", with one or two digits for the hora; also
// "19:", as the field leaves it while it is typed.
const HORA_PATTERN = /^(\d{1,2})(?:[:.]?(\d{2})|[:.])?$/;
// A hora written to the end: its minutes have their two digits.
const HORA_COMPLETA_PATTERN = /^(?:\d{1,2}[:.]\d{2}|\d{3,4})$/;
// From 00:00 to 05:59 a hora is probably one of the afternoon written wrong.
const ULTIMA_HORA_POCO_COMUN = 5;

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

/**
 * What the field of the hora shows after a change: the two points appear by
 * themselves once the hora is typed ("19" → "19:", "1930" → "19:30"). Erasing
 * is left as it is, and so is a separator the person typed.
 */
export function formatHoraAlEscribir(anterior: string, texto: string): string {
  if (texto.length < anterior.length || !/^\d{2,4}$/.test(texto)) {
    return texto;
  }

  // Two digits that cannot be a hora are a hora of one digit and its minutes.
  const twoDigitHora = Number(texto.slice(0, 2)) <= 23;
  const split = texto.length === 4 || (twoDigitHora && texto.length < 4) ? 2 : 1;

  return `${texto.slice(0, split)}:${texto.slice(split)}`;
}

/** A hora written to the end that is not one of the day, such as "25:00" or "19:75". */
export function isHoraImposible(texto: string): boolean {
  const trimmed = texto.trim();

  return HORA_COMPLETA_PATTERN.test(trimmed) && parseHora(trimmed) === null;
}

/** A hora of the madrugada, from 00:00 to 05:59, as `parseHora` gives it. */
export function isHoraPocoComun(hora: string): boolean {
  return Number(hora.slice(0, 2)) <= ULTIMA_HORA_POCO_COMUN;
}

/** What is asked before keeping a hora of the madrugada: "¿Es a las 3:00 de la madrugada?". */
export function getPreguntaDeHoraPocoComun(hora: string): string {
  return `¿Es a las ${Number(hora.slice(0, 2))}:${hora.slice(3, 5)} de la madrugada?`;
}

/** What the field of the lugar shows; null for "Sin lugar". */
export function getNombreDelLugar(lugar: LugarElegido | null): string | null {
  if (lugar === null) {
    return null;
  }

  return lugar.tipo === 'guardado' ? lugar.lugar.nombre : lugar.nombre;
}

/**
 * The iglesias sumadas that can be saved: none for an evento of asociacion,
 * and never one that sees the evento by its alcance, which the database
 * rejects. The iglesias of a distrito are only known once they are read.
 */
function getSumadasAGuardar(
  duenio: Duenio,
  sumadas: readonly string[],
  iglesias: readonly IglesiaParaSumar[] | undefined,
): string[] {
  if (iglesias === undefined) {
    return sumadas.filter((id) =>
      duenio.alcance === 'iglesia' ? id !== duenio.iglesiaId : duenio.alcance === 'distrito',
    );
  }

  const ofrecibles = new Set(getIglesiasParaSumar(duenio, iglesias).map((iglesia) => iglesia.id));

  return sumadas.filter((id) => ofrecibles.has(id));
}

/** Whether the duenio and the sumadas are the ones the form was opened with. */
function sumadasSinCambios(formulario: FormularioDeEvento, inicial: FormularioDeEvento): boolean {
  const mismoDuenio =
    formulario.duenio !== null &&
    inicial.duenio !== null &&
    isSameDuenio(formulario.duenio, inicial.duenio);
  const { iglesiasSumadas } = formulario;

  return (
    mismoDuenio &&
    iglesiasSumadas.length === inicial.iglesiasSumadas.length &&
    iglesiasSumadas.every((id) => inicial.iglesiasSumadas.includes(id))
  );
}

/** An optional text: trimmed, and missing when nothing is left. */
function optionalText(text: string): string | null {
  const trimmed = text.trim();

  return trimmed === '' ? null : trimmed;
}

/**
 * Checks the form and, when nothing is missing, gives the evento to save with
 * all its dates. Title, duenio, fecha, hora and one of the five options of
 * enfasis are required, and a series needs its "Hasta"; every problem is told
 * at once, so the person fixes them all.
 */
export function validarFormulario(
  formulario: FormularioDeEvento,
  contexto: ContextoDelFormulario,
): ResultadoDelFormulario {
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
  // An end on the first day is an evento of one day.
  const fechaFin = formulario.fechaFin === formulario.fecha ? null : formulario.fechaFin;
  const seRepite = formulario.repeticion !== 'ninguna';
  if (seRepite && fechaFin !== null) {
    errores.repeticion = 'Un evento que se repite no puede durar varios días.';
  }
  if (seRepite && formulario.finDeSerie === null) {
    errores.finDeSerie = 'Elegí hasta cuándo se repite.';
  }
  if (seRepite && formulario.fecha !== null && formulario.finDeSerie !== null) {
    const tope = getTopeDeHasta({ fecha: formulario.fecha, ...contexto });
    if (isFechaPasada(formulario.finDeSerie, contexto.hoy)) {
      errores.finDeSerie = '"Hasta" no puede ser una fecha pasada.';
    } else if (formulario.finDeSerie < formulario.fecha) {
      errores.finDeSerie = '"Hasta" no puede ser anterior a la primera fecha.';
    } else if (formulario.finDeSerie > tope) {
      errores.finDeSerie = `"Hasta" puede ser, como máximo, el ${formatLongDate(tope)}.`;
    }
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

  const finDeSerie = seRepite ? formulario.finDeSerie : null;

  return {
    ok: true,
    evento: {
      titulo,
      // A lugar of the list is saved by its id; its nombre is what the evento shows.
      lugar: getNombreDelLugar(formulario.lugar),
      lugarId: formulario.lugar?.tipo === 'guardado' ? formulario.lugar.lugar.id : null,
      descripcion: optionalText(formulario.descripcion),
      enfasis: ENFASIS_OF_CATEGORIA[formulario.categoria],
      duenio: formulario.duenio,
      hora,
      fechaFin,
      repeticion: formulario.repeticion,
      finDeSerie,
      // A series is saved with each of its dates, one row each.
      fechas: getFechasDeSerie(formulario.fecha, formulario.repeticion, finDeSerie),
      // Sharing applies to the whole series. Left out when untouched, the
      // evento keeps the sumadas it has.
      ...((contexto.inicial === undefined || !sumadasSinCambios(formulario, contexto.inicial)) && {
        iglesiasSumadas: getSumadasAGuardar(
          formulario.duenio,
          formulario.iglesiasSumadas,
          contexto.iglesias,
        ),
      }),
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
    repeticion: 'ninguna',
    finDeSerie: null,
    lugar: null,
    descripcion: '',
    categoria: null,
    iglesiasSumadas: [],
  };
}

/**
 * The lugar of an evento for its form. Its lugar of the list is one of its own
 * duenio: the database does not let it be another.
 */
function getLugarElegido(evento: Evento): LugarElegido | null {
  if (evento.lugar === null) {
    return null;
  }

  // `== null`: an evento saved on the phone before lugarId existed has none at all.
  return evento.lugarId == null
    ? { tipo: 'escrito', nombre: evento.lugar }
    : {
        tipo: 'guardado',
        lugar: { id: evento.lugarId, nombre: evento.lugar, duenio: evento.duenio },
      };
}

/**
 * Chooses another duenio. A lugar of the list belongs to a duenio, so the one
 * chosen is emptied when it is not of the new one. A lugar written by hand is
 * of no list and stays.
 */
export function cambiarDuenio(formulario: FormularioDeEvento, duenio: Duenio): FormularioDeEvento {
  const { lugar } = formulario;

  return { ...formulario, duenio, lugar: esLugarDe(lugar, duenio) ? lugar : null };
}

/**
 * Chooses the lugar of the evento. A lugar of the list of another duenio is
 * ignored: "Guardar lugar" can answer after the person chose another duenio,
 * and saving the evento with it would be rejected.
 */
export function elegirLugar(
  formulario: FormularioDeEvento,
  lugar: LugarElegido | null,
): FormularioDeEvento {
  return esLugarDe(lugar, formulario.duenio) ? { ...formulario, lugar } : formulario;
}

/** A lugar of the list is of its duenio only; one written by hand, of any. */
function esLugarDe(lugar: LugarElegido | null, duenio: Duenio | null): boolean {
  if (lugar?.tipo !== 'guardado') {
    return true;
  }

  return duenio !== null && isSameDuenio(lugar.lugar.duenio, duenio);
}

/** The form of an evento being edited, loaded with what it has. */
export function formularioDesdeEvento(
  evento: Evento,
  fechas: readonly string[],
): FormularioDeEvento {
  return {
    titulo: evento.titulo,
    duenio: evento.duenio,
    // A series is edited from its first date: saving it generates them all again.
    fecha: fechas[0] ?? null,
    hora: formatTime(evento.hora),
    fechaFin: evento.fechaFin,
    repeticion: evento.repeticion,
    finDeSerie: evento.finDeSerie,
    lugar: getLugarElegido(evento),
    descripcion: evento.descripcion ?? '',
    categoria: getCategoria(evento.enfasis),
    // `?? []`: an evento saved on the phone before sharing existed has none at all.
    iglesiasSumadas: evento.iglesiasSumadas ?? [],
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
