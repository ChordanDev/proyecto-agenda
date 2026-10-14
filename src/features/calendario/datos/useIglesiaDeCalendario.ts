import { useQuery } from '@tanstack/react-query';

import { useIglesiaElegida } from '@/features/iglesias/datos/useIglesiaElegida';
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
      /**
       * The header of a usuario. The one of the iglesia elegida comes with its
       * calendario, which is where the iglesia is read.
       */
      encabezado: Encabezado | undefined;
    };

/**
 * The calendario this phone shows. With a session it is the one of the
 * usuario's cargos, and the iglesia elegida of the phone is ignored; without
 * one, or for a usuario without cargos, it is the one of the iglesia elegida,
 * as for a hermano.
 *
 * The iglesia elegida is not read here: its calendario reads it by id, with its
 * nombres, and tells when it no longer exists, so that the screen offers to
 * choose another one instead of failing to load a calendario for ever.
 */
export function useIglesiaDeCalendario(): OrigenDeCalendario {
  const hasSesion = useSesion() === true;
  const { data: iglesiaElegida } = useIglesiaElegida();
  const cargos = useCargos();
  const estructura = useQuery({
    queryKey: ['iglesias-estructura'],
    queryFn: getIglesiasEnEstructura,
    enabled: hasSesion,
  });

  // A usuario without cargos sees the calendario as a hermano.
  const sinCargos = cargos.data?.length === 0;

  if (hasSesion && !sinCargos) {
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
    };
  }

  if (iglesiaElegida == null) {
    return { estado: 'sin-iglesia' };
  }

  return {
    estado: 'listo',
    fuente: { tipo: 'iglesia', iglesiaId: iglesiaElegida },
    encabezado: undefined,
  };
}
