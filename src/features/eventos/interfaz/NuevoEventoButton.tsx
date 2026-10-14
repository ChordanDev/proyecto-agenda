import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { avisarSinConexion } from './avisarSinConexion';

// The floating button of the approved mockup (04a-calendario.html, line 138).
// It floats over the bottom right corner of the calendar, above the bottom
// navigation, which is outside this screen.
const OFFSET = 16;
const HEIGHT = 56;
const PADDING_LEFT = 18;
const PADDING_RIGHT = 22;
const GAP = 8;
const ICON_SIZE = 22; // line 139
const ICON_STROKE_WIDTH = 2.6;
const SHADOW_OPACITY = 0.35;
const SHADOW_RADIUS = 9;
const SHADOW_OFFSET_Y = 6;
const ELEVATION = 6;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/** Space the calendar leaves under its content, so the button never covers an evento. */
export const NUEVO_EVENTO_BUTTON_SPACE = HEIGHT + OFFSET;

/** "Nuevo evento": opens the form with the day selected in the calendar. */
export function NuevoEventoButton({ fecha }: { fecha: string }) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (avisarSinConexion()) {
          router.push({ pathname: '/evento/nuevo', params: { fecha } });
        }
      }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 5v14M5 12h14"
          stroke={colors.textoSobreOscuro}
          strokeWidth={ICON_STROKE_WIDTH}
          strokeLinecap="round"
        />
      </Svg>
      <AppText weight="bold" color="textoSobreOscuro">
        Nuevo evento
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: OFFSET,
    bottom: OFFSET,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
    height: HEIGHT,
    paddingLeft: PADDING_LEFT,
    paddingRight: PADDING_RIGHT,
    borderRadius: radius.pastilla,
    backgroundColor: colors.azulMarca,
    shadowColor: colors.azulMarca,
    shadowOpacity: SHADOW_OPACITY,
    shadowRadius: SHADOW_RADIUS,
    shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
    elevation: ELEVATION,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
