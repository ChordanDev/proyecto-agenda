import AsyncStorage from '@react-native-async-storage/async-storage';

import { signOut } from './signOut';

// A right code signs the usuario in before they choose a password. This mark
// lives on the phone from just before the code is checked until the password
// is stored, so a flow left at the last step (the app closed, a swipe back) is
// still known when the app opens again.
const STORAGE_KEY = 'passwordRecoveryPending';

export function markRecoveryStarted(): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEY, 'true');
}

export function markRecoveryFinished(): Promise<void> {
  return AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Signs out a session that a code opened and no password closed: the flow was
 * left halfway, so the usuario has no password to come back with.
 */
export async function discardUnfinishedRecovery(): Promise<void> {
  if ((await AsyncStorage.getItem(STORAGE_KEY)) === null) {
    return;
  }

  await signOut();
  await markRecoveryFinished();
}
