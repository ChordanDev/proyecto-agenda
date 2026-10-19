import type { Cargo } from '@/features/sesion/dominio/cargo';
import { supabase } from '@/shared/supabase';

import { armarCalendarioDeUsuario, getIglesiasDeCargos } from '../dominio/armarCalendarioDeUsuario';
import type { IglesiaEnEstructura } from '../dominio/armarCalendario';
import { armarEtiquetas } from '../dominio/calendarioTexts';
import type { Month } from '../dominio/getMonthRange';
import { getFechasDelMes, type Calendario } from './getFechasDelMes';

/**
 * Up to this many iglesias the request names the owners it wants. The ids
 * travel in the URL: past this (an admin) the request reads every evento of the
 * month instead, and the rule does the filtering.
 */
const MAX_IGLESIAS_TO_NARROW = 40;

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * The filter of `getFechasDelMes` for the eventos owned by, or sumados to, the
 * iglesias; null reads them all. It does not depend on the month, so it is read
 * once for every month.
 */
export async function getOwnedOrSumada(
  iglesias: readonly IglesiaEnEstructura[],
): Promise<string | null> {
  if (iglesias.length > MAX_IGLESIAS_TO_NARROW) {
    return null;
  }

  const iglesiaIds = iglesias.map((iglesia) => iglesia.id);
  const { data, error } = await supabase
    .from('iglesias_sumadas')
    .select('evento_id')
    .in('iglesia_id', iglesiaIds);

  if (error) {
    throw new Error(`Could not read the iglesias sumadas: ${error.message}`);
  }

  const eventosSumados = unique(data.map((sumada) => sumada.evento_id));
  const distritoIds = unique(iglesias.map((iglesia) => iglesia.distritoId));
  const asociacionIds = unique(iglesias.map((iglesia) => iglesia.asociacionId));

  return [
    `duenio_iglesia_id.in.(${iglesiaIds.join(',')})`,
    `duenio_distrito_id.in.(${distritoIds.join(',')})`,
    `duenio_asociacion_id.in.(${asociacionIds.join(',')})`,
    ...(eventosSumados.length > 0 ? [`id.in.(${eventosSumados.join(',')})`] : []),
  ].join(',');
}

/**
 * Reads the calendario of a usuario for a month: the union of the calendarios
 * of the iglesias their cargos cover, each evento once. `ownedOrSumada` comes
 * from `getOwnedOrSumada` for those iglesias, so a month only reads eventos.
 */
export async function getCalendarioDeUsuario(
  cargos: readonly Cargo[],
  iglesias: readonly IglesiaEnEstructura[],
  ownedOrSumada: string | null,
  month: Month,
): Promise<Calendario> {
  const covered = getIglesiasDeCargos(cargos, iglesias);

  if (covered.length === 0) {
    return { fechas: [], nombresDeDistritos: {}, etiquetas: {} };
  }

  const { fechas, nombresDeDistritos, nombresDeIglesias, sumadas } = await getFechasDelMes(
    ownedOrSumada,
    month,
  );
  const calendario = armarCalendarioDeUsuario(cargos, covered, fechas);

  return {
    fechas: calendario,
    nombresDeDistritos,
    // The labels are those of the calendario of all the iglesias together: an
    // evento shared between two of them is not "compartido por" for the usuario.
    etiquetas: armarEtiquetas(covered, calendario, {
      distritos: nombresDeDistritos,
      iglesias: nombresDeIglesias,
      sumadas,
    }),
  };
}
