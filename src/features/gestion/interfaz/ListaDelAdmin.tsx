import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { accesibilidad, colors, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

// The pieces the screens of the gestion of the admin share. The line numbers
// are those of diseno/pantallas/09-gestion-admin.html.
const ADD_GAP = 8; // line 43
const ADD_ICON_SIZE = 20; // line 44
const ADD_ICON_STROKE_WIDTH = 2.6;
const ROW_GAP = 12; // line 65
const ROW_PADDING_VERTICAL = 14;
const ROW_PADDING_LEFT = 18;
const ROW_PADDING_RIGHT = 14;
const ROW_TEXTS_GAP = 4; // line 66
const ROW_TITLE_SIZE = 17; // line 67
const CHEVRON_SIZE = 20; // line 72
const CHEVRON_STROKE_WIDTH = 2.4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/** The dark button with a "+" that opens Nuevo distrito or Nueva iglesia. */
export function BotonAgregar({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.add, style, pressed && styles.pressed]}
    >
      <Svg
        width={ADD_ICON_SIZE}
        height={ADD_ICON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.textoSobreOscuro}
        strokeWidth={ADD_ICON_STROKE_WIDTH}
        strokeLinecap="round"
      >
        <Path d="M12 5v14M5 12h14" />
      </Svg>
      <AppText variant="cuerpoGrande" weight="bold" color="textoSobreOscuro">
        {label}
      </AppText>
    </Pressable>
  );
}

/** The white list with rounded corners that holds the rows. */
export function Lista({ children }: { children: ReactNode }) {
  return <View style={styles.list}>{children}</View>;
}

type FilaProps = {
  titulo: string;
  /** What goes under the titulo: texts, a label. */
  children?: ReactNode;
  ultima: boolean;
  accessibilityHint: string;
  onPress: () => void;
};

/** A row that opens its form, with a chevron at its right end. */
export function Fila({ titulo, children, ultima, accessibilityHint, onPress }: FilaProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, !ultima && styles.rowDivider, pressed && styles.pressed]}
    >
      <View style={styles.rowTexts}>
        <AppText weight="bold" style={styles.rowTitle}>
          {titulo}
        </AppText>
        {children}
      </View>
      <Svg
        width={CHEVRON_SIZE}
        height={CHEVRON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.textoTenue}
        strokeWidth={CHEVRON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={styles.chevron}
      >
        <Path d="M9 6l6 6-6 6" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ADD_GAP,
    minHeight: accesibilidad.alturaBotonPrincipal,
    borderRadius: radius.boton,
    backgroundColor: colors.azulOscuro,
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingLeft: ROW_PADDING_LEFT,
    paddingRight: ROW_PADDING_RIGHT,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  rowTexts: {
    flexShrink: 1,
    gap: ROW_TEXTS_GAP,
  },
  rowTitle: {
    fontSize: ROW_TITLE_SIZE,
  },
  chevron: {
    marginLeft: 'auto',
    flexShrink: 0,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
