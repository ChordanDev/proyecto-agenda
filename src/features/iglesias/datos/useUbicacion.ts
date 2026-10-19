import * as Location from 'expo-location';
import { useState } from 'react';

import type { Punto } from '../dominio/distancia';

/**
 * Where the search of the ubicación stands:
 * - `idle`: not asked yet; nothing is requested until the button is tapped.
 * - `locating`: the phone is asking for the permiso or reading the position.
 * - `located`: the ubicación, used only to order the list.
 * - `unavailable`: the permiso was denied, or the phone could not read the
 *   position; asking again may work.
 * - `deniedForGood`: the permiso was denied and the phone will not ask again:
 *   only its settings can grant it.
 */
export type Ubicacion =
  | { status: 'idle' }
  | { status: 'locating' }
  | { status: 'located'; punto: Punto }
  | { status: 'unavailable' }
  | { status: 'deniedForGood' };

// A phone that cannot find itself would otherwise leave "Buscando tu
// ubicación…" on screen with no end.
const POSITION_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Location timed out')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function readUbicacion(): Promise<Ubicacion> {
  const permiso = await Location.requestForegroundPermissionsAsync();
  if (!permiso.granted) {
    return { status: permiso.canAskAgain ? 'unavailable' : 'deniedForGood' };
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    return { status: 'unavailable' };
  }
  const { coords } = await withTimeout(
    // A church a few hundred metres away is precise enough.
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    POSITION_TIMEOUT_MS,
  );
  return { status: 'located', punto: { latitud: coords.latitude, longitud: coords.longitude } };
}

/**
 * The ubicación of the phone, read once when `locate` is called. It lives only
 * in the state of the screen: it is never stored nor sent to the server.
 */
export function useUbicacion() {
  const [ubicacion, setUbicacion] = useState<Ubicacion>({ status: 'idle' });

  const locate = async () => {
    setUbicacion({ status: 'locating' });
    try {
      setUbicacion(await readUbicacion());
    } catch {
      setUbicacion({ status: 'unavailable' });
    }
  };

  return { ubicacion, locate };
}
