import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Duenio } from '@/features/eventos/dominio/evento';
import { getDuenioId } from '@/features/eventos/dominio/opcionesDeDuenio';

import type { Lugar } from '../dominio/lugar';
import { ErrorDeLugar, getLugaresDelDuenio, guardarLugar } from './lugares';

function lugaresKey(duenio: Duenio) {
  return ['lugares', duenio.alcance, getDuenioId(duenio)] as const;
}

/** The lugares of the list of a duenio; nothing while no duenio is chosen. */
export function useLugares(duenio: Duenio | null) {
  return useQuery({
    queryKey: duenio === null ? ['lugares', null] : lugaresKey(duenio),
    queryFn: () => (duenio === null ? Promise.resolve([]) : getLugaresDelDuenio(duenio)),
    enabled: duenio !== null,
  });
}

/**
 * Saves a lugar in the list of a duenio. The list is read again afterwards, so
 * the lugar shows the next time the sheet opens.
 */
export function useGuardarLugar() {
  const queryClient = useQueryClient();

  return useMutation({
    // A write is never queued for later: without a connection it fails now.
    networkMode: 'always',
    mutationFn: ({ nombre, duenio }: { nombre: string; duenio: Duenio }) =>
      guardarLugar(nombre, duenio),
    // Not awaited: the save is done when the lugar is saved, not when the list
    // is read again, which waits for a connection.
    onSuccess: (lugar: Lugar) => {
      void queryClient.invalidateQueries({ queryKey: lugaresKey(lugar.duenio) });
    },
  });
}

/** The kind of a failed save of a lugar, for its message. */
export function getTipoDeErrorDeLugar(error: unknown) {
  return error instanceof ErrorDeLugar ? error.tipo : 'otro';
}
