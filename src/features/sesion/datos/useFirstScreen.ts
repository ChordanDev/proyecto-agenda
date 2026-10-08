import { useQuery } from '@tanstack/react-query';

import { useIglesiaElegida } from '@/features/iglesias/datos/useIglesiaElegida';

import { getFirstScreen, type FirstScreen } from '../dominio/getFirstScreen';
import { getHasSesion } from './getHasSesion';

/**
 * The screen the app opens on, or `undefined` while the iglesia elegida and the
 * session are still being read. A read that fails counts as missing: if nothing
 * can be read, the app opens on the Bienvenida.
 */
export function useFirstScreen(): FirstScreen | undefined {
  const iglesiaElegida = useIglesiaElegida();
  const sesion = useQuery({
    queryKey: ['sesion'],
    queryFn: getHasSesion,
    // The client answers from what it holds, without a request.
    networkMode: 'always',
    retry: false,
  });

  if (iglesiaElegida.isPending || sesion.isPending) {
    return undefined;
  }

  return getFirstScreen({
    hasIglesiaElegida: iglesiaElegida.data != null,
    hasSesion: sesion.data === true,
  });
}
