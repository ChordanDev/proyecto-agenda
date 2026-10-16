import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type TextProps } from 'react-native';

import { colors, fontSize, radius } from '@/shared/theme';

import { AppText } from './AppText';

// The confirmations of Ajustes (diseno/pantallas/10-ajustes.html, lines 112-137),
// which the theme has no tokens for.
const OVERLAY_COLOR = 'rgba(16,35,58,0.55)';
const OVERLAY_PADDING_HORIZONTAL = 20;
const DIALOG_RADIUS = 22;
const DIALOG_PADDING_TOP = 24;
const DIALOG_PADDING_HORIZONTAL = 20;
const DIALOG_PADDING_BOTTOM = 20;
const DIALOG_GAP = 12;
const DIALOG_TITLE_SIZE = 21;
const DIALOG_TEXT_SIZE = 16;
const DIALOG_TEXT_LINE_HEIGHT = 1.45;
const DIALOG_TEXT_COLOR = '#333333';
const DIALOG_BUTTON_HEIGHT = 54;
const DIALOG_BUTTONS_MARGIN_TOP = 8;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type ConfirmDialogProps = {
  title: string;
  /** The texts between the title and the buttons, as `DialogText`. */
  children?: ReactNode;
  confirmLabel: string;
  /** The button that leaves without doing it. */
  cancelLabel?: string;
  /** `danger` for what cannot be undone, such as deleting the usuario. */
  tone: 'primary' | 'danger';
  /** While the action runs there is nothing left to cancel: both buttons are off. */
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Asks before an action, with the design of the app instead of the system dialog. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancel = () => {
    if (!busy) {
      onCancel();
    }
  };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={cancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <AppText weight="bold" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {children}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.button,
              styles.confirmButton,
              tone === 'danger' ? styles.danger : styles.primary,
              pressed && styles.pressed,
            ]}
          >
            <AppText weight="bold" color="textoSobreOscuro" style={styles.buttonLabel}>
              {confirmLabel}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={cancel}
            style={({ pressed }) => [styles.button, styles.cancelButton, pressed && styles.pressed]}
          >
            <AppText weight="bold" color="azulOscuro" style={styles.buttonLabel}>
              {cancelLabel}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type DialogTextProps = TextProps & {
  color?: 'peligro';
  weight?: 'semibold';
};

/** A paragraph of a `ConfirmDialog`. */
export function DialogText({ color, style, ...rest }: DialogTextProps) {
  return (
    <AppText
      color={color}
      style={[styles.text, color === undefined && styles.textColor, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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
    fontSize: DIALOG_TITLE_SIZE,
  },
  text: {
    fontSize: DIALOG_TEXT_SIZE,
    lineHeight: DIALOG_TEXT_SIZE * DIALOG_TEXT_LINE_HEIGHT,
  },
  textColor: {
    color: DIALOG_TEXT_COLOR,
  },
  button: {
    minHeight: DIALOG_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.boton,
  },
  confirmButton: {
    marginTop: DIALOG_BUTTONS_MARGIN_TOP,
  },
  primary: {
    backgroundColor: colors.azulOscuro,
  },
  danger: {
    backgroundColor: colors.peligro,
  },
  cancelButton: {
    backgroundColor: colors.azulSuave,
  },
  buttonLabel: {
    fontSize: fontSize.cuerpo,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
