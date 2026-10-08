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
// The mockups draw no pressed or disabled state; these two are the only values
// of the button that do not come from them.
const PRESSED_OPACITY = 0.85;
const DISABLED_OPACITY = 0.5;

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary';
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      <AppText
        variant={primary ? 'cuerpoGrande' : 'cuerpo'}
        weight="bold"
        color={primary ? 'textoSobreOscuro' : 'azulOscuro'}
        style={styles.label}
      >
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
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  label: {
    textAlign: 'center',
  },
});
