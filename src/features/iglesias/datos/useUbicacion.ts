import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

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

/** Asks for the permiso and reads the position once. It never rejects. */
export async function readUbicacion(): Promise<Ubicacion> {
  try {
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
  } catch {
    return { status: 'unavailable' };
  }
}

/**
 * A permiso denied for good can only be granted in the settings of the phone:
 * once it is, "Usar mi ubicación" is offered again. Any other state is kept.
 */
export async function recheckUbicacion(ubicacion: Ubicacion): Promise<Ubicacion> {
  if (ubicacion.status !== 'deniedForGood') {
    return ubicacion;
  }
  try {
    const permiso = await Location.getForegroundPermissionsAsync();
    return permiso.granted ? { status: 'idle' } : ubicacion;
  } catch {
    return ubicacion;
  }
}

/**
 * The ubicación of the phone, read once when `locate` is called. It lives only
 * in the state of the screen: it is never stored nor sent to the server.
 */
export function useUbicacion() {
  const [ubicacion, setUbicacion] = useState<Ubicacion>({ status: 'idle' });

  const locate = async () => {
    setUbicacion({ status: 'locating' });
    setUbicacion(await readUbicacion());
  };

  // Coming back from the settings of the phone, the permiso may be granted.
  const deniedForGood = ubicacion.status === 'deniedForGood';
  useEffect(() => {
    if (!deniedForGood) {
      return;
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void recheckUbicacion({ status: 'deniedForGood' }).then((next) =>
          // A tap may have changed the state while the permiso was read.
          setUbicacion((current) => (current.status === 'deniedForGood' ? next : current)),
        );
      }
    });
    return () => subscription.remove();
  }, [deniedForGood]);

  return { ubicacion, locate };
}
