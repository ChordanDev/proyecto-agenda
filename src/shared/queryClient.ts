import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient, type Query } from '@tanstack/react-query';
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client';
import { AppState } from 'react-native';

import { VIGENCIA_MS } from './vigencia';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: VIGENCIA_MS,
      // What was downloaded is never thrown away: without connection, the last
      // calendario downloaded is what there is to show. The vigencia only
      // decides when to ask again.
      gcTime: Infinity,
    },
  },
});

// React Native has no window focus: the app coming back to the front is the
// focus, and it refetches the queries on screen whose vigencia expired.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });

  return () => subscription.remove();
});

// React Native has no browser online events: NetInfo tells when the connection
// comes and goes. Queries wait while offline and are read again when it is back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(state.isConnected !== false);
  }),
);

/**
 * Queries that read what this phone already keeps on its own (the session, the
 * iglesia elegida). Saving them in the cache too would keep two copies that can
 * disagree.
 */
const LOCAL_QUERY_KEYS = new Set(['sesion', 'iglesiaElegida']);

function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && !LOCAL_QUERY_KEYS.has(String(query.queryKey[0]));
}

/**
 * The cache of queries saved on the phone, so the last calendario downloaded
 * survives closing the app and is shown without connection.
 */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister: createAsyncStoragePersister({ storage: AsyncStorage, key: 'query-cache' }),
  // It never expires: it is shown with the date it was downloaded.
  maxAge: Infinity,
  // Raise it when the shape of a saved query changes, so an old cache that the
  // new code cannot read is dropped instead of shown.
  // '2': eventos gained lugarId (#129).
  // '3': the calendario of a month gained the etiquetas of its eventos (#170).
  buster: '3',
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
};
