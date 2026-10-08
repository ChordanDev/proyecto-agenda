import AsyncStorage from '@react-native-async-storage/async-storage';

// The iglesia elegida belongs to the phone, not to a person: it is kept in the
// storage of the phone, by its id.
const STORAGE_KEY = 'iglesiaElegida';

/** Reads the id of the iglesia elegida, or `null` when none was chosen on this phone. */
export function getIglesiaElegida(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export function setIglesiaElegida(iglesiaId: string): Promise<void> {
  return AsyncStorage.setItem(STORAGE_KEY, iglesiaId);
}

/** Leaves the phone without an iglesia elegida. */
export function clearIglesiaElegida(): Promise<void> {
  return AsyncStorage.removeItem(STORAGE_KEY);
}
