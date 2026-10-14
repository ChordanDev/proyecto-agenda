import type { FechaDeEvento } from './armarCalendario';
import { addDays, daysBetween } from './localDate';

/** Which day of its range a day of an evento of several days is: "Día 2 de 3". */
export type DiaDelRango = { numero: number; total: number };

/** A day an evento is on, with the day of its range when it lasts several days. */
export type DiaDeEvento = FechaDeEvento & { diaDelRango: DiaDelRango | null };

/**
 * Puts each evento on every day it lasts. An evento of several days has a
 * single date, its first day, and its `fechaFin`: the days in between are not
 * stored, they follow from the two when the calendario is built.
 *
 * An end that is not after the start (which the form never saves) leaves the
 * evento on its first day, rather than losing it.
 */
export function expandirDias(fechas: readonly FechaDeEvento[]): DiaDeEvento[] {
  return fechas.flatMap((fechaDeEvento): DiaDeEvento[] => {
    const { fecha, evento } = fechaDeEvento;
    const extraDays = evento.fechaFin === null ? 0 : daysBetween(fecha, evento.fechaFin);

    if (extraDays <= 0) {
      return [{ ...fechaDeEvento, diaDelRango: null }];
    }

    const total = extraDays + 1;

    return Array.from({ length: total }, (_, index) => ({
      fecha: addDays(fecha, index),
      evento,
      diaDelRango: { numero: index + 1, total },
    }));
  });
}
