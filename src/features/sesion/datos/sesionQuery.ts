import { queryOptions } from '@tanstack/react-query';

import { getHasSesion } from './getHasSesion';

/**
 * Whether there is a session on this phone. Whoever signs in or out sets or
 * invalidates this query, so reading it again on every mount adds nothing.
 */
export const sesionQueryOptions = queryOptions({
  queryKey: ['sesion'],
  queryFn: getHasSesion,
  // The client answers from what it holds, without a request.
  networkMode: 'always',
  retry: false,
  staleTime: Infinity,
});
