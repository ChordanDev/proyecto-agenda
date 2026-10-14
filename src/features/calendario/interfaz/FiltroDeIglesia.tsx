import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { accesibilidad, colors, radius, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/04a-calendario.html.
const ROW_GAP = 8; // line 43
const CHIP_PADDING_HORIZONTAL = 16; // line 46
const CHIP_LABEL_SIZE = 15;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type FiltroDeIglesiaProps = {
  /** The iglesias the cargos cover, in the order to show them. */
  iglesias: readonly { id: string; nombre: string }[];
  /** Null is "Todas". */
  selected: string | null;
  onChange: (iglesiaId: string | null) => void;
};

/**
 * The row of chips under the month title that narrows the calendario to one of
 * the iglesias the cargos cover, or shows them all.
 */
export function FiltroDeIglesia({ iglesias, selected, onChange }: FiltroDeIglesiaProps) {
  const options = [{ id: null, nombre: 'Todas' }, ...iglesias];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      role="group"
      accessibilityLabel="Filtrar por iglesia"
      style={styles.row}
      contentContainerStyle={styles.rowContent}
    >
      {options.map((option) => (
        <Chip
          key={option.id ?? 'todas'}
          nombre={option.nombre}
          on={option.id === selected}
          onPress={() => onChange(option.id)}
        />
      ))}
    </ScrollView>
  );
}

type ChipProps = {
  nombre: string;
  on: boolean;
  onPress: () => void;
};

function Chip({ nombre, on, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
    >
      <AppText weight="semibold" color={on ? 'textoSobreOscuro' : 'texto'} style={styles.chipLabel}>
        {nombre}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The row reaches the edges of the screen, as in the mockup.
  row: {
    flexGrow: 0,
    marginHorizontal: -spacing.pantallaHorizontal,
  },
  rowContent: {
    gap: ROW_GAP,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  chip: {
    minHeight: accesibilidad.alturaMinTactil,
    justifyContent: 'center',
    paddingHorizontal: CHIP_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
    backgroundColor: colors.superficie,
  },
  chipOn: {
    backgroundColor: colors.azulMarca,
  },
  chipLabel: {
    fontSize: CHIP_LABEL_SIZE,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
