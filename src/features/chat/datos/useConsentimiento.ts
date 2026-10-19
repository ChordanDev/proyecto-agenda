import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useSesion } from '@/features/sesion/datos/useSesion';

import type { ConsentimientoLeido } from '../dominio/getChatEstado';
import { getConsentimiento } from './getConsentimiento';
import { saveConsentimiento } from './saveConsentimiento';

/** Its key; leaving the session removes it, since it belongs to the usuario. */
export const CONSENTIMIENTO_QUERY_KEY = ['chat', 'consentimiento'] as const;

/** The consentimiento of the usuario; it only reads it while there is a session. */
export function useConsentimiento(): {
  consentimiento: ConsentimientoLeido;
  retry: () => void;
} {
  const hasSesion = useSesion() === true;
  const query = useQuery({
    queryKey: CONSENTIMIENTO_QUERY_KEY,
    queryFn: getConsentimiento,
    enabled: hasSesion,
  });

  const consentimiento: ConsentimientoLeido =
    query.data === true ? 'si' : query.data === false ? 'no' : query.isError ? 'error' : 'leyendo';

  return { consentimiento, retry: () => void query.refetch() };
}

/** "Acepto": saves the consentimiento and opens the conversacion. */
export function useAceptarConsentimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveConsentimiento,
    // A failed connection must come back as an error to show.
    networkMode: 'always',
    onSuccess: () => queryClient.setQueryData(CONSENTIMIENTO_QUERY_KEY, true),
  });
}
