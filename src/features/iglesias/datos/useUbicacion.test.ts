import * as Location from 'expo-location';

import { readUbicacion, recheckUbicacion } from './useUbicacion';

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = jest.mocked(Location);

function permiso(granted: boolean, canAskAgain: boolean) {
  return { granted, canAskAgain } as Location.LocationPermissionResponse;
}

const POSITION = {
  coords: { latitude: -31.4167, longitude: -64.1833 },
} as Location.LocationObject;

beforeEach(() => {
  jest.resetAllMocks();
  mocked.requestForegroundPermissionsAsync.mockResolvedValue(permiso(true, true));
  mocked.hasServicesEnabledAsync.mockResolvedValue(true);
  mocked.getCurrentPositionAsync.mockResolvedValue(POSITION);
});

describe('readUbicacion', () => {
  it('returns the position once the permiso is granted', async () => {
    await expect(readUbicacion()).resolves.toEqual({
      status: 'located',
      punto: { latitud: -31.4167, longitud: -64.1833 },
    });
  });

  it('is unavailable when the permiso is denied and the phone can ask again', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permiso(false, true));

    await expect(readUbicacion()).resolves.toEqual({ status: 'unavailable' });
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('is denied for good when the phone will not ask again', async () => {
    mocked.requestForegroundPermissionsAsync.mockResolvedValue(permiso(false, false));

    await expect(readUbicacion()).resolves.toEqual({ status: 'deniedForGood' });
  });

  it('is unavailable when the ubicación of the phone is turned off', async () => {
    mocked.hasServicesEnabledAsync.mockResolvedValue(false);

    await expect(readUbicacion()).resolves.toEqual({ status: 'unavailable' });
    expect(mocked.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('is unavailable when the phone fails to read the position', async () => {
    mocked.getCurrentPositionAsync.mockRejectedValue(new Error('No position'));

    await expect(readUbicacion()).resolves.toEqual({ status: 'unavailable' });
  });

  it('is unavailable when the position takes more than 15 seconds', async () => {
    jest.useFakeTimers();
    try {
      mocked.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}));

      const result = readUbicacion();
      await jest.advanceTimersByTimeAsync(15_000);

      await expect(result).resolves.toEqual({ status: 'unavailable' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('recheckUbicacion', () => {
  it('offers "Usar mi ubicación" again once the permiso was granted in the settings', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permiso(true, true));

    await expect(recheckUbicacion({ status: 'deniedForGood' })).resolves.toEqual({
      status: 'idle',
    });
  });

  it('keeps the notice while the permiso is still denied', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permiso(false, false));

    await expect(recheckUbicacion({ status: 'deniedForGood' })).resolves.toEqual({
      status: 'deniedForGood',
    });
  });

  it('leaves any other state as it is, without asking the phone', async () => {
    const located = { status: 'located', punto: { latitud: 1, longitud: 2 } } as const;

    await expect(recheckUbicacion(located)).resolves.toBe(located);
    expect(mocked.getForegroundPermissionsAsync).not.toHaveBeenCalled();
  });
});
