import { armarCalendario, type FechaDeEvento, type IglesiaEnEstructura } from './armarCalendario';
import { armarEtiquetas, type DatosDeEtiquetas } from './calendarioTexts';

/** An iglesia with its place in the structure and the nombres a header shows. */
export type IglesiaConNombres = IglesiaEnEstructura & {
  nombre: string;
  /** Nombre of its distrito. */
  distrito: string;
};

/** The calendario of an iglesia for a month, with what its header needs. */
export type CalendarioDeIglesia = {
  /** Null when the iglesia does not exist (any more). */
  iglesia: { nombre: string; distrito: string } | null;
  fechas: FechaDeEvento[];
  nombresDeDistritos: Record<string, string>;
  /** The label of each evento in the list of a day, by its id (`armarEtiquetas`). */
  etiquetas: Record<string, string>;
};

/**
 * Puts together what is read for the calendario of an iglesia. An iglesia that
 * does not exist has no calendario: the caller needs no dates for it.
 */
export function armarCalendarioDeIglesia(
  iglesia: IglesiaConNombres | null,
  fechas: readonly FechaDeEvento[],
  datos: DatosDeEtiquetas,
): CalendarioDeIglesia {
  if (iglesia === null) {
    return { iglesia: null, fechas: [], nombresDeDistritos: {}, etiquetas: {} };
  }

  const calendario = armarCalendario(iglesia, fechas);

  return {
    iglesia: { nombre: iglesia.nombre, distrito: iglesia.distrito },
    fechas: calendario,
    nombresDeDistritos: { ...datos.distritos },
    etiquetas: armarEtiquetas([iglesia], calendario, datos),
  };
}
