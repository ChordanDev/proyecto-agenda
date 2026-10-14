import { uuid } from 'expo-modules-core';

/**
 * A new random id (UUID v4), for a row the app names before saving it. It uses
 * the generator of expo-modules-core, which every Expo app already has.
 */
export function newId(): string {
  return uuid.v4();
}
