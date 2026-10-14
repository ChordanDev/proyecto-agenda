import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import type { Database } from './database.types';

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
const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * Typed Supabase client. Only the `datos` layer of a feature imports it:
 * a component never calls Supabase (enforced by ESLint).
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    // The session stays until the person signs out: the refresh token does not
    // expire and the client renews the access token by itself.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
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
