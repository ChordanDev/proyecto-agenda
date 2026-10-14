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
const NOW_SECONDS = Math.floor(Date.now() / 1000);
const ONE_HOUR = 3600;
const ONE_SECOND = 1000;

function session(refreshToken: string, expiresAt: number): string {
  return JSON.stringify({
    access_token: 'access',
    refresh_token: refreshToken,
    expires_at: expiresAt,
  });
}

/** The session being closed (S1) and one stored by a later sign-in (S2). */
const VALID = session('s1', NOW_SECONDS + ONE_HOUR);
const EXPIRED = session('s1', NOW_SECONDS - ONE_HOUR);
const NEW_SIGN_IN = session('s2', NOW_SECONDS + ONE_HOUR);

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
});

afterEach(() => {
  jest.useRealTimers();
});

describe('signOut', () => {
  it('removes an expired session at once, without asking the client to renew it', async () => {
    // Offline, asking the client would retry the renewal for ~25 s.
    mockStored.set(KEY, EXPIRED);

    await expect(settleWithin(signOut(), ONE_SECOND)).resolves.toBe('done');

    expect(mockStored.has(KEY)).toBe(false);
    expect(mockClientSignOut).not.toHaveBeenCalled();
  });

  it('treats a session about to expire as expired, as the client does', async () => {
    // The client renews a token with less than 90 s left before using it.
    mockStored.set(KEY, session('s1', NOW_SECONDS + 60));

    await signOut();

    expect(mockClientSignOut).not.toHaveBeenCalled();
    expect(mockStored.has(KEY)).toBe(false);
  });

  it('removes a valid session within a second when the client does not answer', async () => {
    mockStored.set(KEY, VALID);
    mockClientSignOut.mockReturnValue(new Promise(() => {}));

    await expect(settleWithin(signOut(), ONE_SECOND)).resolves.toBe('done');

    expect(mockStored.has(KEY)).toBe(false);
  });

  it('removes the session when the client gives up and keeps it', async () => {
    mockStored.set(KEY, VALID);
    mockClientSignOut.mockResolvedValue({ error: { name: 'AuthRetryableFetchError' } });

    await signOut();

    expect(mockStored.has(KEY)).toBe(false);
  });

  it('keeps a session stored by a new sign-in while the client was still signing out', async () => {
    mockStored.set(KEY, VALID);
    let finish: (value: unknown) => void = () => {};
    mockClientSignOut.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await settleWithin(signOut(), ONE_SECOND);

    // Someone signs in again on this phone before the old sign-out ends.
    mockStored.set(KEY, NEW_SIGN_IN);
    finish({ error: null });
    await jest.advanceTimersByTimeAsync(0);

    expect(mockStored.get(KEY)).toBe(NEW_SIGN_IN);
  });

  it('does nothing without a stored session', async () => {
    await signOut();

    expect(mockClientSignOut).not.toHaveBeenCalled();
    expect(mockStored.has(KEY)).toBe(false);
  });

  it('signs out on this phone only, as before', async () => {
    mockStored.set(KEY, VALID);
    mockClientSignOut.mockImplementation(async () => {
      mockStored.delete(KEY);
      return { error: null };
    });

    await signOut();

    expect(mockClientSignOut).toHaveBeenCalledWith({ scope: 'local' });
    expect(mockStored.has(KEY)).toBe(false);
  });
});
