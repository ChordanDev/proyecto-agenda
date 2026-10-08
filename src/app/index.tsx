import { Redirect, type Href } from 'expo-router';

import { useFirstScreen } from '@/features/sesion/datos/useFirstScreen';
import type { FirstScreen } from '@/features/sesion/dominio/getFirstScreen';

const routes = {
  bienvenida: '/bienvenida',
  calendario: '/calendario',
} as const satisfies Record<FirstScreen, Href>;

// The start route shows nothing: it replaces itself with the first screen, so
// going back never returns here.
export default function IndexRoute() {
  const firstScreen = useFirstScreen();

  // The root layout only renders the routes once the first screen is known.
  if (firstScreen === undefined) {
    return null;
  }

  return <Redirect href={routes[firstScreen]} />;
}
