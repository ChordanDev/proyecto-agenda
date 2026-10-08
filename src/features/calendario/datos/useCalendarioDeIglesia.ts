import { useQuery } from '@tanstack/react-query';

import type { Month } from '../dominio/getMonthRange';
import { getCalendarioDeIglesia } from './getCalendarioDeIglesia';

export function useCalendarioDeIglesia(iglesiaId: string, month: Month) {
  return useQuery({
    queryKey: ['calendario', iglesiaId, month.year, month.month],
    queryFn: () => getCalendarioDeIglesia(iglesiaId, month),
  });
}
