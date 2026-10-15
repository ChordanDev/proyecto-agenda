import { onlineManager, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { newId } from '@/shared/newId';

import type { EventoAGuardar } from '../dominio/formularioDeEvento';
import {
  borrarEvento,
  ErrorDeEscritura,
  type EventoDestino,
  guardarEvento,
} from './escribirEvento';

/** Whether the phone believes it has a connection; writing needs one. */
export function hasConexion(): boolean {
  return onlineManager.isOnline();
}

/**
 * After a write, the calendarios and the evento are read again: what was saved
 * shows right away, and what was deleted disappears.
 */
function useInvalidarEventos() {
  const queryClient = useQueryClient();

  return (id: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['calendario'] }),
      queryClient.invalidateQueries({ queryKey: ['evento', id] }),
    ]);
}

/**
 * Saves an evento, new (no `id`) or edited. A new one gets its id once, when
 * the form opens: tapping Guardar again after an answer that never came saves
 * that same evento instead of a second one. When the evento was deleted
 * meanwhile, the calendarios and the evento are read again so it disappears.
 */
export function useGuardarEvento(id: string | undefined) {
  const invalidar = useInvalidarEventos();
  const [nuevoId] = useState(newId);
  const destino: EventoDestino = id === undefined ? { crear: nuevoId } : { editar: id };

  return useMutation({
    // A write is never queued for later: without a connection it fails now and
    // the form keeps what was written.
    networkMode: 'always',
    mutationFn: (evento: EventoAGuardar) => guardarEvento(evento, destino),
    onSuccess: (savedId) => invalidar(savedId),
    onError: (error) => {
      // Not awaited: reading the evento again finds it gone and unmounts the
      // form, which would drop the warning and the close of `mutate`.
      if (getTipoDeError(error) === 'no-existe') {
        void invalidar(id ?? nuevoId);
      }
    },
  });
}

/**
 * Deletes an evento. Only the calendarios are read again: the detail of the
 * evento leaves the screen, and reading it again would only find it gone.
 */
export function useBorrarEvento(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    networkMode: 'always',
    mutationFn: () => borrarEvento(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendario'] }),
  });
}

/** The kind of a failed write, for its message. */
export function getTipoDeError(error: unknown) {
  return error instanceof ErrorDeEscritura ? error.tipo : 'otro';
}
