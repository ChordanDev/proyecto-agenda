import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Whether the phone lets the app notify: `sin-preguntar` while it can still be
 * asked, `denegado` once only the settings of the phone can give it.
 */
export type Permiso = 'concedido' | 'sin-preguntar' | 'denegado';

// Android 13 only asks for the permiso once a channel exists.
const ANDROID_CHANNEL_ID = 'recordatorios';

/**
 * Reads the permiso without asking. It also creates the channel, which a phone
 * that granted the permiso without asking would otherwise never get. A failed
 * channel does not hide the permiso: the next read tries again.
 */
export async function getPermiso(): Promise<Permiso> {
  await createAndroidChannel().catch(() => undefined);
  return toPermiso(await Notifications.getPermissionsAsync());
}

/** Asks the phone for the permiso; it only shows the question while it can still be asked. */
export async function pedirPermiso(): Promise<Permiso> {
  await createAndroidChannel();
  return toPermiso(await Notifications.requestPermissionsAsync());
}

// Creating a channel that already exists keeps what the user set on it, so it is safe to repeat.
async function createAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Recordatorios',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function toPermiso({ granted, canAskAgain }: { granted: boolean; canAskAgain: boolean }): Permiso {
  if (granted) return 'concedido';
  return canAskAgain ? 'sin-preguntar' : 'denegado';
}

/**
 * How long the phone can take to give its push token. Getting one goes through
 * the push service of the phone and the Expo servers; past half a minute,
 * nothing is coming, as with a request to Supabase.
 */
export const TOKEN_TIMEOUT_MS = 30_000;

/**
 * The Expo push token of this phone, which identifies it and works as its
 * secret. It needs the permiso and the EAS project of the app. A token that
 * never comes fails as a lost connection does, so the syncs waiting behind
 * this one can run. actualizarRecordatorios then tries again after a wait,
 * since a phone that stays online never sees its connection come back.
 */
export async function getTokenDelTelefono(): Promise<string> {
  const projectId: unknown =
    Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;

  if (typeof projectId !== 'string') {
    throw new Error('The app has no EAS projectId: run `eas init` to get a push token.');
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new TypeError(
          `Network request failed: no push token in ${TOKEN_TIMEOUT_MS / 1000} seconds`,
        ),
      );
    }, TOKEN_TIMEOUT_MS);
  });

  try {
    const { data } = await Promise.race([
      Notifications.getExpoPushTokenAsync({ projectId }),
      timeout,
    ]);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
