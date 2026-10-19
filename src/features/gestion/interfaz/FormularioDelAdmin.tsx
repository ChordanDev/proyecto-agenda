import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fontSize, radius, spacing } from '@/shared/theme';
import { AppText, BackButton, Button, Card, ScreenBackground } from '@/shared/ui';

// The frame of the forms of the admin: Nuevo and Editar distrito and iglesia.
// The values are those of diseno/pantallas/09b-iglesia.html, the same as the
// form of the encargado (08c-encargado.html).
const HEADER_PADDING_TOP = 22;
const HEADER_GAP = 12;
const CONTENT_PADDING_TOP = 30;
const CONTENT_PADDING_BOTTOM = 36;
const CONTENT_GAP = 14;
const NOTICE_GAP = 10;
const NOTICE_MIN_HEIGHT = 48;
const NOTICE_PADDING_VERTICAL = 8;
const NOTICE_PADDING_HORIZONTAL = 14;
const NOTICE_ICON_SIZE = 22;
const NOTICE_ICON_STROKE_WIDTH = 2.2;
const ERROR_BACKGROUND = '#FDE7EC';
const ERROR_COLOR = '#7A0B2B';
const ERROR_PADDING_VERTICAL = 12;
const ERROR_PADDING_HORIZONTAL = 14;
const FIELD_GAP = 4;
const PARAGRAPH_LINE_HEIGHT = 1.4;

const SAFE_AREA_EDGES = ['top', 'left', 'right', 'bottom'] as const;

/** Back to the previous screen, or to Gestión when there is none. */
export function useSalir() {
  const router = useRouter();

  return () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gestion');
    }
  };
}

/** A form of the admin: the close button and the titulo, over the content that scrolls. */
export function PantallaDeFormulario({
  titulo,
  onClose,
  children,
}: {
  titulo: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <BackButton icon="close" onPress={onClose} />
        <AppText variant="tituloEncabezado" accessibilityRole="header">
          {titulo}
        </AppText>
      </View>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          // Scrolling hides the keyboard, so the fields below it can be reached.
          keyboardDismissMode="on-drag"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

/** While the distritos and iglesias are read, or when what was opened is gone. */
export function EstadoDelFormulario({
  cargando,
  error,
  onRetry,
  onClose,
  ausente,
}: {
  cargando: boolean;
  error: boolean;
  onRetry: () => void;
  onClose: () => void;
  /** What to say when the distrito or iglesia no longer exists. */
  ausente: string;
}) {
  // States the mockup does not draw.
  if (error) {
    return (
      <Card style={styles.message}>
        <AppText color="textoSecundario">
          No se pudo preparar el formulario. Revisá la conexión y probá de nuevo.
        </AppText>
        <Button label="Reintentar" variant="secondary" onPress={onRetry} />
      </Card>
    );
  }

  if (cargando) {
    return (
      <Card>
        <AppText color="textoSecundario">Cargando…</AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.message}>
      <AppText color="textoSecundario">{ausente}</AppText>
      <Button label="Volver a Gestión" variant="secondary" onPress={onClose} />
    </Card>
  );
}

/** Saving needs a connection: without one, this says so above the form. */
export function AvisoSinConexion() {
  return (
    <View accessibilityRole="summary" style={styles.notice}>
      <Svg
        width={NOTICE_ICON_SIZE}
        height={NOTICE_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.azulOscuro}
        strokeWidth={NOTICE_ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M2 2l20 20" />
        <Path d="M5.8 5.8A5.5 5.5 0 0 0 6.5 17H17" />
        <Path d="M9.6 4.6A6 6 0 0 1 17.6 9 4 4 0 0 1 20.7 15.6" />
      </Svg>
      <AppText variant="secundario" style={styles.noticeText}>
        <AppText variant="secundario" weight="bold" color="azulOscuro">
          Sin conexión.
        </AppText>{' '}
        Para guardar hace falta internet.
      </AppText>
    </View>
  );
}

/** A save that failed: what was written stays, and the button tries again. */
export function ErrorAlGuardar() {
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <AppText variant="secundario" style={styles.errorText}>
        <AppText variant="secundario" weight="bold" style={styles.errorText}>
          No se pudo guardar.
        </AppText>{' '}
        Revisá la conexión y probá de nuevo.
      </AppText>
    </View>
  );
}

/** A field with what is wrong with it under it. */
export function Campo({ error, children }: { error: string | undefined; children: ReactNode }) {
  return (
    <View style={styles.field}>
      {children}
      {error !== undefined && (
        <AppText variant="chico" color="peligro">
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  fill: {
    flex: 1,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: NOTICE_GAP,
    minHeight: NOTICE_MIN_HEIGHT,
    paddingVertical: NOTICE_PADDING_VERTICAL,
    paddingHorizontal: NOTICE_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: colors.superficie,
  },
  noticeText: {
    flexShrink: 1,
    color: colors.texto,
  },
  error: {
    paddingVertical: ERROR_PADDING_VERTICAL,
    paddingHorizontal: ERROR_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: ERROR_BACKGROUND,
  },
  errorText: {
    color: ERROR_COLOR,
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  field: {
    gap: FIELD_GAP,
  },
});
