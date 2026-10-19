// The rules and the texts of the gestion of the pastor (diseno/pantallas/
// 08-gestion-pastor.html): the iglesias of their distritos, with how many
// encargados and eventos of the month each one has, the notices of the
// iglesias without encargado or without secretaria, and their encargados.

import {
  armarCalendario,
  type FechaDeEvento,
  type IglesiaEnEstructura,
} from '../../calendario/dominio/armarCalendario';
import { getMonthRange, type Month } from '../../calendario/dominio/getMonthRange';
import { getMonthOf } from '../../calendario/dominio/monthNavigation';
import { getPeriodo } from '../../chat/dominio/periodo';
import type { Encargado } from './encargados';

/** An iglesia of the distritos of the pastor, as the gestion lists it. */
export type IglesiaDelPastor = IglesiaEnEstructura & {
  nombre: string;
  /** How many cargos it has, secretarias included. */
  encargados: number;
  conSecretaria: boolean;
  eventosDelMes: number;
};

/** An encargado of one of the iglesias of the pastor, with the iglesia of that cargo. */
export type EncargadoDelPastor = Encargado & { iglesia: { id: string; nombre: string } };

export type AvisoDelPastor = { titulo: string; texto: string };

export type EtiquetaDeIglesia = 'Sin encargado' | 'Sin secretaria';

const MESES = [
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

/**
 * The month in course in the zona horaria of the asociacion, not the one of
 * the phone: the month of "eventos del mes" turns at midnight of the
 * asociacion. `zonaHoraria` is an IANA name, as asociaciones.zona_horaria keeps it.
 */
export function getMesDeLaAsociacion(momento: Date, zonaHoraria: string): Month {
  return getMonthOf(getPeriodo(momento, zonaHoraria).dia);
}

/**
 * How many eventos the calendario of the iglesia shows in the month: each date
 * of a series counts, and an evento of several days counts once, also when it
 * started the month before. The rule of what an iglesia sees is the one of the
 * calendario (armarCalendario).
 */
export function contarEventosDelMes(
  iglesia: IglesiaEnEstructura,
  fechas: readonly FechaDeEvento[],
  mes: Month,
): number {
  const { firstDay, lastDay } = getMonthRange(mes);

  return armarCalendario(iglesia, fechas).filter(
    ({ fecha, evento }) => fecha <= lastDay && (evento.fechaFin ?? fecha) >= firstDay,
  ).length;
}

/**
 * The labels of an iglesia in "Mis iglesias": one without encargados is only
 * "Sin encargado", since it has no secretaria either.
 */
export function getEtiquetasDeIglesia({
  encargados,
  conSecretaria,
}: Pick<IglesiaDelPastor, 'encargados' | 'conSecretaria'>): EtiquetaDeIglesia[] {
  if (encargados === 0) {
    return ['Sin encargado'];
  }
  return conSecretaria ? [] : ['Sin secretaria'];
}

/** "Iglesia Las Rosas" is "Las Rosas" inside a sentence that already speaks of iglesias. */
function sinPalabraIglesia(nombre: string): string {
  return nombre.replace(/^Iglesia\s+/i, '');
}

/** "A", "A y B", "A, B y C". */
function enumerar(nombres: readonly string[]): string {
  return nombres.length <= 1
    ? (nombres[0] ?? '')
    : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * The notices above the gestion: one for each iglesia without encargado, and
 * one for all the iglesias with encargados but without secretaria, where only
 * the pastor can add encargados.
 */
export function getAvisosDelPastor(iglesias: readonly IglesiaDelPastor[]): AvisoDelPastor[] {
  const sinEncargado = iglesias.filter((iglesia) => iglesia.encargados === 0);
  const sinSecretaria = iglesias.filter(
    (iglesia) => iglesia.encargados > 0 && !iglesia.conSecretaria,
  );

  const avisos = sinEncargado.map((iglesia) => ({
    titulo: `${iglesia.nombre} no tiene encargado`,
    texto: 'Nadie puede cargar sus eventos hasta que agregues uno.',
  }));

  if (sinSecretaria.length > 0) {
    avisos.push({
      titulo:
        sinSecretaria.length === 1
          ? `${sinSecretaria[0].nombre} no tiene secretaria`
          : `${sinSecretaria.length} iglesias sin secretaria`,
      texto: `En ${enumerar(sinSecretaria.map((iglesia) => sinPalabraIglesia(iglesia.nombre)))} solo vos podés agregar encargados.`,
    });
  }

  return avisos;
}

/**
 * "2 encargados · 9 eventos en octubre", under the nombre of an iglesia; null
 * for one without encargados, which only shows its label.
 */
export function getDetalleDeIglesia(
  { encargados, eventosDelMes }: Pick<IglesiaDelPastor, 'encargados' | 'eventosDelMes'>,
  mes: Month,
): string | null {
  if (encargados === 0) {
    return null;
  }

  const deEncargados = `${encargados} ${encargados === 1 ? 'encargado' : 'encargados'}`;
  const deEventos = `${eventosDelMes} ${eventosDelMes === 1 ? 'evento' : 'eventos'}`;

  return `${deEncargados} · ${deEventos} en ${MESES[mes.month - 1]}`;
}

/** "Distrito Norte · 4 iglesias", under the title of the gestion. */
export function getSubtituloDelPastor(distritos: readonly string[], iglesias: number): string {
  return `${enumerar(distritos)} · ${iglesias} ${iglesias === 1 ? 'iglesia' : 'iglesias'}`;
}

function compararNombres(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base' });
}

/** By iglesia, as "Mis iglesias"; in each one the secretarias first, then by nombre. */
export function ordenarEncargadosDelPastor<T extends EncargadoDelPastor>(
  encargados: readonly T[],
): T[] {
  return [...encargados].sort(
    (a, b) =>
      compararNombres(a.iglesia.nombre, b.iglesia.nombre) ||
      Number(b.esSecretaria) - Number(a.esSecretaria) ||
      compararNombres(a.nombre, b.nombre),
  );
}
