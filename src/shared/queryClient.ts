import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

import { VIGENCIA_MS } from './vigencia';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: VIGENCIA_MS,
      // A month left behind is kept at least while it is valid, so coming back
      // to it shows it without a request. The offline cache belongs to #27.
      gcTime: VIGENCIA_MS,
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
