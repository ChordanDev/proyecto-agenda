import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { useSesion } from '@/features/sesion/datos/useSesion';
import { newId } from '@/shared/newId';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import {
  crearConversacion,
  getPedido,
  getPreguntaAReintentar,
  reducirConversacion,
  type Conversacion,
  type PedidoDeConsulta,
} from '../dominio/conversacion';
import { getVueltaDelChat } from '../dominio/fallas';
import { enviarConsulta } from './enviarConsulta';
import { CONSENTIMIENTO_QUERY_KEY } from './useConsentimiento';
import { getZonaHoraria } from './zonaHoraria';

/** Under `['chat']`, so leaving the session removes it. */
const ZONA_HORARIA_QUERY_KEY = ['chat', 'zonaHoraria'] as const;

export type ConversacionEnCurso = {
  conversacion: Conversacion;
  /** "1 de noviembre", while the presupuesto agotado closes the chat. */
  vuelta: string | null;
  enviar: (texto: string) => void;
  /** Null when no falla can be retried now. */
  reintentar: (() => void) | null;
  nueva: () => void;
};

/**
 * The conversacion of the Chat tab. It lives in memory only, while the app is
 * open: closing the app, "Nueva conversación" or leaving the session loses it.
 */
export function useConversacion(): ConversacionEnCurso {
  const hasSesion = useSesion() === true;
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [conversacion, dispatch] = useReducer(reducirConversacion, 1, crearConversacion);
  // Each new conversacion gets the next id: a respuesta to an older one is dropped.
  const proximoId = useRef(2);

  const nueva = useCallback(() => {
    dispatch({ tipo: 'nueva', id: proximoId.current++ });
  }, []);

  // The conversacion belongs to the usuario: another one signing in on this
  // phone must not see it.
  useEffect(() => {
    if (!hasSesion) {
      nueva();
    }
  }, [hasSesion, nueva]);

  const consultar = async (conversacionId: number, pedido: PedidoDeConsulta) => {
    const resultado = isOnline
      ? await enviarConsulta(pedido)
      : ({ ok: false, falla: 'sin_conexion' } as const);

    if (resultado.ok) {
      dispatch({ tipo: 'responder', conversacionId, id: newId(), respuesta: resultado.respuesta });
      return;
    }
    if (resultado.falla === 'sin_consentimiento') {
      // Taken back on another phone: the tab asks for the aviso again.
      void queryClient.invalidateQueries({ queryKey: CONSENTIMIENTO_QUERY_KEY });
    }
    dispatch({ tipo: 'fallar', conversacionId, id: newId(), falla: resultado.falla });
  };

  const enviar = (texto: string) => {
    const accion = { tipo: 'preguntar', id: newId(), texto } as const;
    const siguiente = reducirConversacion(conversacion, accion);
    const pedido = getPedido(siguiente, accion.id);
    if (siguiente === conversacion || pedido === null) {
      return;
    }
    dispatch(accion);
    void consultar(conversacion.id, pedido);
  };

  const preguntaAReintentar = getPreguntaAReintentar(conversacion);
  const reintentar =
    preguntaAReintentar === null
      ? null
      : () => {
          const pedido = getPedido(conversacion, preguntaAReintentar);
          if (pedido === null) {
            return;
          }
          dispatch({ tipo: 'reintentar' });
          void consultar(conversacion.id, pedido);
        };

  const sinPresupuesto = conversacion.bloqueo === 'presupuesto-agotado';
  const zonaHoraria = useQuery({
    queryKey: ZONA_HORARIA_QUERY_KEY,
    queryFn: getZonaHoraria,
    enabled: hasSesion && sinPresupuesto,
    staleTime: Infinity,
  });
  // Until it is read, the one of the phone: the asociacion is where the phone is.
  const vuelta = sinPresupuesto
    ? getVueltaDelChat(
        new Date(),
        zonaHoraria.data ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      )
    : null;

  return { conversacion, vuelta, enviar, reintentar, nueva };
}
