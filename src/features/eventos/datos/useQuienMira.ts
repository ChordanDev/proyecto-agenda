import { useIglesiaElegida } from '@/features/iglesias/datos/useIglesiaElegida';
import { useCargos } from '@/features/sesion/datos/useCargos';
import { useSesion } from '@/features/sesion/datos/useSesion';

import type { QuienMira } from '../dominio/eventoCompartido';

/**
 * Who looks at an evento, as the calendario decides it: a session with cargos
 * looks through them; without a session, or without cargos, the iglesia
 * elegida of the phone does. Undefined while the cargos are read.
 */
export function useQuienMira(): QuienMira | undefined {
  const hasSesion = useSesion() === true;
  const { data: cargos } = useCargos();
  const { data: iglesiaElegida } = useIglesiaElegida();

  if (hasSesion) {
    if (cargos === undefined) {
      return undefined;
    }

    if (cargos.length > 0) {
      return { cargos };
    }
  }

  return { iglesiaElegida: iglesiaElegida ?? null };
}
