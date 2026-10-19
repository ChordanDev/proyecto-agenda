import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/shared/theme';

// The switch of 10-ajustes.html, lines 57-66.
const WIDTH = 62;
const HEIGHT = 36;
const KNOB_SIZE = 28;
const KNOB_INSET = 4;
const OFF_COLOR = '#C9D0D8';
const DISABLED_OPACITY = 0.5;

type InterruptorProps = {
  on: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
};

/** An on/off switch, drawn as the approved mockup. */
export function Interruptor({
  on,
  disabled = false,
  accessibilityLabel,
  onPress,
}: InterruptorProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: on, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.track, on ? styles.trackOn : styles.trackOff, disabled && styles.disabled]}
    >
      <View style={[styles.knob, on ? styles.knobOn : styles.knobOff]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: WIDTH,
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
  },
  trackOn: {
    backgroundColor: colors.azulMarca,
  },
  trackOff: {
    backgroundColor: OFF_COLOR,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  knob: {
    position: 'absolute',
    top: KNOB_INSET,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    backgroundColor: colors.superficie,
  },
  knobOn: {
    left: WIDTH - KNOB_SIZE - KNOB_INSET,
  },
  knobOff: {
    left: KNOB_INSET,
  },
});
