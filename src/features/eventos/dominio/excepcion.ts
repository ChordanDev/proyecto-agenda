import type { Evento } from './evento.ts';

/** What a single date of a series can change of its own. */
export type CamposDeFecha = Pick<
  Evento,
  'titulo' | 'hora' | 'lugar' | 'lugarId' | 'descripcion' | 'enfasis'
>;

/**
 * The change to, or the deletion of, a single date of a series. It keeps only
 * what changed: a field it does not have is read from the series, so a date
 * that changed its hora takes a new titulo of the series and keeps its hora.
 */
export type Excepcion = {
  /** The original date of the series it is anchored on, `YYYY-MM-DD`. */
  fecha: string;
  /** The day the date moved to; null when it stays on its own day. */
  fechaNueva: string | null;
  borrada: boolean;
  /** What the date has of its own. A field present as null was emptied. */
  cambios: Partial<CamposDeFecha>;
};

/** A date of a series as it is seen: on its day, with what it changed. */
export type FechaDeSerie = {
  /** The day it is seen on: its own, or the one it moved to. */
  fecha: string;
  /** The date of the series it comes from, where its excepcion is anchored. */
  fechaOriginal: string;
  /** The series combined with the excepcion of the date. */
  evento: Evento;
  /** Whether the date changed something of its own, its day included. */
  tieneCambios: boolean;
};

/** The series with what one of its dates changed, field by field. */
export function combinarConExcepcion(evento: Evento, excepcion: Excepcion | undefined): Evento {
  if (excepcion === undefined || Object.keys(excepcion.cambios).length === 0) {
    return evento;
  }

  return { ...evento, ...excepcion.cambios };
}

function porFecha(excepciones: readonly Excepcion[]): Map<string, Excepcion> {
  return new Map(excepciones.map((excepcion) => [excepcion.fecha, excepcion]));
}

/**
 * The dates of a series as they are seen, ordered by day: a moved date on its
 * new day and not on its own, a deleted one nowhere, and each one with what it
 * changed.
 */
export function aplicarExcepciones(
  evento: Evento,
  fechas: readonly string[],
  excepciones: readonly Excepcion[],
): FechaDeSerie[] {
  const excepcionDe = porFecha(excepciones);
  const vistas: FechaDeSerie[] = [];

  for (const fecha of fechas) {
    const excepcion = excepcionDe.get(fecha);

    if (excepcion?.borrada) {
      continue;
    }

    vistas.push({
      fecha: excepcion?.fechaNueva ?? fecha,
      fechaOriginal: fecha,
      evento: combinarConExcepcion(evento, excepcion),
      tieneCambios: excepcion !== undefined,
    });
  }

  // Local `YYYY-MM-DD` strings order as plain text.
  return vistas.sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
}

/**
 * The days taken by the dates of a series: their own, or the one they moved
 * to. A deleted date takes none.
 */
function diasOcupados(
  fechas: readonly string[],
  excepcionDe: ReadonlyMap<string, Excepcion>,
  sinContar?: string,
): Set<string> {
  const dias = new Set<string>();

  for (const fecha of fechas) {
    const excepcion = excepcionDe.get(fecha);

    if (fecha !== sinContar && !excepcion?.borrada) {
      dias.add(excepcion?.fechaNueva ?? fecha);
    }
  }

  return dias;
}

/**
 * Whether a date of a series can be on a day: one that is not another date of
 * the same series, nor the day another one moved to. That holds for its own
 * day too: once it moved away, another date may have taken it.
 *
 * `fechas` are the dates of the series.
 */
export function puedeMoverFecha(
  fechaOriginal: string,
  fechaNueva: string,
  fechas: readonly string[],
  excepciones: readonly Excepcion[],
): boolean {
  return !diasOcupados(fechas, porFecha(excepciones), fechaOriginal).has(fechaNueva);
}

/**
 * Whether all a date changes is a lugar of the list: a lugar belongs to one
 * duenio, so another duenio takes it back to the one of the series.
 */
export function cambiaSoloUnLugarDeLista(excepcion: Excepcion): boolean {
  const campos = Object.keys(excepcion.cambios).filter((campo) => campo !== 'lugar');

  return (
    excepcion.fechaNueva === null &&
    excepcion.cambios.lugarId != null &&
    campos.length === 1 &&
    campos[0] === 'lugarId'
  );
}

/**
 * The excepciones a new version of the series would lose, as saving it does
 * (`guardar_evento`): all of them when it stops repeating, those of a date
 * that is no longer in the series, those whose only change is a lugar of the
 * list when the duenio changes, and those of a date moved onto a day the
 * series now has. Losing one can bring back the own day of its date, which
 * may make another lose its move, so it repeats until nothing changes.
 *
 * A deleted date is never counted: whatever happens to it, nothing is lost.
 */
export function getExcepcionesPerdidas(
  excepciones: readonly Excepcion[],
  nuevasFechas: readonly string[],
  repite: boolean,
  { cambiaDuenio = false }: { cambiaDuenio?: boolean } = {},
): Excepcion[] {
  const cambios = excepciones.filter((excepcion) => !excepcion.borrada);

  if (!repite) {
    return cambios;
  }

  const enLaSerie = new Set(nuevasFechas);
  const perdidas = new Set(
    cambios.filter(
      (excepcion) =>
        !enLaSerie.has(excepcion.fecha) || (cambiaDuenio && cambiaSoloUnLugarDeLista(excepcion)),
    ),
  );
  const borradas = excepciones.filter((excepcion) => excepcion.borrada);

  for (;;) {
    const quedan = cambios.filter((excepcion) => !perdidas.has(excepcion));
    const excepcionDe = porFecha([...quedan, ...borradas]);
    const conDiaPropio = new Set(
      nuevasFechas.filter((fecha) => {
        const excepcion = excepcionDe.get(fecha);
        return !excepcion?.borrada && !excepcion?.fechaNueva;
      }),
    );
    const chocan = quedan.filter(
      (excepcion) => excepcion.fechaNueva !== null && conDiaPropio.has(excepcion.fechaNueva),
    );

    if (chocan.length === 0) {
      // In the order received, which is the order they are shown in.
      return cambios.filter((excepcion) => perdidas.has(excepcion));
    }

    chocan.forEach((excepcion) => perdidas.add(excepcion));
  }
}
