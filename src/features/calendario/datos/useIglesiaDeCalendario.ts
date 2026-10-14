import { useQuery } from '@tanstack/react-query';

import { useIglesiaElegida } from '@/features/iglesias/datos/useIglesiaElegida';
import { useIglesias } from '@/features/iglesias/datos/useIglesias';
import { useCargos } from '@/features/sesion/datos/useCargos';
import { useSesion } from '@/features/sesion/datos/useSesion';

import { getIglesiasDeCargos } from '../dominio/armarCalendarioDeUsuario';
import { getEncabezadoDeCalendario, type Encabezado } from '../dominio/encabezadoDeCalendario';
import { getIglesiasEnEstructura } from './getIglesiasEnEstructura';
import type { FuenteDeCalendario } from './useCalendario';

/** What the calendario shows and where it comes from. */
export type OrigenDeCalendario =
  /** A hermano with no iglesia elegida. */
  | { estado: 'sin-iglesia' }
  /** A session whose cargos or iglesias are still being read. */
  | { estado: 'cargando' }
  /** A session whose cargos or iglesias could not be read. */
  | { estado: 'error'; refetch: () => void }
  /** A session whose cargos cover no iglesia. */
  | { estado: 'sin-iglesias-asignadas' }
  | {
      estado: 'listo';
      fuente: FuenteDeCalendario;
      /** Undefined until the nombres are read. */
      encabezado: Encabezado | undefined;
      /** Something else to read again when the person retries a failed load. */
      onRetry: (() => void) | undefined;
    };

/**
 * The calendario this phone shows. With a session it is the one of the
 * usuario's cargos, and the iglesia elegida of the phone is ignored; without
 * one it is the one of the iglesia elegida of the hermano.
 *
 * An iglesia elegida that is not among the iglesias no longer exists: it counts
 * as none, so the screen offers to choose another one instead of failing to
 * load a calendario for ever.
 */
export function useIglesiaDeCalendario(): OrigenDeCalendario {
  const hasSesion = useSesion() === true;
  const { data: iglesiaElegida } = useIglesiaElegida();
  const { data: iglesias, refetch: refetchIglesias } = useIglesias();
  const cargos = useCargos();
  const estructura = useQuery({
    queryKey: ['iglesias-estructura'],
    queryFn: getIglesiasEnEstructura,
    enabled: hasSesion,
  });

  if (hasSesion) {
    if (cargos.isError || estructura.isError) {
      return {
        estado: 'error',
        refetch: () => {
          if (cargos.isError) cargos.refetch();
          if (estructura.isError) estructura.refetch();
        },
      };
    }

    if (cargos.data === undefined || estructura.data === undefined) {
      return { estado: 'cargando' };
    }

    const covered = getIglesiasDeCargos(cargos.data, estructura.data);

    if (covered.length === 0) {
      return { estado: 'sin-iglesias-asignadas' };
    }

    return {
      estado: 'listo',
      fuente: { tipo: 'usuario', cargos: cargos.data, iglesias: covered },
      encabezado: getEncabezadoDeCalendario(covered),
      onRetry: undefined,
    };
  }

  const iglesia = iglesias?.find((candidate) => candidate.id === iglesiaElegida);
  const exists = iglesias === undefined || iglesia !== undefined;

  if (iglesiaElegida == null || !exists) {
    return { estado: 'sin-iglesia' };
  }

  return {
    estado: 'listo',
    fuente: { tipo: 'iglesia', iglesiaId: iglesiaElegida },
    encabezado: iglesia && getEncabezadoDeCalendario([iglesia]),
    // Without the iglesias the header has no nombres: a retry reads them too.
    onRetry: iglesia === undefined ? () => void refetchIglesias() : undefined,
  };
}
