import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { accesibilidad, colors, radius, spacing } from '@/shared/theme';

import { AppText } from './AppText';

// Height of the secondary button in the approved mockups (07-chat-ia.html, line 75),
// above the minimum touch target of the theme (44).
const SECONDARY_HEIGHT = 52;
// The two buttons of the welcome screen (01-bienvenida.html, lines 41-42): its
// main button is a step larger than in the rest of the app, and its second
// button has no background.
const LARGE_HEIGHT = 60;
const LARGE_LABEL_SIZE = 19;
const TEXT_HEIGHT = 56;
// The mockups draw no pressed or disabled state; these two are the only values
// of the button that do not come from them.
const PRESSED_OPACITY = 0.85;
const DISABLED_OPACITY = 0.5;

type ButtonVariant = 'primary' | 'secondary' | 'text';

const labels = {
  primary: { variant: 'cuerpoGrande', weight: 'bold', color: 'textoSobreOscuro' },
  secondary: { variant: 'cuerpo', weight: 'bold', color: 'azulOscuro' },
  text: { variant: 'cuerpoGrande', weight: 'semibold', color: 'azulOscuro' },
} as const;

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /** `text` has no background: the quiet second option of a screen. */
  variant?: ButtonVariant;
  /** `large` is the size of the main button of the welcome screen. */
  size?: 'regular' | 'large';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'regular',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const large = size === 'large';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        large && styles.large,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <AppText {...labels[variant]} style={[styles.label, large && styles.largeLabel]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: radius.boton,
  },
  primary: {
    minHeight: accesibilidad.alturaBotonPrincipal,
    backgroundColor: colors.azulOscuro,
  },
  secondary: {
    minHeight: SECONDARY_HEIGHT,
    backgroundColor: colors.azulSuave,
  },
  text: {
    minHeight: TEXT_HEIGHT,
  },
  large: {
    minHeight: LARGE_HEIGHT,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  label: {
    textAlign: 'center',
  },
  largeLabel: {
    fontSize: LARGE_LABEL_SIZE,
  },
});
