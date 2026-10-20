import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { esFallaDeConexion } from '../dominio/recordatorios';
import { getPermiso, getTokenDelTelefono, pedirPermiso, TOKEN_TIMEOUT_MS } from './telefono';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({ easConfig: { projectId: 'proyecto' } }));

const mocked = jest.mocked(Notifications);

function permiso(granted: boolean, canAskAgain: boolean) {
  return { granted, canAskAgain } as Notifications.NotificationPermissionsStatus;
}

const CANAL = ['recordatorios', { name: 'Recordatorios', importance: 3 }];

beforeEach(() => {
  jest.resetAllMocks();
  Platform.OS = 'android';
  mocked.getPermissionsAsync.mockResolvedValue(permiso(true, false));
  mocked.requestPermissionsAsync.mockResolvedValue(permiso(true, false));
});

describe('getPermiso', () => {
  it('creates the Android channel when the permiso was already granted', async () => {
    await expect(getPermiso()).resolves.toBe('concedido');

    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(...CANAL);
    expect(mocked.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('creates the channel before reading the permiso', async () => {
    await getPermiso();

    expect(mocked.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.getPermissionsAsync.mock.invocationCallOrder[0],
    );
  });

  it('still returns the permiso when creating the channel fails', async () => {
    mocked.setNotificationChannelAsync.mockRejectedValue(new Error('channel failed'));

    await expect(getPermiso()).resolves.toBe('concedido');
  });

  it('creates no channel outside Android', async () => {
    Platform.OS = 'ios';

    await expect(getPermiso()).resolves.toBe('concedido');

    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

describe('pedirPermiso', () => {
  it('creates the Android channel before asking for the permiso', async () => {
    mocked.requestPermissionsAsync.mockResolvedValue(permiso(false, true));

    await expect(pedirPermiso()).resolves.toBe('sin-preguntar');

    expect(mocked.setNotificationChannelAsync).toHaveBeenCalledWith(...CANAL);
    expect(mocked.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.requestPermissionsAsync.mock.invocationCallOrder[0],
    );
  });

  it('creates no channel outside Android', async () => {
    Platform.OS = 'ios';
    mocked.requestPermissionsAsync.mockResolvedValue(permiso(false, false));

    await expect(pedirPermiso()).resolves.toBe('denegado');

    expect(mocked.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

describe('getTokenDelTelefono', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the token of the phone', async () => {
    mocked.getExpoPushTokenAsync.mockResolvedValue({
      type: 'expo',
      data: 'ExponentPushToken[telefono]',
    });

    await expect(getTokenDelTelefono()).resolves.toBe('ExponentPushToken[telefono]');
    expect(mocked.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proyecto' });
  });

  it('fails for lack of connection when the token never comes', async () => {
    jest.useFakeTimers();
    mocked.getExpoPushTokenAsync.mockReturnValue(new Promise(() => {}));

    const token = getTokenDelTelefono();
    const error = token.catch((caught: unknown) => caught);
    await jest.advanceTimersByTimeAsync(TOKEN_TIMEOUT_MS);

    expect(esFallaDeConexion(await error)).toBe(true);
  });

  it('keeps waiting until the time is up', async () => {
    jest.useFakeTimers();
    let settled = false;
    mocked.getExpoPushTokenAsync.mockReturnValue(new Promise(() => {}));

    getTokenDelTelefono()
      .catch(() => undefined)
      .finally(() => {
        settled = true;
      });
    await jest.advanceTimersByTimeAsync(TOKEN_TIMEOUT_MS - 1);

    expect(settled).toBe(false);
  });

  it('leaves no timer behind once the token came', async () => {
    jest.useFakeTimers();
    mocked.getExpoPushTokenAsync.mockResolvedValue({ type: 'expo', data: 'ExponentPushToken[t]' });

    await getTokenDelTelefono();

    expect(jest.getTimerCount()).toBe(0);
  });
});
