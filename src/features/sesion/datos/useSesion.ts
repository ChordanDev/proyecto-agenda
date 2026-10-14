import { useQuery } from '@tanstack/react-query';

import { sesionQueryOptions } from './sesionQuery';

/** Whether there is a session; undefined until it is read. */
export function useSesion(): boolean | undefined {
  return useQuery(sesionQueryOptions).data;
}
