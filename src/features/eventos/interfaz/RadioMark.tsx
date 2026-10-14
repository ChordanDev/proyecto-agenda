import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/shared/theme';

// The round mark of a choice in the approved mockup (06-crear-evento.html,
// lines 91-94).
const SIZE = 26;
const BORDER_WIDTH = 2;
const CHECK_SIZE = 15;
const CHECK_STROKE_WIDTH = 3.2;

/** The circle of a single choice: filled with a check when chosen, empty otherwise. */
export function RadioMark({ checked }: { checked: boolean }) {
  return checked ? (
    <View style={[styles.mark, styles.checked]}>
      <Svg width={CHECK_SIZE} height={CHECK_SIZE} viewBox="0 0 24 24" fill="none">
        <Path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke={colors.textoSobreOscuro}
          strokeWidth={CHECK_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  ) : (
    <View style={[styles.mark, styles.unchecked]} />
  );
}

const styles = StyleSheet.create({
  mark: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pastilla,
  },
  checked: {
    backgroundColor: colors.azulMarca,
  },
  unchecked: {
    borderWidth: BORDER_WIDTH,
    borderColor: colors.radioInactivo,
  },
});
