import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import type { Database } from './database.types';
import { createFetchWithTimeout } from './fetchWithTimeout';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration. Copy .env.example to .env.local and set ' +
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart the bundler.',
  );
}

/**
 * The session lives in the secure storage of the phone (Keychain on iOS,
 * encrypted preferences on Android). The module enforces no size limit on the
 * value, so the whole session is one entry.
 */
export const authStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * Where the client keeps the session in that storage: the key the client uses
 * by default, written out so that the session can be read without waiting for
 * the client to start.
 */
export const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;

/**
 * Typed Supabase client. Only the `datos` layer of a feature imports it:
 * a component never calls Supabase (enforced by ESLint).
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    storageKey: AUTH_STORAGE_KEY,
    // The session stays until the person signs out: the refresh token does not
    // expire and the client renews the access token by itself.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
  // A request that never gets an answer fails as a lost connection instead of
  // leaving a write on "Guardando…" forever.
  global: { fetch: createFetchWithTimeout(fetch) },
});

// A timer does not run while the app is in the background: renew only while it
// is in front, and check at once when it comes back.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
