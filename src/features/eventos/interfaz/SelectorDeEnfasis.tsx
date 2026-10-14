import { Pressable, StyleSheet, View } from 'react-native';

import { categorias, colors, radius, spacing } from '@/shared/theme';
import { AppText, FormaDeEnfasis } from '@/shared/ui';

import { CATEGORIAS, type Categoria } from '../dominio/categoria';
import { RadioMark } from './RadioMark';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/06-crear-evento.html.
const CARD_PADDING_TOP = 16; // line 75
const CARD_PADDING_BOTTOM = 4;
const TITLE_MARGIN_BOTTOM = 4; // line 76
const ROW_MIN_HEIGHT = 60; // line 78
const ROW_PADDING_VERTICAL = 8;
const ROW_GAP = 14;
const SHAPE_BOX_SIZE = 26; // line 79
const SHAPE_SIZE = 20; // lines 80-84
const TEXTS_GAP = 1; // line 86
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;
const ERROR_MARGIN_BOTTOM = 8;

type SelectorDeEnfasisProps = {
  /** Null until one is chosen: none comes chosen. */
  selected: Categoria | null;
  onChange: (categoria: Categoria) => void;
  error: string | undefined;
};

/** The five options of enfasis, the four enfasis and the actividad regular, each with its shape. */
export function SelectorDeEnfasis({ selected, onChange, error }: SelectorDeEnfasisProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Énfasis" style={styles.card}>
      <AppText variant="label" style={styles.title}>
        Énfasis
      </AppText>
      {error !== undefined && (
        <AppText variant="chico" color="peligro" style={styles.error}>
          {error}
        </AppText>
      )}
      {CATEGORIAS.map((categoria) => {
        const { lema, nombre } = categorias[categoria];
        const checked = categoria === selected;

        return (
          <Pressable
            key={categoria}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            accessibilityLabel={`${lema}, ${nombre}`}
            onPress={() => onChange(categoria)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.shapeBox}>
              <FormaDeEnfasis categoria={categoria} size={SHAPE_SIZE} />
            </View>
            <View style={styles.texts}>
              <AppText weight="bold">{lema}</AppText>
              <AppText variant="chico">{nombre}</AppText>
            </View>
            <RadioMark checked={checked} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: CARD_PADDING_TOP,
    paddingHorizontal: spacing.tarjetaPadding,
    paddingBottom: CARD_PADDING_BOTTOM,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  title: {
    marginBottom: TITLE_MARGIN_BOTTOM,
  },
  error: {
    marginBottom: ERROR_MARGIN_BOTTOM,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  shapeBox: {
    width: SHAPE_BOX_SIZE,
    height: SHAPE_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: TEXTS_GAP,
  },
});
