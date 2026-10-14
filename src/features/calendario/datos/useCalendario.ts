import { useQuery } from '@tanstack/react-query';

import type { Cargo } from '@/features/sesion/dominio/cargo';

import type { IglesiaEnEstructura } from '../dominio/armarCalendario';
import type { Month } from '../dominio/getMonthRange';
import { getCalendarioDeIglesia } from './getCalendarioDeIglesia';
import { getCalendarioDeUsuario } from './getCalendarioDeUsuario';

/** Whose calendario to read: the iglesia elegida of the hermano, or a usuario's cargos. */
export type FuenteDeCalendario =
  | { tipo: 'iglesia'; iglesiaId: string }
  | {
      tipo: 'usuario';
      cargos: readonly Cargo[];
      /** The iglesias their cargos cover. */
      iglesias: readonly IglesiaEnEstructura[];
    };

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
    queryFn: () =>
      fuente.tipo === 'iglesia'
        ? getCalendarioDeIglesia(fuente.iglesiaId, month)
        : getCalendarioDeUsuario(fuente.cargos, fuente.iglesias, month),
  });
}
