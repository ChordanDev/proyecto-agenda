import { onlineManager, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { newId } from '@/shared/newId';

import type { ExcepcionAGuardar } from '../dominio/edicionDeFecha';
import type { EventoAGuardar } from '../dominio/formularioDeEvento';
import { olvidarFormularioPrecargado, type FormularioPrecargado } from './formularioPrecargado';
import {
  borrarEvento,
  borrarFecha,
  ErrorDeEscritura,
  type EventoDestino,
  guardarEvento,
  guardarExcepcion,
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
 * A new evento opened `precargado` is created with the id chosen for it, and
 * whoever opened it is told once it is saved. That is done here, not by the
 * form: the form can be closed before the answer arrives.
 */
export function useGuardarEvento(
  id: string | undefined,
  precargado?: Pick<FormularioPrecargado, 'eventoId' | 'onGuardado'>,
) {
  const invalidar = useInvalidarEventos();
  const [nuevoId] = useState(() => precargado?.eventoId ?? newId());
  const destino: EventoDestino = id === undefined ? { crear: nuevoId } : { editar: id };

  return useMutation({
    // A write is never queued for later: without a connection it fails now and
    // the form keeps what was written.
    networkMode: 'always',
    mutationFn: (evento: EventoAGuardar) => guardarEvento(evento, destino),
    onSuccess: (savedId) => {
      if (precargado !== undefined) {
        olvidarFormularioPrecargado(precargado.eventoId);
        precargado.onGuardado(savedId);
      }
      return invalidar(savedId);
    },
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

/**
 * Saves what a single date of a series changes. The calendarios and the
 * evento are read again, so the date shows its changes right away.
 */
export function useGuardarExcepcion(eventoId: string) {
  const invalidar = useInvalidarEventos();

  return useMutation({
    networkMode: 'always',
    mutationFn: (excepcion: ExcepcionAGuardar) => guardarExcepcion(eventoId, excepcion),
    onSuccess: () => invalidar(eventoId),
    onError: (error) => {
      // The evento or the date changed meanwhile: what is shown is read again.
      // Not awaited, as in `useGuardarEvento`.
      if (cambioMientrasTanto(error)) {
        void invalidar(eventoId);
      }
    },
  });
}

/**
 * Deletes a single date of a series. The detail leaves the screen: the evento
 * is marked to be read again when it is opened, not now, so the detail does
 * not show another date for an instant.
 */
export function useBorrarFecha(eventoId: string) {
  const queryClient = useQueryClient();
  const invalidar = useInvalidarEventos();

  return useMutation({
    networkMode: 'always',
    mutationFn: (fecha: string) => borrarFecha(eventoId, fecha),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calendario'] }),
        queryClient.invalidateQueries({ queryKey: ['evento', eventoId], refetchType: 'none' }),
      ]),
    onError: (error) => {
      if (cambioMientrasTanto(error)) {
        void invalidar(eventoId);
      }
    },
  });
}

/** Whether a write failed because the evento or the date changed meanwhile. */
function cambioMientrasTanto(error: unknown): boolean {
  const tipo = getTipoDeError(error);

  return tipo === 'no-existe' || tipo === 'fecha-cambiada';
}

/** The kind of a failed write, for its message. */
export function getTipoDeError(error: unknown) {
  return error instanceof ErrorDeEscritura ? error.tipo : 'otro';
}
