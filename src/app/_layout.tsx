import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useFirstScreen } from '@/features/sesion/datos/useFirstScreen';
import { queryClient } from '@/shared/queryClient';
import { useDesignFonts } from '@/shared/ui/fonts';

// The splash screen stays up until the fonts of the design are ready and the
// first screen is on display.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <RootStack />
    </QueryClientProvider>
  );
}

function RootStack() {
  const [fontsLoaded, fontsError] = useDesignFonts();
  // If the fonts fail to load, the app still opens, with the system font.
  const fontsReady = fontsLoaded || fontsError !== null;
  const firstScreenKnown = useFirstScreen() !== undefined;
  const ready = fontsReady && firstScreenKnown;
  // The start route only redirects to the first screen: until it has done so,
  // there is nothing to show.
  const pastStartRoute = usePathname() !== '/';

  useEffect(() => {
    if (ready && pastStartRoute) {
      SplashScreen.hideAsync();
    }
  }, [ready, pastStartRoute]);

  if (!ready) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* These two open from the start route, behind the splash screen: a
          transition would still be running when the splash screen leaves. The
          tabs open on the calendar. */}
      <Stack.Screen name="bienvenida" options={{ animation: 'none' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
      {/* The sample screen of the base components only exists in development. */}
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="showcase" />
      </Stack.Protected>
    </Stack>
  );
}
