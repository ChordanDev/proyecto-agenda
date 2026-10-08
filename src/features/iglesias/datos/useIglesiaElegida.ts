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
  });
}
