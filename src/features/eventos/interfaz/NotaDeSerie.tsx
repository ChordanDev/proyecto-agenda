import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { colors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

// The note of a date of a series with changes of its own (05-detalle-evento.html,
// line 44) and the legend of the form of a single date (06-crear-evento.html,
// line 30): the same box.
const NOTE_GAP = 12;
const NOTE_PADDING_VERTICAL = 14;
const NOTE_PADDING_HORIZONTAL = 16;
const NOTE_RADIUS = 16;
const NOTE_SIZE = 16;
const NOTE_LINE_HEIGHT = 1.4;
const ICON_SIZE = 22;
const ICON_STROKE_WIDTH = 2.2;
const ICON_MARGIN_TOP = 1;

/** A note about a single date of a series, with an "i" before it. */
export function NotaDeSerie({
  role,
  children,
}: {
  /** `alert` for a legend that must be heard when the form opens. */
  role: 'text' | 'alert';
  children: ReactNode;
}) {
  return (
    <View accessible accessibilityRole={role} style={styles.note}>
      <Svg
        width={ICON_SIZE}
        height={ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.azulOscuro}
        strokeWidth={ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={styles.icon}
      >
        <Circle cx={12} cy={12} r={9} />
        <Path d="M12 11v5M12 7.5v.5" />
      </Svg>
      <AppText color="azulOscuro" style={styles.text}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: NOTE_GAP,
    paddingVertical: NOTE_PADDING_VERTICAL,
    paddingHorizontal: NOTE_PADDING_HORIZONTAL,
    borderRadius: NOTE_RADIUS,
    backgroundColor: colors.azulSuave,
  },
  icon: {
    marginTop: ICON_MARGIN_TOP,
  },
  text: {
    flex: 1,
    fontSize: NOTE_SIZE,
    lineHeight: NOTE_SIZE * NOTE_LINE_HEIGHT,
  },
});
