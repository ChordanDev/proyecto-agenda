/** The four enfasis. An "Actividad regular" is the lack of one, not a fifth. */
export type Enfasis = 'identidad' | 'liderazgo' | 'nuevas_generaciones' | 'discipulado';

/** Level that owns an evento. */
export type Alcance = 'iglesia' | 'distrito' | 'asociacion';

export type Repeticion = 'ninguna' | 'semanal' | 'mensual';

/**
 * The concrete iglesia, distrito or asociacion an evento belongs to: exactly
 * one, and always the one of its alcance. It is not the person who loaded it.
 */
export type Duenio =
  | { alcance: 'iglesia'; iglesiaId: string }
  | { alcance: 'distrito'; distritoId: string }
  | { alcance: 'asociacion'; asociacionId: string };

/**
 * Dates are local `YYYY-MM-DD` strings and `hora` is a local `HH:MM:SS` string.
 * They are never turned into a JS `Date`: an evento at 19:00 is at 19:00
 * wherever the phone is, so nothing is converted between time zones.
 */
export type Evento = {
  id: string;
  titulo: string;
  lugar: string | null;
  descripcion: string | null;
  /** Null means "Actividad regular". */
  enfasis: Enfasis | null;
  duenio: Duenio;
  hora: string;
  /** Last day of an evento that lasts several days. There is no finishing time. */
  fechaFin: string | null;
  repeticion: Repeticion;
  /** "Hasta": the last day a series can have a date on. Null if it does not repeat. */
  finDeSerie: string | null;
  /** Ids of the iglesias the duenio shares the evento with. */
  iglesiasSumadas: readonly string[];
};
