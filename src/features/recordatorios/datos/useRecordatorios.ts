import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Linking } from 'react-native';

import { useSesion } from '@/features/sesion/datos/useSesion';

import {
  registroQueryKey,
  sincronizarRecordatorios,
  type CambioDeRegistro,
} from './sincronizarRecordatorios';
import { getPermiso, pedirPermiso, type Permiso } from './telefono';

const permisoQueryKey = ['recordatorios', 'permiso'] as const;

/**
 * The Recordatorios section of Ajustes: the permiso of the phone and, once
 * given, its registro, brought up to date with whoever uses it.
 */
export function useRecordatorios() {
  const queryClient = useQueryClient();
  const hasSesion = useSesion();

  const permiso = useQuery({
    queryKey: permisoQueryKey,
    queryFn: getPermiso,
    // Asks the phone, not the network.
    networkMode: 'always',
    retry: false,
  });

  // The permiso may be given from the settings of the phone: read it again on
  // coming back to the app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void queryClient.invalidateQueries({ queryKey: permisoQueryKey });
    });
    return () => subscription.remove();
  }, [queryClient]);

  const registro = useQuery({
    // The session decides who the phone belongs to: read again when it changes.
    queryKey: [...registroQueryKey, hasSesion],
    queryFn: ({ client }) => sincronizarRecordatorios(client),
    enabled: permiso.data === 'concedido' && hasSesion !== undefined,
  });

  const guardar = useMutation({
    mutationFn: (cambio: CambioDeRegistro) => sincronizarRecordatorios(queryClient, cambio),
    onSuccess: (estado) => queryClient.setQueryData([...registroQueryKey, hasSesion], estado),
  });

  // Asks for the permiso; once given, the registro is read and saved with its
  // initial value.
  const activar = useMutation({
    mutationFn: pedirPermiso,
    networkMode: 'always',
    onSuccess: (nuevo: Permiso) => queryClient.setQueryData(permisoQueryKey, nuevo),
  });

  return {
    permiso: permiso.data,
    registro,
    guardar,
    activar,
    abrirConfiguracion: () => void Linking.openSettings(),
  };
}
