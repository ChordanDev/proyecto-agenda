/**
 * The dia and the mes a moment falls in, in the zona horaria of the asociacion:
 * the limits of the chat count by them. Both are local `YYYY-MM-DD` dates; the
 * mes is its first day, as the database keeps it.
 */
export type Periodo = { dia: string; mes: string };

/**
 * `zonaHoraria` is an IANA name, as `asociaciones.zona_horaria` keeps it
 * ("America/Argentina/Buenos_Aires").
 */
export function getPeriodo(momento: Date, zonaHoraria: string): Periodo {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(momento);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';

  const mes = `${part('year')}-${part('month')}`;

  return { dia: `${mes}-${part('day')}`, mes: `${mes}-01` };
}
