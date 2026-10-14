import { getHasSesion } from './getHasSesion';

// The auth client and the secure storage of the phone, both under the control
// of each test.
const mockGetSession = jest.fn();
const mockGetItem = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: { auth: { getSession: () => mockGetSession() } },
  authStorage: { getItem: (key: string) => mockGetItem(key) },
  AUTH_STORAGE_KEY: 'sb-test-auth-token',
}));

const STORED_SESSION = JSON.stringify({ access_token: 'expired', refresh_token: 'refresh' });
const NEVER = new Promise<never>(() => {});
const ONE_SECOND = 1000;

/** Resolves with what the promise settles to, or 'pending' if it has not after `ms`. */
async function settleWithin<T>(promise: Promise<T>, ms: number): Promise<T | 'pending'> {
  let result: T | 'pending' = 'pending';
  promise.then((value) => (result = value));
  await jest.advanceTimersByTimeAsync(ms);
  return result;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockGetSession.mockReset();
  mockGetItem.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('getHasSesion', () => {
  it('answers within a second from the stored session while the client keeps renewing it', async () => {
    // Offline with an expired token: the client retries the renewal for ~25 s.
    mockGetSession.mockReturnValue(NEVER);
    mockGetItem.mockResolvedValue(STORED_SESSION);

    await expect(settleWithin(getHasSesion(), ONE_SECOND)).resolves.toBe(true);
    expect(mockGetItem).toHaveBeenCalledWith('sb-test-auth-token');
  });

  it('answers no session within a second when nothing is stored', async () => {
    mockGetSession.mockReturnValue(NEVER);
    mockGetItem.mockResolvedValue(null);

    await expect(settleWithin(getHasSesion(), ONE_SECOND)).resolves.toBe(false);
  });

  it('does not count a stored value that is not a session', async () => {
    mockGetSession.mockReturnValue(NEVER);
    mockGetItem.mockResolvedValue('not json');

    await expect(settleWithin(getHasSesion(), ONE_SECOND)).resolves.toBe(false);
  });

  it('follows the client when it answers in time, without reading the storage', async () => {
    // A refresh token the server rejected: the client already removed the session.
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetItem.mockResolvedValue(STORED_SESSION);

    await expect(settleWithin(getHasSesion(), ONE_SECOND)).resolves.toBe(false);
    expect(mockGetItem).not.toHaveBeenCalled();
  });

  it('reports a session the client answers in time', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { access_token: 'a' } }, error: null });

    await expect(settleWithin(getHasSesion(), ONE_SECOND)).resolves.toBe(true);
  });

  it('tells when the client answers after the stored session was used', async () => {
    let answer: (value: unknown) => void = () => {};
    mockGetSession.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    mockGetItem.mockResolvedValue(STORED_SESSION);
    const onLateAnswer = jest.fn();

    await expect(settleWithin(getHasSesion(onLateAnswer), ONE_SECOND)).resolves.toBe(true);
    expect(onLateAnswer).not.toHaveBeenCalled();

    answer({ data: { session: null }, error: null });
    await jest.advanceTimersByTimeAsync(0);

    expect(onLateAnswer).toHaveBeenCalledTimes(1);
  });

  it('fails when the client fails in time', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: { message: 'broken' } });

    await expect(getHasSesion()).rejects.toThrow('Could not read the session: broken');
  });
});
