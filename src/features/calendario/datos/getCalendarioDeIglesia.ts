import { supabase } from '@/shared/supabase';

import {
  armarCalendarioDeIglesia,
  type CalendarioDeIglesia,
  type IglesiaConNombres,
} from '../dominio/calendarioDeIglesia';
import type { Month } from '../dominio/getMonthRange';
import { getFechasDelMes } from './getFechasDelMes';

/**
 * The current place of the iglesia in the structure, its nombres and the eventos
 * it is sumada to; null when there is no such iglesia.
 */
async function getIglesiaEnEstructura(
  iglesiaId: string,
): Promise<{ iglesia: IglesiaConNombres; eventosSumados: string[] } | null> {
  const { data, error } = await supabase
    .from('iglesias')
    .select(
      'id, nombre, distrito_id, distritos (nombre, asociacion_id), iglesias_sumadas (evento_id)',
    )
    .eq('id', iglesiaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read the iglesia of the calendario: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    iglesia: {
      id: data.id,
      nombre: data.nombre,
      distrito: data.distritos.nombre,
      distritoId: data.distrito_id,
      asociacionId: data.distritos.asociacion_id,
    },
    eventosSumados: data.iglesias_sumadas.map((sumada) => sumada.evento_id),
  };
}

/**
 * Reads the calendario of an iglesia for a month: its own eventos, those of
 * its distrito and its asociacion, and those where it is iglesia sumada. It also
 * returns the nombres the header shows, read in the same request; an iglesia
 * that does not exist comes back with `iglesia: null` and no dates.
 */
export async function getCalendarioDeIglesia(
  iglesiaId: string,
  month: Month,
): Promise<CalendarioDeIglesia> {
  const found = await getIglesiaEnEstructura(iglesiaId);

  if (found === null) {
    return armarCalendarioDeIglesia(null, [], {});
  }

  const { iglesia, eventosSumados } = found;

  const ownedOrSumada = [
    `duenio_iglesia_id.eq.${iglesia.id}`,
    `duenio_distrito_id.eq.${iglesia.distritoId}`,
    `duenio_asociacion_id.eq.${iglesia.asociacionId}`,
    // The ids travel in the URL. Sharing has no screen until the v2; if an
    // iglesia ever accumulates hundreds of them, this needs another shape.
    ...(eventosSumados.length > 0 ? [`id.in.(${eventosSumados.join(',')})`] : []),
  ].join(',');

  const { fechas, nombresDeDistritos } = await getFechasDelMes(ownedOrSumada, month);

  return armarCalendarioDeIglesia(iglesia, fechas, nombresDeDistritos);
}
