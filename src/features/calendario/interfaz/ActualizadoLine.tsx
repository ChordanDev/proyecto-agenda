import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { formatActualizado } from '../dominio/calendarioTexts';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/04a-calendario.html.
const LINE_MIN_HEIGHT = 48; // line 66
const LINE_PADDING_VERTICAL = 8;
const LINE_PADDING_HORIZONTAL = 14;
const LINE_RADIUS = 14;
const LINE_GAP = 10;
const ICON_SIZE = 22; // line 67
const ICON_STROKE_WIDTH = 2.2;
const ICON_PATHS = [
  'M2 2l20 20',
  'M5.8 5.8A5.5 5.5 0 0 0 6.5 17H17',
  'M9.6 4.6A6 6 0 0 1 17.6 9 4 4 0 0 1 20.7 15.6',
];
const TEXT_SIZE = 15; // line 68
const TEXT_LINE_HEIGHT = 1.35;

type ActualizadoLineProps = {
  /** When the calendario on screen was downloaded, as a timestamp. */
  updatedAt: number;
  now: Date;
};

/**
 * Shown only without connection: the calendario on screen is the last one
 * downloaded, and this tells when that was.
 */
export function ActualizadoLine({ updatedAt, now }: ActualizadoLineProps) {
  return (
    <View accessibilityLiveRegion="polite" style={styles.line}>
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
        {ICON_PATHS.map((d) => (
          <Path
            key={d}
            d={d}
            stroke={colors.azulOscuro}
            strokeWidth={ICON_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
      <AppText style={styles.text}>
        <AppText weight="bold" color="azulOscuro" style={styles.text}>
          Sin conexión.
        </AppText>{' '}
        {formatActualizado(new Date(updatedAt), now)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LINE_GAP,
    minHeight: LINE_MIN_HEIGHT,
    paddingVertical: LINE_PADDING_VERTICAL,
    paddingHorizontal: LINE_PADDING_HORIZONTAL,
    borderRadius: LINE_RADIUS,
    backgroundColor: colors.superficie,
  },
  text: {
    flexShrink: 1,
    fontSize: TEXT_SIZE,
    lineHeight: TEXT_SIZE * TEXT_LINE_HEIGHT,
  },
});
