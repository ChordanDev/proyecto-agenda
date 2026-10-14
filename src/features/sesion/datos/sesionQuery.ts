import { queryOptions } from '@tanstack/react-query';

import { getHasSesion } from './getHasSesion';
import { discardUnfinishedRecovery } from './unfinishedRecovery';

/**
 * Whether there is a session on this phone. Whoever signs in or out sets or
 * invalidates this query, so reading it again on every mount adds nothing.
 * A session left by an unfinished first access or recovery does not count: it
 * is signed out before reading.
 */
export const sesionQueryOptions = queryOptions({
  queryKey: ['sesion'],
  queryFn: async () => {
    await discardUnfinishedRecovery();
    return getHasSesion();
  },
  // The client answers from what it holds, without a request.
  networkMode: 'always',
  retry: false,
  staleTime: Infinity,
});
