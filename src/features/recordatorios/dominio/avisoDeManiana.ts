import {
  armarCalendarioDeIglesias,
  type FechaDeEvento,
  type IglesiaEnEstructura,
} from '../../calendario/dominio/armarCalendario.ts';
import { getDiaDelEvento } from '../../calendario/dominio/diasDeEvento.ts';
import { addDays } from '../../calendario/dominio/localDate.ts';
import { getPeriodo } from '../../chat/dominio/periodo.ts';

/** The hour of the recordatorio, in the zona horaria of the asociacion. */
export const HORA_DEL_AVISO = 20;

/**
 * Whether `momento` falls in the hour of the recordatorio (from 20:00 to
 * 20:59) in `zonaHoraria`, an IANA name as `asociaciones.zona_horaria` keeps it.
 */
export function esHoraDelAviso(momento: Date, zonaHoraria: string): boolean {
  const hora = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(momento);

  return Number(hora) === HORA_DEL_AVISO;
}

/** The local date, `YYYY-MM-DD`, of the day after `momento` in `zonaHoraria`. */
export function getManiana(momento: Date, zonaHoraria: string): string {
  return addDays(getPeriodo(momento, zonaHoraria).dia, 1);
}

/** Whether `maniana` is the first day of that date of an evento: a series warns before each date. */
function empiezaManiana(fechaDeEvento: FechaDeEvento, maniana: string): boolean {
  const dia = getDiaDelEvento(fechaDeEvento, maniana);

  return dia !== undefined && (dia.diaDelRango === null || dia.diaDelRango.numero === 1);
}

/**
 * The text of the recordatorio of a phone that follows `iglesias`, or null
 * when nothing warns tomorrow: "Mañana: Congreso de Jóvenes", or
 * "Mañana: Culto joven y 2 eventos más".
 *
 * `fechas` are the dates read for tomorrow, of any iglesia: the calendario of
 * the iglesias followed keeps its own, each evento once however many of them
 * see it. Only the eventos with an enfasis warn, and an evento of several days
 * only before its first day. The one named is the first of the day, by hora.
 */
export function armarAvisoDeManiana(
  iglesias: readonly IglesiaEnEstructura[],
  fechas: readonly FechaDeEvento[],
  maniana: string,
): string | null {
  const eventos = armarCalendarioDeIglesias(iglesias, fechas).filter(
    (fechaDeEvento) =>
      fechaDeEvento.evento.enfasis !== null && empiezaManiana(fechaDeEvento, maniana),
  );

  // The calendario keeps each (evento, date) pair once; an evento has one date a day.
  const [primero, ...otros] = eventos;

  if (primero === undefined) {
    return null;
  }

  const titulo = `Mañana: ${primero.evento.titulo}`;

  if (otros.length === 0) {
    return titulo;
  }

  return `${titulo} y ${otros.length} ${otros.length === 1 ? 'evento más' : 'eventos más'}`;
}
