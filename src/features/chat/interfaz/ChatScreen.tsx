import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSesion } from '@/features/sesion/datos/useSesion';
import { colors } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';

import { useAceptarConsentimiento, useConsentimiento } from '../datos/useConsentimiento';
import { getChatEstado } from '../dominio/getChatEstado';
import { AvisoOpenAI } from './AvisoOpenAI';
import { ChatNoAceptado } from './ChatNoAceptado';
import { Conversacion } from './Conversacion';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const HEADER_PADDING_TOP = 22; // line 20
const HEADER_PADDING_RIGHT = 16;
const HEADER_PADDING_LEFT = 20;
const HEADER_TEXTS_GAP = 1; // line 21
// The text of the states the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;
const ERROR_PADDING_HORIZONTAL = 20;
const ERROR_GAP = 14;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

/**
 * The Chat tab, only with a session. The first time it asks to accept the
 * aviso of OpenAI; turned down, the aviso shows again each time the tab opens.
 */
export function ChatScreen() {
  const router = useRouter();
  const hasSesion = useSesion();
  const { consentimiento, retry } = useConsentimiento();
  const aceptar = useAceptarConsentimiento();
  const [avisoRechazado, setAvisoRechazado] = useState(false);

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

  const rechazar = () => {
    aceptar.reset();
    setAvisoRechazado(true);
  };

  return (
    <SafeAreaView edges={SAFE_AREA_EDGES} style={styles.screen}>
      <View style={styles.header}>
        <AppText variant="tituloEncabezado" accessibilityRole="header">
          Asistente
        </AppText>
        <AppText variant="subtitulo">Preguntá o pedí que cargue un evento</AppText>
      </View>

      {estado === 'conversacion' && <Conversacion />}

      {estado === 'no-aceptado' && (
        <ChatNoAceptado
          onCrearEvento={() => router.push('/evento/nuevo')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.fondoClaro,
  },
  header: {
    gap: HEADER_TEXTS_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingRight: HEADER_PADDING_RIGHT,
    paddingLeft: HEADER_PADDING_LEFT,
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
