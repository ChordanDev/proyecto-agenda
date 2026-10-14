import { useQuery } from '@tanstack/react-query';

import type { Cargo } from '@/features/sesion/dominio/cargo';

import type { CalendarioDeIglesia } from '../dominio/calendarioDeIglesia';
import type { Month } from '../dominio/getMonthRange';
import { getCalendarioDeIglesia } from './getCalendarioDeIglesia';
import { getCalendarioDeUsuario } from './getCalendarioDeUsuario';
import type { Calendario } from './getFechasDelMes';
import type { IglesiaConEstructura } from './getIglesiasEnEstructura';

/** Whose calendario to read: the iglesia elegida of the hermano, or a usuario's cargos. */
export type FuenteDeCalendario =
  | { tipo: 'iglesia'; iglesiaId: string }
  | {
      tipo: 'usuario';
      cargos: readonly Cargo[];
      /** The iglesias their cargos cover. */
      iglesias: readonly IglesiaConEstructura[];
    };

/**
 * The calendario of a month. Only that of an iglesia knows its own nombres: it
 * is null when the iglesia no longer exists.
 */
export type CalendarioDelMes = Calendario & { iglesia?: CalendarioDeIglesia['iglesia'] };

/** The calendario of the source for a month. */
export function useCalendario(fuente: FuenteDeCalendario, month: Month) {
  return useQuery({
    queryKey:
      fuente.tipo === 'iglesia'
        ? ['calendario', fuente.iglesiaId, month.year, month.month]
        : [
            'calendario',
            'usuario',
            fuente.iglesias.map((iglesia) => iglesia.id).join(','),
            month.year,
            month.month,
          ],
    queryFn: (): Promise<CalendarioDelMes> =>
      fuente.tipo === 'iglesia'
        ? getCalendarioDeIglesia(fuente.iglesiaId, month)
        : getCalendarioDeUsuario(fuente.cargos, fuente.iglesias, month),
  });
}
