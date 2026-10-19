/** What is known of the consentimiento of the usuario signed in. */
export type ConsentimientoLeido = 'leyendo' | 'error' | 'si' | 'no';

/**
 * What the Chat tab shows: the aviso of OpenAI the first time, the no aceptado
 * estado once the aviso was turned down, and the conversacion only after the
 * usuario accepted it. Apple requires accepting before the first message, so
 * nothing but `conversacion` lets the usuario write.
 */
export type ChatEstado = 'cargando' | 'error' | 'aviso' | 'no-aceptado' | 'conversacion';

export function getChatEstado({
  consentimiento,
  avisoRechazado,
}: {
  consentimiento: ConsentimientoLeido;
  /** Whether the usuario turned the aviso down since they opened the tab. */
  avisoRechazado: boolean;
}): ChatEstado {
  switch (consentimiento) {
    case 'leyendo':
      return 'cargando';
    case 'error':
      return 'error';
    case 'si':
      return 'conversacion';
    case 'no':
      return avisoRechazado ? 'no-aceptado' : 'aviso';
  }
}
