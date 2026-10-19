import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { toLocalDate } from '@/features/calendario/dominio/localDate';
import { guardarEvento } from '@/features/eventos/datos/escribirEvento';
import {
  olvidarFormularioPrecargado,
  olvidarFormulariosPrecargados,
  precargarFormulario,
} from '@/features/eventos/datos/formularioPrecargado';
import { getTipoDeError, hasConexion } from '@/features/eventos/datos/useEscribirEvento';
import { getMensajeDeError } from '@/features/eventos/dominio/errorDeEscritura';
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
import { formatVuelta, getDiaDeVuelta, getHoy } from '../dominio/fallas';
import { formularioDesdeBorrador, getEventoDelBorrador } from '../dominio/propuesta';
import { ERROR_DE_REPORTE, getReporte, type MotivoDeReporte } from '../dominio/reporte';
import { enviarConsulta } from './enviarConsulta';
import { saveReporte } from './saveReporte';
import { CONSENTIMIENTO_QUERY_KEY } from './useConsentimiento';
import { getZonaHoraria } from './zonaHoraria';

/** Under `['chat']`, so leaving the session removes it. */
const ZONA_HORARIA_QUERY_KEY = ['chat', 'zonaHoraria'] as const;

/** How often a chat closed by the presupuesto checks whether its dia of vuelta arrived. */
const REVISAR_VUELTA_MS = 60_000;

/** The zona of the phone: the asociacion is where the phone is. */
function getZonaDelTelefono(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Today by the clock of the phone, as the form checks an evento. */
function getHoyDelTelefono(): string {
  const now = new Date();
  return toLocalDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export type ConversacionEnCurso = {
  conversacion: Conversacion;
  /** "1 de noviembre", while the presupuesto agotado closes the chat. */
  vuelta: string | null;
  enviar: (texto: string) => void;
  /** Null when no falla can be retried now. */
  reintentar: (() => void) | null;
  nueva: () => void;
  /** Saves the evento of the propuesta `id`; nothing while it is saved or once it was. */
  confirmar: (id: string) => void;
  /**
   * Keeps the form loaded with the propuesta `id` and gives the clave of the
   * route that opens it; saving it there leaves the card saved. Null when the
   * propuesta cannot be edited now.
   */
  editar: (id: string) => string | null;
  /**
   * Reports the respuesta `id` with its motivo. It is not a consulta, and a
   * respuesta is reported once: nothing while it is sent or once it was.
   */
  reportar: (id: string, motivo: MotivoDeReporte) => void;
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
    // The forms its cards opened go with the conversacion.
    olvidarFormulariosPrecargados();
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
    if (resultado.falla === 'presupuesto_agotado') {
      const zonaHoraria = await queryClient
        .fetchQuery({
          queryKey: ZONA_HORARIA_QUERY_KEY,
          queryFn: getZonaHoraria,
          staleTime: Infinity,
        })
        .catch(getZonaDelTelefono);
      dispatch({
        tipo: 'fallar',
        conversacionId,
        id: newId(),
        falla: resultado.falla,
        vuelta: getDiaDeVuelta(new Date(), zonaHoraria),
      });
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

  const confirmar = (id: string) => {
    const antes = actual.current;
    const siguiente = dispatch({ tipo: 'confirmar', id });
    const propuesta = siguiente.mensajes.find((mensaje) => mensaje.id === id);
    if (siguiente === antes || propuesta?.tipo !== 'propuesta') {
      return;
    }
    const fallar = (error: string) => dispatch({ tipo: 'fallarGuardado', id, error });

    // The same checks, and the same messages, as Guardar of the form.
    const resultado = getEventoDelBorrador(propuesta.borrador, getHoyDelTelefono());
    if (!resultado.ok) {
      fallar(resultado.error);
      return;
    }
    if (!hasConexion()) {
      fallar(getMensajeDeError('sin-conexion'));
      return;
    }
    // Created with the id of the propuesta: a save tried again saves that same evento.
    guardarEvento(resultado.evento, { crear: id })
      .then(() => {
        olvidarFormularioPrecargado(id);
        dispatch({ tipo: 'guardar', id });
        return queryClient.invalidateQueries({ queryKey: ['calendario'] });
      })
      .catch((error: unknown) => fallar(getMensajeDeError(getTipoDeError(error))));
  };

  const editar = (id: string): string | null => {
    const propuesta = actual.current.mensajes.find((mensaje) => mensaje.id === id);
    if (propuesta?.tipo !== 'propuesta' || propuesta.estado !== 'pendiente') {
      return null;
    }
    return precargarFormulario({
      formulario: formularioDesdeBorrador(propuesta.borrador),
      eventoId: id,
      onGuardado: () => dispatch({ tipo: 'guardar', id }),
    });
  };

  const reportar = (id: string, motivo: MotivoDeReporte) => {
    const antes = actual.current;
    const siguiente = dispatch({ tipo: 'reportar', id, reporteId: newId() });
    const reporte = getReporte(siguiente, id);
    if (siguiente === antes || reporte?.id == null) {
      return;
    }
    const fallar = () => dispatch({ tipo: 'fallarReporte', id, error: ERROR_DE_REPORTE });

    if (!hasConexion()) {
      fallar();
      return;
    }
    saveReporte({ id: reporte.id, motivo })
      .then(() => dispatch({ tipo: 'reporteEnviado', id }))
      .catch(fallar);
  };

  // A chat closed by the presupuesto opens again by itself once its dia of
  // vuelta arrives, even if the app stayed open since then.
  const sinPresupuesto = conversacion.bloqueo === 'presupuesto-agotado';
  useEffect(() => {
    if (!sinPresupuesto) {
      return;
    }
    const revisar = setInterval(() => {
      const zonaHoraria =
        queryClient.getQueryData<string>(ZONA_HORARIA_QUERY_KEY) ?? getZonaDelTelefono();
      dispatch({ tipo: 'reabrir', hoy: getHoy(new Date(), zonaHoraria) });
    }, REVISAR_VUELTA_MS);
    return () => clearInterval(revisar);
  }, [sinPresupuesto, queryClient, dispatch]);

  const vuelta =
    sinPresupuesto && conversacion.vuelta !== null ? formatVuelta(conversacion.vuelta) : null;

  return { conversacion, vuelta, enviar, reintentar, nueva, confirmar, editar, reportar };
}
