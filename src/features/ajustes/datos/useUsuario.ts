import { useQuery } from '@tanstack/react-query';

import { getIglesiasEnEstructura } from '@/features/calendario/datos/getIglesiasEnEstructura';
import { useCargos } from '@/features/sesion/datos/useCargos';
import { useEmailDelUsuario } from '@/features/sesion/datos/useEmailDelUsuario';
import { useSesion } from '@/features/sesion/datos/useSesion';

import { describeUsuario, type DescripcionDeUsuario } from '../dominio/usuario';

/**
 * The card of the usuario signed in, or undefined without a session. The
 * nombres of their iglesias come from the same read as their calendario.
 */
export function useUsuario(): DescripcionDeUsuario | undefined {
  const hasSesion = useSesion() === true;
  const email = useEmailDelUsuario();
  const cargos = useCargos();
  const estructura = useQuery({
    queryKey: ['iglesias-estructura'],
    queryFn: getIglesiasEnEstructura,
    enabled: hasSesion,
  });

  if (!hasSesion) {
    return undefined;
  }

  return describeUsuario({
    email: email.data ?? null,
    cargos: cargos.data,
    iglesias: estructura.data,
  });
}
