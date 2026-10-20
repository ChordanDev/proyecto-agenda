import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getPermiso, pedirPermiso } from './telefono';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-constants', () => ({}));

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
