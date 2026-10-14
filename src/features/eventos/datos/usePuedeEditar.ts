import { useCargos } from '@/features/sesion/datos/useCargos';
import { useSesion } from '@/features/sesion/datos/useSesion';
import {
  cargosAbarcanDuenio,
  type DuenioEnEstructura,
} from '@/features/sesion/dominio/cargosAbarcanDuenio';

/**
 * Whether the detail offers Editar and Borrar: only with a session, and a
 * cargo that covers the duenio of the evento. The database decides again when
 * the change is saved.
 */
export function usePuedeEditar(duenio: DuenioEnEstructura | undefined): boolean {
  const hasSesion = useSesion() === true;
  const { data: cargos } = useCargos();

  return hasSesion && cargos !== undefined && duenio !== undefined
    ? cargosAbarcanDuenio(cargos, duenio)
    : false;
}
