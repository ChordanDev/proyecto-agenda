import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/shared/theme';

// The round button of the header in the approved mockups (03-elegir-iglesia.html,
// line 20), above the minimum touch target of the theme (44).
const SIZE = 46;
const ICON_SIZE = 22;
const ICON_STROKE_WIDTH = 2.4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The chevron goes back; the cross leaves a form without saving it
// (06-crear-evento.html, line 21).
const ICONS = {
  back: { path: 'M15 5l-7 7 7 7', label: 'Volver' },
  close: { path: 'M6 6l12 12M18 6L6 18', label: 'Cancelar' },
};

type BackButtonProps = {
  onPress: () => void;
  /** `close` is the cross of a form. */
  icon?: keyof typeof ICONS;
};

/** The round white button that leaves a screen, at the left of its header. */
export function BackButton({ onPress, icon = 'back' }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ICONS[icon].label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path
          d={ICONS[icon].path}
          stroke={colors.azulOscuro}
          strokeWidth={ICON_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZE / 2,
    backgroundColor: colors.superficie,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
