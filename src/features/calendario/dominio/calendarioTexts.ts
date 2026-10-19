import type { Alcance, Duenio, Evento } from '@/features/eventos/dominio/evento';

import { seVePorAlcance, type FechaDeEvento, type IglesiaEnEstructura } from './armarCalendario';
import type { DiaDelRango } from './diasDeEvento';
import type { Month } from './getMonthRange';
import { getWeekday, parseLocalDate } from './localDate';

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** From Sunday, as `getWeekday` counts them. */
const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The title of the monthly view: "Octubre 2026". */
export function formatMonthTitle({ year, month }: Month): string {
  return `${capitalize(MONTH_NAMES[month - 1])} ${year}`;
}

/** The heading of the list of a day: "Sábado 10 de octubre". */
export function formatDayHeading(date: string): string {
  const { month, day } = parseLocalDate(date);

  return `${WEEKDAY_NAMES[getWeekday(date)]} ${day} de ${MONTH_NAMES[month - 1]}`;
}

/** A date with its year, inside a sentence: "17 de octubre de 2027". */
export function formatLongDate(date: string): string {
  const { year, month, day } = parseLocalDate(date);

  return `${day} de ${MONTH_NAMES[month - 1]} de ${year}`;
}

/** How many eventos a day has: "1 evento", "3 eventos" or "sin eventos". */
export function formatEventosCount(count: number): string {
  if (count === 0) {
    return 'sin eventos';
  }

  return count === 1 ? '1 evento' : `${count} eventos`;
}

/**
 * The hora of an evento as `HH:MM`, cut from the stored `HH:MM:SS`. Nothing is
 * converted: it is the local hora of the asociacion, the same on every phone.
 */
export function formatTime(hora: string): string {
  return hora.slice(0, 5);
}

/** The second line of an evento in the list: "11:00 · Templo", or only the hora. */
export function formatTimeAndPlace({ hora, lugar }: Pick<Evento, 'hora' | 'lugar'>): string {
  const time = formatTime(hora);

  return lugar ? `${time} · ${lugar}` : time;
}

/**
 * The second line of an evento in the list of a day. An evento of several
 * days says which day of its range this is ("Día 2 de 3"); only its first day
 * carries the hora, the one it starts at.
 */
export function formatTimeAndPlaceDelDia(
  evento: Pick<Evento, 'hora' | 'lugar'>,
  diaDelRango: DiaDelRango | null,
): string {
  if (diaDelRango === null) {
    return formatTimeAndPlace(evento);
  }

  const dia = `Día ${diaDelRango.numero} de ${diaDelRango.total}`;
  const rest = diaDelRango.numero === 1 ? formatTimeAndPlace(evento) : evento.lugar;

  return rest ? `${dia} · ${rest}` : dia;
}

/**
 * The label that tells an evento comes from above the iglesia: the nombre of
 * its distrito, or "Asociación". An evento of an iglesia has none.
 *
 * `nombresDeDistritos` goes by id of distrito: a duenio only carries ids.
 */
export function getAlcanceLabel(
  duenio: Duenio,
  nombresDeDistritos: Readonly<Record<string, string>>,
): string | null {
  switch (duenio.alcance) {
    case 'iglesia':
      return null;
    case 'distrito':
      return nombresDeDistritos[duenio.distritoId] ?? 'Distrito';
    case 'asociacion':
      return 'Asociación';
  }
}

/** The word that names each level before a bare nombre; an asociacion needs none. */
const LEVELS: Record<Alcance, string | null> = {
  iglesia: 'Iglesia',
  distrito: 'Distrito',
  asociacion: null,
};

/**
 * The nombre of an iglesia, distrito or asociacion with the word of its level:
 * "Iglesia Central" from "Central". Some nombres already say what they are
 * ("Iglesia de prueba", the one of an asociacion) and stay as they are.
 */
export function nombrarConNivel(alcance: Alcance, nombre: string): string {
  const level = LEVELS[alcance];

  return level === null || nombre.toLowerCase().startsWith(`${level.toLowerCase()} `)
    ? nombre
    : `${level} ${nombre}`;
}

/** The nombres a calendario knows of the iglesias and distritos that own its eventos, by id. */
export type NombresDeDuenios = {
  iglesias: Readonly<Record<string, string>>;
  distritos: Readonly<Record<string, string>>;
};

function nombrarDuenio(duenio: Duenio, nombres: NombresDeDuenios): string {
  switch (duenio.alcance) {
    case 'iglesia':
      return nombrarConNivel('iglesia', nombres.iglesias[duenio.iglesiaId] ?? '').trim();
    case 'distrito':
      return nombrarConNivel('distrito', nombres.distritos[duenio.distritoId] ?? '').trim();
    case 'asociacion':
      return 'Asociación';
  }
}

function formatCompartidoCon(count: number): string {
  return count === 1 ? 'Compartido con 1 iglesia' : `Compartido con ${count} iglesias`;
}

/**
 * The label of an evento in the list of a day of the calendario of these
 * iglesias: where it comes from and whether it is shared.
 *
 * - Seen only as iglesia sumada: "Compartido por Iglesia Central".
 * - Seen by its alcance: its alcance (`getAlcanceLabel`) and, when shared,
 *   "Compartido con 3 iglesias". An iglesia sumada of the calendario that also
 *   sees it by its alcance (it moved to the distrito of the duenio) is not
 *   counted: for her the evento is not shared.
 *
 * Null when there is nothing to say: an evento of the iglesia, not shared.
 */
export function getEtiquetaDelEvento(
  evento: Evento,
  iglesias: readonly IglesiaEnEstructura[],
  nombres: NombresDeDuenios,
): string | null {
  if (!iglesias.some((iglesia) => seVePorAlcance(iglesia, evento.duenio))) {
    return `Compartido por ${nombrarDuenio(evento.duenio, nombres)}`;
  }

  const sumadas = evento.iglesiasSumadas.filter((id) => {
    const delCalendario = iglesias.find((iglesia) => iglesia.id === id);

    return delCalendario === undefined || !seVePorAlcance(delCalendario, evento.duenio);
  });
  const etiqueta = [
    getAlcanceLabel(evento.duenio, nombres.distritos),
    sumadas.length > 0 ? formatCompartidoCon(sumadas.length) : null,
  ]
    .filter((text) => text !== null)
    .join(' · ');

  return etiqueta === '' ? null : etiqueta;
}

/**
 * The label of each evento of a calendario, by its id: see
 * `getEtiquetaDelEvento`. An evento with no label is left out.
 */
export function armarEtiquetas(
  iglesias: readonly IglesiaEnEstructura[],
  fechas: readonly FechaDeEvento[],
  nombres: NombresDeDuenios,
): Record<string, string> {
  const etiquetas: Record<string, string> = {};

  for (const { evento } of fechas) {
    const etiqueta = getEtiquetaDelEvento(evento, iglesias, nombres);

    if (etiqueta !== null) {
      etiquetas[evento.id] = etiqueta;
    }
  }

  return etiquetas;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * When the calendario on screen was downloaded, in the local time of the phone:
 * "Actualizado hoy a las 18:40.", "Actualizado ayer a las 18:40." or
 * "Actualizado el martes 6 de octubre a las 18:40.".
 */
export function formatActualizado(updatedAt: Date, now: Date): string {
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const time = `${String(updatedAt.getHours()).padStart(2, '0')}:${String(updatedAt.getMinutes()).padStart(2, '0')}`;

  let day: string;
  if (isSameDay(updatedAt, now)) {
    day = 'hoy';
  } else if (isSameDay(updatedAt, yesterday)) {
    day = 'ayer';
  } else {
    const weekday = WEEKDAY_NAMES[updatedAt.getDay()].toLowerCase();
    day = `el ${weekday} ${updatedAt.getDate()} de ${MONTH_NAMES[updatedAt.getMonth()]}`;
  }

  return `Actualizado ${day} a las ${time}.`;
}
