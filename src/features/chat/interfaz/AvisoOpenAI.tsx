import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fontSize, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const OVERLAY_COLOR = 'rgba(16,35,58,0.55)'; // line 207
const OVERLAY_PADDING_HORIZONTAL = 20;
const DIALOG_RADIUS = 22; // line 208
const DIALOG_PADDING_TOP = 24;
const DIALOG_PADDING_HORIZONTAL = 20;
const DIALOG_PADDING_BOTTOM = 20;
const DIALOG_GAP = 12;
const TITLE_SIZE = 21; // line 209
const TEXT_SIZE = 16; // line 210
const TEXT_LINE_HEIGHT = 1.45;
const TEXT_COLOR = '#333333';
const BUTTON_HEIGHT = 54; // line 212
const BUTTONS_MARGIN_TOP = 8;
// The mockups draw no pressed or disabled state; the same values as `Button`.
const PRESSED_OPACITY = 0.85;
const DISABLED_OPACITY = 0.5;

type AvisoOpenAIProps = {
  /** While the consentimiento is being saved, both buttons are off. */
  saving: boolean;
  /** Set when saving the consentimiento failed. */
  saveFailed: boolean;
  onAceptar: () => void;
  onRechazar: () => void;
};

/**
 * The aviso of OpenAI, over the Chat tab and not over the bottom navigation:
 * the usuario can still leave for another tab without answering.
 */
export function AvisoOpenAI({ saving, saveFailed, onAceptar, onRechazar }: AvisoOpenAIProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
        <AppText weight="bold" accessibilityRole="header" style={styles.title}>
          Antes de usar el asistente
        </AppText>
        <AppText style={styles.text}>
          Lo que escribas en el chat se envía a <AppText weight="bold">OpenAI</AppText>, la empresa
          que hace funcionar el asistente, para poder responderte.
        </AppText>
        <AppText style={styles.text}>
          OpenAI lo guarda hasta 30 días. La app no guarda tus conversaciones.
        </AppText>
        {saveFailed && (
          <AppText color="peligro" weight="semibold" accessibilityRole="alert" style={styles.text}>
            No se pudo guardar. Revisá tu conexión e intentá de nuevo.
          </AppText>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={onAceptar}
          style={({ pressed }) => [
            styles.button,
            styles.aceptar,
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}
        >
          <AppText weight="bold" color="textoSobreOscuro" style={styles.buttonLabel}>
            Acepto
          </AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={onRechazar}
          style={({ pressed }) => [
            styles.button,
            styles.rechazar,
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}
        >
          <AppText weight="bold" color="azulOscuro" style={styles.buttonLabel}>
            Ahora no
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    paddingHorizontal: OVERLAY_PADDING_HORIZONTAL,
    backgroundColor: OVERLAY_COLOR,
  },
  dialog: {
    gap: DIALOG_GAP,
    paddingTop: DIALOG_PADDING_TOP,
    paddingHorizontal: DIALOG_PADDING_HORIZONTAL,
    paddingBottom: DIALOG_PADDING_BOTTOM,
    borderRadius: DIALOG_RADIUS,
    backgroundColor: colors.superficie,
  },
  title: {
    fontSize: TITLE_SIZE,
  },
  text: {
    fontSize: TEXT_SIZE,
    lineHeight: TEXT_SIZE * TEXT_LINE_HEIGHT,
    color: TEXT_COLOR,
  },
  button: {
    minHeight: BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.boton,
  },
  aceptar: {
    marginTop: BUTTONS_MARGIN_TOP,
    backgroundColor: colors.azulOscuro,
  },
  rechazar: {
    backgroundColor: colors.azulSuave,
  },
  buttonLabel: {
    fontSize: fontSize.cuerpo,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
