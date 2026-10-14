import { useIglesiaElegida } from '@/features/iglesias/datos/useIglesiaElegida';
import { useIglesias } from '@/features/iglesias/datos/useIglesias';

import { getMiIglesia, type MiIglesia } from '../dominio/miIglesia';

/** The iglesia elegida as Ajustes shows it. */
export type EstadoDeMiIglesia =
  | { estado: 'cargando' }
  | { estado: 'error'; refetch: () => void }
  /** None was chosen on this phone, or the one chosen no longer exists. */
  | { estado: 'sin-iglesia' }
  | { estado: 'lista'; iglesia: MiIglesia };

/**
 * The iglesia elegida of this phone with its nombres. They come from the list
 * of the buscador, which "Cambiar" opens anyway.
 */
export function useMiIglesia(): EstadoDeMiIglesia {
  const iglesiaElegida = useIglesiaElegida();
  const iglesias = useIglesias();

  if (!iglesiaElegida.isFetched) {
    return { estado: 'cargando' };
  }

  // A read of the phone storage that failed counts as missing, as it does for
  // the first screen.
  const iglesiaElegidaId = iglesiaElegida.data ?? null;

  if (iglesiaElegidaId === null) {
    return { estado: 'sin-iglesia' };
  }

  if (iglesias.data === undefined) {
    return iglesias.isError && !iglesias.isFetching
      ? { estado: 'error', refetch: () => void iglesias.refetch() }
      : { estado: 'cargando' };
  }

  const iglesia = getMiIglesia(iglesiaElegidaId, iglesias.data);

  return iglesia ? { estado: 'lista', iglesia } : { estado: 'sin-iglesia' };
}
