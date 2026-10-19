import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSesion } from '@/features/sesion/datos/useSesion';
import { newId } from '@/shared/newId';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import {
  crearConversacion,
  getPedido,
  getPreguntaAReintentar,
  reducirConversacion,
  type AccionDeConversacion,
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
  const [conversacion, setConversacion] = useState(() => crearConversacion(1));
  // The conversacion as it is now, ahead of the render: a second tap before
  // the screen updates must see the pregunta already in flight.
  const actual = useRef(conversacion);
  // Each new conversacion gets the next id: a respuesta to an older one is dropped.
  const proximoId = useRef(2);

  const dispatch = useCallback((accion: AccionDeConversacion): Conversacion => {
    const siguiente = reducirConversacion(actual.current, accion);
    actual.current = siguiente;
    setConversacion(siguiente);
    return siguiente;
  }, []);

  const nueva = useCallback(() => {
    dispatch({ tipo: 'nueva', id: proximoId.current++ });
  }, [dispatch]);

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
    const antes = actual.current;
    const id = newId();
    const siguiente = dispatch({ tipo: 'preguntar', id, texto });
    const pedido = getPedido(siguiente, id);
    if (siguiente === antes || pedido === null) {
      return;
    }
    void consultar(siguiente.id, pedido);
  };

  const reintentar =
    getPreguntaAReintentar(conversacion) === null
      ? null
      : () => {
          // Read now, not at the render: a second tap finds nothing to retry.
          const preguntaId = getPreguntaAReintentar(actual.current);
          const pedido = preguntaId === null ? null : getPedido(actual.current, preguntaId);
          if (pedido === null) {
            return;
          }
          const siguiente = dispatch({ tipo: 'reintentar' });
          void consultar(siguiente.id, pedido);
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
