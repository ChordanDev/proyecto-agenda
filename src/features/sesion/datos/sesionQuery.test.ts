import { QueryClient } from '@tanstack/react-query';

import { sesionQueryOptions } from './sesionQuery';

// getHasSesion answers at once with a session and keeps the callback it gets
// for a late answer of the client, so each test decides when that comes.
let lateAnswer: (() => void) | undefined;
const mockDiscardUnfinishedRecovery = jest.fn();

jest.mock('./getHasSesion', () => ({
  getHasSesion: (onLateAnswer?: () => void) => {
    lateAnswer = onLateAnswer;
    return Promise.resolve(true);
  },
}));

jest.mock('./unfinishedRecovery', () => ({
  discardUnfinishedRecovery: () => mockDiscardUnfinishedRecovery(),
}));

// Without a garbage collection timer, the clients do not keep Jest running.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

beforeEach(() => {
  lateAnswer = undefined;
  mockDiscardUnfinishedRecovery.mockReset().mockResolvedValue(undefined);
});

describe('sesionQueryOptions', () => {
  it('reads the session again when the client answers late', async () => {
    const client = newClient();
    await client.fetchQuery(sesionQueryOptions);
    const invalidate = jest.spyOn(client, 'invalidateQueries');

    lateAnswer?.();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['sesion'], exact: true });
  });

  it('discards an unfinished recovery before reading the session', async () => {
    const client = newClient();

    await expect(client.fetchQuery(sesionQueryOptions)).resolves.toBe(true);

    expect(mockDiscardUnfinishedRecovery).toHaveBeenCalledTimes(1);
  });
});
