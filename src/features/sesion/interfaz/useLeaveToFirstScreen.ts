import { useRouter } from 'expo-router';

import { useIglesiaElegida } from '@/features/iglesias/datos/useIglesiaElegida';

import { getFirstScreen } from '../dominio/getFirstScreen';
import { firstScreenRoute } from '../dominio/firstScreenRoute';

/**
 * Once the session is gone, the app goes where it would open without one: the
 * calendario of the iglesia elegida of the phone, or the Bienvenida when there
 * is none.
 */
export function useLeaveToFirstScreen() {
  const router = useRouter();
  const { data: iglesiaElegida } = useIglesiaElegida();

  return () => {
    const screen = getFirstScreen({ hasIglesiaElegida: iglesiaElegida != null, hasSesion: false });

    if (screen === 'calendario') {
      // The tabs are already on display: switch to the one of the calendario.
      router.navigate(firstScreenRoute(screen));
    } else {
      router.replace(firstScreenRoute(screen));
    }
  };
}
