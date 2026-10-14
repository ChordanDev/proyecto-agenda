import { supabase } from '@/shared/supabase';

import { armarCalendario, type IglesiaEnEstructura } from '../dominio/armarCalendario';
import type { Month } from '../dominio/getMonthRange';
import { getFechasDelMes, type Calendario } from './getFechasDelMes';

/** The current place of the iglesia in the structure and the eventos it is sumada to. */
async function getIglesiaEnEstructura(
  iglesiaId: string,
): Promise<{ iglesia: IglesiaEnEstructura; eventosSumados: string[] }> {
  const { data, error } = await supabase
    .from('iglesias')
    .select('id, distrito_id, distritos (asociacion_id), iglesias_sumadas (evento_id)')
    .eq('id', iglesiaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read the iglesia of the calendario: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Could not read the calendario: there is no iglesia ${iglesiaId}`);
  }

  return {
    iglesia: {
      id: data.id,
      distritoId: data.distrito_id,
      asociacionId: data.distritos.asociacion_id,
    },
    eventosSumados: data.iglesias_sumadas.map((sumada) => sumada.evento_id),
  };
}

/**
 * Reads the calendario of an iglesia for a month: its own eventos, those of
 * its distrito and its asociacion, and those where it is iglesia sumada.
 */
export async function getCalendarioDeIglesia(iglesiaId: string, month: Month): Promise<Calendario> {
  const { iglesia, eventosSumados } = await getIglesiaEnEstructura(iglesiaId);

  const ownedOrSumada = [
    `duenio_iglesia_id.eq.${iglesia.id}`,
    `duenio_distrito_id.eq.${iglesia.distritoId}`,
    `duenio_asociacion_id.eq.${iglesia.asociacionId}`,
    // The ids travel in the URL. Sharing has no screen until the v2; if an
    // iglesia ever accumulates hundreds of them, this needs another shape.
    ...(eventosSumados.length > 0 ? [`id.in.(${eventosSumados.join(',')})`] : []),
  ].join(',');

  const { fechas, nombresDeDistritos } = await getFechasDelMes(ownedOrSumada, month);

  return { fechas: armarCalendario(iglesia, fechas), nombresDeDistritos };
}
