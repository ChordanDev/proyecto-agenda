import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { formatMonthTitle } from '@/features/calendario/dominio/calendarioTexts';
import {
  getMonthOf,
  getNextMonth,
  getPreviousMonth,
} from '@/features/calendario/dominio/monthNavigation';
import { MonthGrid } from '@/features/calendario/interfaz/MonthGrid';
import { useToday } from '@/features/calendario/interfaz/useToday';
import { colors, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { HojaInferior } from './HojaInferior';

// The month row of the calendar (04a-calendario.html, lines 30-37), inside the sheet.
const MONTH_ROW_MARGIN_BOTTOM = 8;
const MONTH_BUTTONS_GAP = 8;
const MONTH_BUTTON_SIZE = 46;
const CHEVRON_SIZE = 22;
const CHEVRON_STROKE_WIDTH = 2.4;
const CHEVRON_PATHS = { previous: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7' };
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type HojaDeFechaProps = {
  visible: boolean;
  title: string;
  /** Local date, `YYYY-MM-DD`; null when none is chosen yet. */
  selected: string | null;
  onSelect: (fecha: string) => void;
  onClose: () => void;
};

/**
 * Chooses a fecha on the same month grid as the calendario: tapping a day picks
 * it and closes the sheet. It opens on the month of the fecha chosen, or today.
 */
export function HojaDeFecha({ visible, title, selected, onSelect, onClose }: HojaDeFechaProps) {
  const today = useToday();
  const [month, setMonth] = useState(() => getMonthOf(selected ?? today));
  // Opening the sheet again shows the month of the fecha chosen since.
  const [wasVisible, setWasVisible] = useState(visible);
  if (wasVisible !== visible) {
    setWasVisible(visible);
    if (visible) {
      setMonth(getMonthOf(selected ?? today));
    }
  }

  return (
    <HojaInferior visible={visible} title={title} onClose={onClose}>
      <View style={styles.monthRow}>
        <AppText variant="tituloEncabezado" color="texto">
          {formatMonthTitle(month)}
        </AppText>
        <View style={styles.monthButtons}>
          <MonthButton
            label="Mes anterior"
            direction="previous"
            onPress={() => setMonth(getPreviousMonth(month))}
          />
          <MonthButton
            label="Mes siguiente"
            direction="next"
            onPress={() => setMonth(getNextMonth(month))}
          />
        </View>
      </View>
      <MonthGrid
        month={month}
        today={today}
        // A day of another month is outside the grid: nothing is highlighted.
        selectedDate={selected ?? ''}
        fechas={[]}
        onSelectDate={onSelect}
      />
    </HojaInferior>
  );
}

type MonthButtonProps = {
  label: string;
  direction: keyof typeof CHEVRON_PATHS;
  onPress: () => void;
};

function MonthButton({ label, direction, onPress }: MonthButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
    >
      <Svg width={CHEVRON_SIZE} height={CHEVRON_SIZE} viewBox="0 0 24 24" fill="none">
        <Path
          d={CHEVRON_PATHS[direction]}
          stroke={colors.azulMarca}
          strokeWidth={CHEVRON_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: MONTH_ROW_MARGIN_BOTTOM,
  },
  monthButtons: {
    flexDirection: 'row',
    gap: MONTH_BUTTONS_GAP,
  },
  monthButton: {
    width: MONTH_BUTTON_SIZE,
    height: MONTH_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pastilla,
    backgroundColor: colors.campo,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
