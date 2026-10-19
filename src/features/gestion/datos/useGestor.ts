import { useQuery } from '@tanstack/react-query';

import { useSesion } from '@/features/sesion/datos/useSesion';

import { getVistaDeGestion, type VistaDeGestion } from '../dominio/vistaDeGestion';
import { getCargosDelGestor } from './getCargosDelGestor';

// Under ['cargos']: signing out removes them (forgetSesion).
export const GESTOR_QUERY_KEY = ['cargos', 'gestor'] as const;

/**
 * The usuario signed in and the vista of the gestion their cargos give, or
 * undefined while they are read or without a session.
 */
export function useGestor():
  { usuarioId: string | null; vista: VistaDeGestion | null } | undefined {
  const hasSesion = useSesion() === true;
  const gestor = useQuery({
    queryKey: GESTOR_QUERY_KEY,
    queryFn: getCargosDelGestor,
    enabled: hasSesion,
  });

  if (!hasSesion || !gestor.data) {
    return undefined;
  }

  return { usuarioId: gestor.data.usuarioId, vista: getVistaDeGestion(gestor.data.cargos) };
}
