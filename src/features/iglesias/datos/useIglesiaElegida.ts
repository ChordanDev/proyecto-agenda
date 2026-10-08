import { useQuery } from '@tanstack/react-query';

import { getIglesiaElegida } from './iglesiaElegida';

export function useIglesiaElegida() {
  return useQuery({
    queryKey: ['iglesiaElegida'],
    queryFn: getIglesiaElegida,
    // A read of the phone storage: it needs no connection, and trying again
    // would not fix a failure.
    networkMode: 'always',
    retry: false,
    // It only changes when this app writes it, and whoever writes it
    // invalidates this query: reading it again on every mount adds nothing.
    staleTime: Infinity,
  });
}
