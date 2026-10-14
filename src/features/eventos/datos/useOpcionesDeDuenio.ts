import { useQuery } from '@tanstack/react-query';

import { useCargos } from '@/features/sesion/datos/useCargos';

import { getOpcionesDeDuenio, type OpcionesDeDuenio } from '../dominio/opcionesDeDuenio';
import { getEstructuraConNombres } from './getEstructuraConNombres';

/** The duenios the usuario can give an evento; undefined while they are read. */
export function useOpcionesDeDuenio(): {
  data: OpcionesDeDuenio | undefined;
  isError: boolean;
  refetch: () => void;
} {
  const cargos = useCargos();
  const estructura = useQuery({
    queryKey: ['estructura-con-nombres'],
    queryFn: getEstructuraConNombres,
  });

  return {
    data:
      cargos.data && estructura.data
        ? getOpcionesDeDuenio(cargos.data, estructura.data)
        : undefined,
    isError: cargos.isError || estructura.isError,
    refetch: () => {
      if (cargos.isError) void cargos.refetch();
      if (estructura.isError) void estructura.refetch();
    },
  };
}
