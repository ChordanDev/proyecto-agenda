import { signOut } from './signOut';

// The auth client and the secure storage of the phone, both under the control
// of each test. The storage starts with a session.
const mockClientSignOut = jest.fn();
const mockStored = new Map<string, string>();

jest.mock('@/shared/supabase', () => ({
  supabase: { auth: { signOut: (args: unknown) => mockClientSignOut(args) } },
  authStorage: {
    getItem: (key: string) => Promise.resolve(mockStored.get(key) ?? null),
    removeItem: (key: string) => Promise.resolve(void mockStored.delete(key)),
  },
  AUTH_STORAGE_KEY: 'sb-test-auth-token',
}));

const KEY = 'sb-test-auth-token';
const SESSION = JSON.stringify({ access_token: 'expired', refresh_token: 'refresh' });
const ONE_SECOND = 1000;

/** Resolves with 'done' if the promise settles within `ms`, 'pending' otherwise. */
async function settleWithin(promise: Promise<unknown>, ms: number): Promise<'done' | 'pending'> {
  let result: 'done' | 'pending' = 'pending';
  promise.then(
    () => (result = 'done'),
    () => (result = 'done'),
  );
  await jest.advanceTimersByTimeAsync(ms);
  return result;
}

beforeEach(() => {
  jest.useFakeTimers();
  mockClientSignOut.mockReset();
  mockStored.clear();
  mockStored.set(KEY, SESSION);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('signOut', () => {
  it('removes the stored session within a second while the client keeps renewing it', async () => {
    // Offline with an expired token: the client retries the renewal for ~25 s.
    mockClientSignOut.mockReturnValue(new Promise(() => {}));

    await expect(settleWithin(signOut(), ONE_SECOND)).resolves.toBe('done');
    expect(mockStored.has(KEY)).toBe(false);
  });

  it('removes the stored session when the client gives up with a renewal error', async () => {
    // What the client answers when the renewal fails: it keeps the session.
    mockClientSignOut.mockResolvedValue({ error: { name: 'AuthRetryableFetchError' } });

    await signOut();

    expect(mockStored.has(KEY)).toBe(false);
  });

  it('removes a session the late renewal stored again', async () => {
    let finish: (value: unknown) => void = () => {};
    mockClientSignOut.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await settleWithin(signOut(), ONE_SECOND);

    // The connection came back during the renewal: it stores a fresh session,
    // then the client's sign-out ends with an error and keeps it.
    mockStored.set(KEY, SESSION);
    finish({ error: { name: 'AuthApiError', status: 500 } });
    await jest.advanceTimersByTimeAsync(0);

    expect(mockStored.has(KEY)).toBe(false);
  });

  it('signs out on this phone only, as before', async () => {
    mockClientSignOut.mockImplementation(async () => {
      mockStored.delete(KEY);
      return { error: null };
    });

    await signOut();

    expect(mockClientSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockStored.has(KEY)).toBe(false);
  });
});
