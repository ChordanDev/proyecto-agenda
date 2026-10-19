import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useSesion } from '@/features/sesion/datos/useSesion';
import { colors, radius } from '@/shared/theme';
import { AppText, Button, ConfirmDialog, DialogText } from '@/shared/ui';

import { useAceptarConsentimiento, useConsentimiento } from '../datos/useConsentimiento';
import { useConversacion } from '../datos/useConversacion';
import { hasMensajes } from '../dominio/conversacion';
import { getChatEstado } from '../dominio/getChatEstado';
import { AvisoOpenAI } from './AvisoOpenAI';
import { ChatNoAceptado } from './ChatNoAceptado';
import { Conversacion } from './Conversacion';
import { ChatSinPresupuesto } from './EstadoDeFalla';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const HEADER_PADDING_TOP = 22; // line 20
const HEADER_PADDING_RIGHT = 16;
const HEADER_PADDING_LEFT = 20;
const HEADER_GAP = 10;
const HEADER_TEXTS_GAP = 1; // line 21
const NUEVA_HEIGHT = 44; // line 27
const NUEVA_PADDING_VERTICAL = 4;
const NUEVA_PADDING_HORIZONTAL = 14;
const NUEVA_GAP = 6;
const NUEVA_ICON_SIZE = 18;
const NUEVA_TEXT_SIZE = 15;
const NUEVA_LINE_HEIGHT = 1.15;
// The text of the states the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;
const ERROR_PADDING_HORIZONTAL = 20;
const ERROR_GAP = 14;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

const FORMULARIO = '/evento/nuevo';

/** "Nueva conversación", at the right of the header once there are mensajes. */
function NuevaConversacionButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Nueva conversación"
      onPress={onPress}
      style={({ pressed }) => [styles.nueva, pressed && styles.pressed]}
    >
      <Svg
        width={NUEVA_ICON_SIZE}
        height={NUEVA_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.azulOscuro}
        strokeWidth={2.8}
        strokeLinecap="round"
      >
        <Path d="M12 5v14M5 12h14" />
      </Svg>
      <AppText weight="bold" color="azulOscuro" style={styles.nuevaLabel}>
        {'Nueva\nconversación'}
      </AppText>
    </Pressable>
  );
}

/**
 * The Chat tab, only with a session. The first time it asks to accept the
 * aviso of OpenAI; turned down, the aviso shows again each time the tab opens.
 * Accepted, it holds the conversacion, which lives in memory only.
 */
export function ChatScreen() {
  const router = useRouter();
  const hasSesion = useSesion();
  const { consentimiento, retry } = useConsentimiento();
  const aceptar = useAceptarConsentimiento();
  const [avisoRechazado, setAvisoRechazado] = useState(false);
  const { conversacion, vuelta, enviar, reintentar, nueva, confirmar, editar } = useConversacion();
  const [confirmandoNueva, setConfirmandoNueva] = useState(false);

  // Opening the tab again asks again.
  useFocusEffect(
    useCallback(() => {
      setAvisoRechazado(false);
    }, []),
  );

  // Reaching /chat without a session, by a link or after signing out.
  if (hasSesion === false) {
    return <Redirect href="/calendario" />;
  }

  const estado = getChatEstado({ consentimiento, avisoRechazado });
  const irAlFormulario = () => router.push(FORMULARIO);
  // The form loaded with the propuesta; saving it there leaves the card saved.
  const editarPropuesta = (id: string) => {
    const precargado = editar(id);
    if (precargado !== null) {
      router.push({ pathname: FORMULARIO, params: { precargado } });
    }
  };
  // A propuesta saved is the evento of its id.
  const verEvento = (id: string) => router.push({ pathname: '/evento/[id]', params: { id } });

  const rechazar = () => {
    aceptar.reset();
    setAvisoRechazado(true);
  };

  return (
    <SafeAreaView edges={SAFE_AREA_EDGES} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTexts}>
          <AppText variant="tituloEncabezado" accessibilityRole="header">
            Asistente
          </AppText>
          <AppText variant="subtitulo">Preguntá o pedí que cargue un evento</AppText>
        </View>
        {estado === 'conversacion' && vuelta === null && hasMensajes(conversacion) && (
          <NuevaConversacionButton onPress={() => setConfirmandoNueva(true)} />
        )}
      </View>

      {estado === 'conversacion' &&
        (vuelta === null ? (
          <Conversacion
            conversacion={conversacion}
            enviar={enviar}
            reintentar={reintentar}
            confirmar={confirmar}
            onIrAlFormulario={irAlFormulario}
            onEditar={editarPropuesta}
            onVerEvento={verEvento}
          />
        ) : (
          <ChatSinPresupuesto vuelta={vuelta} onIrAlFormulario={irAlFormulario} />
        ))}

      {estado === 'no-aceptado' && (
        <ChatNoAceptado
          onCrearEvento={irAlFormulario}
          onReleerAviso={() => setAvisoRechazado(false)}
        />
      )}

      {estado === 'error' && (
        <View style={styles.error}>
          <AppText style={styles.paragraph}>
            No se pudo abrir el chat. Revisá tu conexión e intentá de nuevo.
          </AppText>
          <Button label="Reintentar" onPress={retry} />
        </View>
      )}

      {estado === 'aviso' && (
        <AvisoOpenAI
          saving={aceptar.isPending}
          saveFailed={aceptar.isError}
          onAceptar={() => aceptar.mutate()}
          onRechazar={rechazar}
        />
      )}

      {confirmandoNueva && (
        <ConfirmDialog
          title="¿Empezar una conversación nueva?"
          confirmLabel="Empezar de nuevo"
          tone="primary"
          busy={false}
          onConfirm={() => {
            nueva();
            setConfirmandoNueva(false);
          }}
          onCancel={() => setConfirmandoNueva(false)}
        >
          <DialogText>
            La conversación de ahora se borra. Los eventos que confirmaste ya están guardados.
          </DialogText>
        </ConfirmDialog>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.fondoClaro,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingRight: HEADER_PADDING_RIGHT,
    paddingLeft: HEADER_PADDING_LEFT,
  },
  headerTexts: {
    flexShrink: 1,
    gap: HEADER_TEXTS_GAP,
  },
  nueva: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: NUEVA_GAP,
    marginLeft: 'auto',
    minHeight: NUEVA_HEIGHT,
    paddingVertical: NUEVA_PADDING_VERTICAL,
    paddingHorizontal: NUEVA_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
    backgroundColor: colors.superficie,
  },
  nuevaLabel: {
    fontSize: NUEVA_TEXT_SIZE,
    lineHeight: NUEVA_TEXT_SIZE * NUEVA_LINE_HEIGHT,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    gap: ERROR_GAP,
    paddingHorizontal: ERROR_PADDING_HORIZONTAL,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
    textAlign: 'center',
  },
});
