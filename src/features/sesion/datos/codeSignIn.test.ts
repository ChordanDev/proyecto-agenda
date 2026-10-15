import AsyncStorage from '@react-native-async-storage/async-storage';

import { sendSignInCode, verifySignInCode } from './codeSignIn';
import { discardUnfinishedRecovery, markRecoveryStarted } from './unfinishedRecovery';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockSignInWithOtp = jest.fn();
const mockVerifyOtp = jest.fn();
const mockSignOut = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (args: unknown) => mockSignInWithOtp(args),
      verifyOtp: (args: unknown) => mockVerifyOtp(args),
      signOut: (args: unknown) => mockSignOut(args),
    },
  },
  // A valid session on the phone, so signing out asks the client.
  authStorage: {
    getItem: () =>
      Promise.resolve(
        JSON.stringify({ refresh_token: 'r', expires_at: Math.floor(Date.now() / 1000) + 3600 }),
      ),
    removeItem: () => Promise.resolve(),
  },
  AUTH_STORAGE_KEY: 'sb-test-auth-token',
}));

const EMAIL = 'marta@correo.com';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSignInWithOtp.mockReset().mockResolvedValue({ error: null });
  mockVerifyOtp.mockReset().mockResolvedValue({ error: null });
  mockSignOut.mockReset().mockResolvedValue({ error: null });
});

describe('sendSignInCode', () => {
  it('asks for a code without ever creating an account', async () => {
    await sendSignInCode(EMAIL);

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: EMAIL,
      options: { shouldCreateUser: false },
    });
  });

  it('answers as if the code was sent to an email with no account', async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { code: 'otp_disabled', name: 'AuthApiError', status: 422 },
    });

    await expect(sendSignInCode(EMAIL)).resolves.toBeUndefined();
  });

  it('fails with the message for the person on any other error', async () => {
    mockSignInWithOtp.mockResolvedValue({
      error: { code: 'over_email_send_rate_limit', name: 'AuthApiError', status: 429 },
    });

    await expect(sendSignInCode(EMAIL)).rejects.toThrow(
      'Hiciste demasiados intentos. Esperá un rato (puede ser hasta una hora) y probá de nuevo.',
    );
  });

  it('fails with the message of its step when the call itself throws', async () => {
    mockSignInWithOtp.mockRejectedValue(new TypeError('Network request failed'));

    await expect(sendSignInCode(EMAIL)).rejects.toThrow(
      'No pudimos enviar el código. Probá de nuevo en un momento.',
    );
  });
});

describe('verifySignInCode', () => {
  it('checks the code sent by sendSignInCode', async () => {
    await verifySignInCode({ email: EMAIL, code: '482015' });

    expect(mockVerifyOtp).toHaveBeenCalledWith({ email: EMAIL, token: '482015', type: 'email' });
  });

  it('reads a wrong code and an expired one the same', async () => {
    mockVerifyOtp.mockResolvedValue({
      error: { code: 'otp_expired', name: 'AuthApiError', status: 403 },
    });

    await expect(verifySignInCode({ email: EMAIL, code: '000000' })).rejects.toThrow(
      'El código no es correcto o ya venció. Pedí uno nuevo.',
    );
  });

  it('keeps the session it opens when a password flow was left halfway before', async () => {
    await markRecoveryStarted();

    await verifySignInCode({ email: EMAIL, code: '482015' });
    await discardUnfinishedRecovery();

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('signs in even when the phone fails to clear that mark', async () => {
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('storage full'));

    await expect(verifySignInCode({ email: EMAIL, code: '482015' })).resolves.toBeUndefined();
  });
});
