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
 * it is sumada to; null when there is no such iglesia, or it was dada de baja:
 * then the phone chooses another one, as for an iglesia that was deleted.
 */
async function getIglesiaEnEstructura(
  iglesiaId: string,
): Promise<{ iglesia: IglesiaConNombres; eventosSumados: string[] } | null> {
  const { data, error } = await supabase
    .from('iglesias')
    .select(
      'id, nombre, distrito_id, de_baja, distritos (nombre, asociacion_id), iglesias_sumadas (evento_id)',
    )
    .eq('id', iglesiaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not read the iglesia of the calendario: ${error.message}`);
  }

  if (!data || data.de_baja) {
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

/** What every month of the calendario of an iglesia needs, read once per iglesia. */
export type LecturaDeIglesia = {
  iglesia: IglesiaConNombres;
  /** The filter of `getFechasDelMes` for the eventos the iglesia can see. */
  ownedOrSumada: string;
};

/**
 * Reads the iglesia of a calendario: its place in the structure, the nombres
 * the header shows and the eventos it is sumada to. Null when there is no such
 * iglesia (any more) or it is de baja.
 */
export async function getIglesiaDeCalendario(iglesiaId: string): Promise<LecturaDeIglesia | null> {
  const found = await getIglesiaEnEstructura(iglesiaId);

  if (found === null) {
    return null;
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

  return { iglesia, ownedOrSumada };
}

/**
 * Reads the calendario of an iglesia for a month: its own eventos, those of
 * its distrito and its asociacion, and those where it is iglesia sumada, with
 * the nombres the header shows. The iglesia comes from `getIglesiaDeCalendario`,
 * so a month only reads eventos.
 */
export async function getCalendarioDeIglesia(
  { iglesia, ownedOrSumada }: LecturaDeIglesia,
  month: Month,
): Promise<CalendarioDeIglesia> {
  const { fechas, nombresDeDistritos, nombresDeIglesias, sumadas } = await getFechasDelMes(
    ownedOrSumada,
    month,
  );

  return armarCalendarioDeIglesia(iglesia, fechas, {
    distritos: nombresDeDistritos,
    iglesias: nombresDeIglesias,
    sumadas,
  });
}
