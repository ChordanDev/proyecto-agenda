import { formatDayHeading } from '@/features/calendario/dominio/calendarioTexts';
import { parseLocalDate } from '@/features/calendario/dominio/localDate';

/**
 * A fecha before today. Today is the date of the phone, in its local hora;
 * local `YYYY-MM-DD` dates order as plain text.
 */
export function isFechaPasada(fecha: string, hoy: string): boolean {
  return fecha < hoy;
}

/**
 * Whether "Guardar" asks before saving an evento that starts before today. A
 * new evento asks; an edited one asks only when its fecha was changed to
 * another past one, so old eventos can be corrected without being asked.
 */
export function debePreguntarPorFechaPasada({
  fecha,
  fechaOriginal,
  hoy,
}: {
  fecha: string;
  /** The fecha of the evento being edited; null for a new one. */
  fechaOriginal: string | null;
  hoy: string;
}): boolean {
  return isFechaPasada(fecha, hoy) && fecha !== fechaOriginal;
}

/**
 * The question of "Guardar" with the whole fecha written: "El evento es el
 * martes 1 de septiembre, que ya pasó. ¿Querés cargarlo igual?". The year is
 * added when it is not the current one.
 */
export function getTextoDeFechaPasada(fecha: string, hoy: string): string {
  const dia = formatDayHeading(fecha);
  const { year } = parseLocalDate(fecha);
  const anio = year === parseLocalDate(hoy).year ? '' : ` de ${year}`;

  return `El evento es el ${dia.charAt(0).toLowerCase()}${dia.slice(1)}${anio}, que ya pasó. ¿Querés cargarlo igual?`;
}
