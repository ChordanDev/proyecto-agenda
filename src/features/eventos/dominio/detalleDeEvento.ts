import { formatDayHeading, formatTime } from '@/features/calendario/dominio/calendarioTexts';
import { daysBetween } from '@/features/calendario/dominio/localDate';
import { categorias } from '@/shared/theme';

import { getCategoria } from './categoria';
import type { Duenio, Enfasis } from './evento';

/** The row "Fecha y hora" of the detail: "Sábado 10 de octubre · 19:00". */
export function formatFechaYHora(fecha: string, hora: string): string {
  return `${formatDayHeading(fecha)} · ${formatTime(hora)}`;
}

/**
 * Under "Fecha y hora" of an evento of several days: until when it lasts and
 * how many days, "Hasta el domingo 1 de noviembre · 3 días".
 */
export function formatFechaFin(fecha: string, fechaFin: string): string {
  const heading = formatDayHeading(fechaFin);
  const days = daysBetween(fecha, fechaFin) + 1;

  return `Hasta el ${heading.charAt(0).toLowerCase()}${heading.slice(1)} · ${days} días`;
}

/**
 * The enfasis at the top of the detail: its lema in bold and its nombre under
 * it. The actividad regular has no enfasis, so it is named alone.
 */
export function getEnfasisDelDetalle(enfasis: Enfasis | null): {
  lema: string;
  nombre: string | null;
} {
  const { lema, nombre } = categorias[getCategoria(enfasis)];

  // The theme keeps examples in the `nombre` of the actividad regular.
  return { lema, nombre: enfasis === null ? null : nombre };
}

const SE_VE: Record<Duenio['alcance'], string> = {
  iglesia: 'Se ve en el calendario de esta iglesia',
  distrito: 'Se ve en todas las iglesias del distrito',
  asociacion: 'Se ve en todas las iglesias de la asociación',
};

/** The word that names each level before a bare nombre; an asociacion needs none. */
const LEVELS: Record<Duenio['alcance'], string | null> = {
  iglesia: 'Iglesia',
  distrito: 'Distrito',
  asociacion: null,
};

/**
 * The row "Evento de": who the evento belongs to and, from its alcance, where
 * it is seen. The nombres of the iglesias and distritos are bare ("Córdoba
 * Norte"); the one of an asociacion already says what it is.
 */
export function getDuenioDelDetalle(
  duenio: Duenio,
  nombreDelDuenio: string,
): { nombre: string; seVe: string } {
  const level = LEVELS[duenio.alcance];
  // Some nombres already say what they are ("Iglesia de prueba").
  const nombre =
    level === null || nombreDelDuenio.toLowerCase().startsWith(`${level.toLowerCase()} `)
      ? nombreDelDuenio
      : `${level} ${nombreDelDuenio}`;

  return { nombre, seVe: SE_VE[duenio.alcance] };
}

/** Whether an optional field has something to show: the detail hides empty ones. */
export function hasText(value: string | null): value is string {
  return value !== null && value.trim() !== '';
}
