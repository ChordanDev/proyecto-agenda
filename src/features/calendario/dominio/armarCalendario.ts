import type { Duenio, Evento } from '@/features/eventos/dominio/evento';

/** The place an iglesia has in the structure right now. */
export type IglesiaEnEstructura = {
  id: string;
  distritoId: string;
  asociacionId: string;
};

/** One date of an evento. A series has one per occurrence. */
export type FechaDeEvento = {
  /** Local date, `YYYY-MM-DD`. */
  fecha: string;
  evento: Evento;
};

/**
 * Whether an iglesia sees the eventos of a duenio by their alcance: the duenio
 * is that iglesia, the distrito it belongs to now or its asociacion.
 */
export function seVePorAlcance(iglesia: IglesiaEnEstructura, duenio: Duenio): boolean {
  switch (duenio.alcance) {
    case 'iglesia':
      return duenio.iglesiaId === iglesia.id;
    case 'distrito':
      return duenio.distritoId === iglesia.distritoId;
    case 'asociacion':
      return duenio.asociacionId === iglesia.asociacionId;
  }
}

/**
 * An evento is seen in an iglesia by its alcance (`seVePorAlcance`), or when
 * the iglesia is one of its iglesias sumadas.
 */
function belongsToCalendario(iglesia: IglesiaEnEstructura, evento: Evento): boolean {
  return evento.iglesiasSumadas.includes(iglesia.id) || seVePorAlcance(iglesia, evento.duenio);
}

/** Dates and horas are fixed-width strings, so they order as plain text. */
function compareText(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  return a < b ? -1 : 1;
}

function compareFechas(a: FechaDeEvento, b: FechaDeEvento): number {
  return (
    compareText(a.fecha, b.fecha) ||
    compareText(a.evento.hora, b.evento.hora) ||
    a.evento.titulo.localeCompare(b.evento.titulo, 'es')
  );
}

/**
 * Builds the calendario of several iglesias at once: keeps the dates of the
 * eventos that belong to at least one of them, each (evento, date) pair once
 * however many of the iglesias see it, ordered by date, then hora, then titulo.
 *
 * The calendario is never stored: it follows from the structure received, so an
 * iglesia that moves to another distrito gets the eventos of the new one and
 * loses those of the old one.
 */
export function armarCalendarioDeIglesias(
  iglesias: readonly IglesiaEnEstructura[],
  fechas: readonly FechaDeEvento[],
): FechaDeEvento[] {
  // An evento can arrive twice: the input may repeat a row, an iglesia sumada
  // may also depend on the duenio, and the duenio can be seen by several
  // iglesias.
  const seen = new Set<string>();
  const calendario: FechaDeEvento[] = [];

  for (const fechaDeEvento of fechas) {
    const key = `${fechaDeEvento.evento.id}|${fechaDeEvento.fecha}`;

    if (
      seen.has(key) ||
      !iglesias.some((iglesia) => belongsToCalendario(iglesia, fechaDeEvento.evento))
    ) {
      continue;
    }

    seen.add(key);
    calendario.push(fechaDeEvento);
  }

  return calendario.sort(compareFechas);
}

/** The calendario of a single iglesia: see `armarCalendarioDeIglesias`. */
export function armarCalendario(
  iglesia: IglesiaEnEstructura,
  fechas: readonly FechaDeEvento[],
): FechaDeEvento[] {
  return armarCalendarioDeIglesias([iglesia], fechas);
}
