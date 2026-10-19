import { useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { useOnlineStatus } from '@/shared/useOnlineStatus';

import type { ConversacionEnCurso } from '../datos/useConversacion';
import { puedeEnviar } from '../dominio/conversacion';
import { CuadroDeTexto } from './CuadroDeTexto';
import { AvisoDeLimite, AvisoSinConexion } from './EstadoDeFalla';
import { Buscando, MensajeDeChat } from './MensajeDeChat';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const LIST_PADDING_TOP = 26; // line 56
const LIST_PADDING_HORIZONTAL = 16;
const LIST_PADDING_BOTTOM = 18;
const LIST_GAP = 14;

type ConversacionProps = Omit<ConversacionEnCurso, 'vuelta' | 'nueva' | 'editar'> & {
  onIrAlFormulario: () => void;
  onEditar: (id: string) => void;
  onVerEvento: (id: string) => void;
};

/**
 * The conversacion with the asistente, behind the consentimiento: the
 * mensajes, and below them the cuadro de texto or, at the limite diario, its
 * aviso.
 */
export function Conversacion({
  conversacion,
  enviar,
  reintentar,
  confirmar,
  onIrAlFormulario,
  onEditar,
  onVerEvento,
}: ConversacionProps) {
  const isOnline = useOnlineStatus();
  const list = useRef<ScrollView>(null);
  const ultimo = conversacion.mensajes.at(-1);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={list}
        style={styles.container}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // The last mensaje is the one to read.
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
      >
        {!isOnline && <AvisoSinConexion />}
        {conversacion.mensajes.map((mensaje) => (
          <MensajeDeChat
            key={mensaje.id}
            mensaje={mensaje}
            onReintentar={mensaje === ultimo ? reintentar : null}
            onIrAlFormulario={onIrAlFormulario}
            onConfirmar={confirmar}
            onEditar={onEditar}
            onVerEvento={onVerEvento}
          />
        ))}
        {conversacion.enviando && <Buscando />}
      </ScrollView>

      {conversacion.bloqueo === 'limite-diario' ? (
        <AvisoDeLimite onIrAlFormulario={onIrAlFormulario} />
      ) : (
        <CuadroDeTexto
          puedeEnviar={(texto) => isOnline && puedeEnviar(conversacion, texto)}
          onEnviar={enviar}
          aviso={conversacion.aviso}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    gap: LIST_GAP,
    paddingTop: LIST_PADDING_TOP,
    paddingHorizontal: LIST_PADDING_HORIZONTAL,
    paddingBottom: LIST_PADDING_BOTTOM,
  },
});
