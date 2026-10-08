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

type BackButtonProps = {
  onPress: () => void;
};

/** The round white button with a chevron that leaves a screen, at the left of its header. */
export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path
          d="M15 5l-7 7 7 7"
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
