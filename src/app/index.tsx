import { Redirect } from 'expo-router';

import { useFirstScreen } from '@/features/sesion/datos/useFirstScreen';
import { firstScreenRoute } from '@/features/sesion/dominio/firstScreenRoute';

// The start route shows nothing: it replaces itself with the first screen, so
// going back never returns here.
export default function IndexRoute() {
  const firstScreen = useFirstScreen();

  // The root layout only renders the routes once the first screen is known.
  if (firstScreen === undefined) {
    return null;
  }

  return <Redirect href={firstScreenRoute(firstScreen)} />;
}
