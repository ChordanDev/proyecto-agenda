import { choosePassword, verifyCode } from './passwordRecovery';
import { discardUnfinishedRecovery } from './unfinishedRecovery';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The auth client: a right code and a new password both succeed unless a test
// says otherwise; signing out leaves no session.
const mockVerifyOtp = jest.fn();
const mockUpdateUser = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: {
    auth: {
      verifyOtp: (args: unknown) => mockVerifyOtp(args),
      updateUser: (args: unknown) => mockUpdateUser(args),
      signOut: (args: unknown) => mockSignOut(args),
      getSession: () => mockGetSession(),
    },
  },
}));

const CODE = { email: 'marta@correo.com', code: '482015' };

beforeEach(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.clear();
  mockVerifyOtp.mockReset().mockResolvedValue({ error: null });
  mockUpdateUser.mockReset().mockResolvedValue({ error: null });
  mockSignOut.mockReset().mockResolvedValue({ error: null });
  mockGetSession.mockReset().mockResolvedValue({ data: { session: null }, error: null });
});

describe('discardUnfinishedRecovery', () => {
  it('signs out a session that the code opened but no password closed', async () => {
    await verifyCode(CODE);

    await discardUnfinishedRecovery();

    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('keeps the session once the password was chosen', async () => {
    await verifyCode(CODE);
    await choosePassword('abril2026');

    await discardUnfinishedRecovery();

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('does nothing when no code was ever checked', async () => {
    await discardUnfinishedRecovery();

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('does nothing after a wrong code, which opens no session', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { code: 'otp_expired', status: 403 } });
    await expect(verifyCode(CODE)).rejects.toThrow();

    await discardUnfinishedRecovery();

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('discards it only once', async () => {
    await verifyCode(CODE);
    await discardUnfinishedRecovery();
    mockSignOut.mockClear();

    await discardUnfinishedRecovery();

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
