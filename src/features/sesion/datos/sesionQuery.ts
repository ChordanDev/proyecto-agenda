import { queryOptions } from '@tanstack/react-query';

import { getHasSesion } from './getHasSesion';
import { discardUnfinishedRecovery } from './unfinishedRecovery';

/**
 * Whether there is a session on this phone. Whoever signs in or out sets or
 * invalidates this query, so reading it again on every mount adds nothing.
 * A session left by an unfinished first access or recovery does not count: it
 * is signed out before reading. When the stored session answered because the
 * client was still renewing it, the client's own answer reads it again.
 */
export const sesionQueryOptions = queryOptions({
  queryKey: ['sesion'],
  queryFn: async ({ client }) => {
    await discardUnfinishedRecovery();
    return getHasSesion(() => void client.invalidateQueries({ queryKey: ['sesion'], exact: true }));
  },
  // The client answers from what it holds, without a request.
  networkMode: 'always',
  retry: false,
  staleTime: Infinity,
});
