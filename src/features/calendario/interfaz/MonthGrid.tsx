import { Pressable, StyleSheet, View } from 'react-native';

import type { Categoria } from '@/features/eventos/dominio/categoria';
import { colors, radius } from '@/shared/theme';
import { AppText, FormaDeEnfasis } from '@/shared/ui';

import type { FechaDeEvento } from '../dominio/armarCalendario';
import { formatDayHeading, formatEventosCount } from '../dominio/calendarioTexts';
import { getDayMarkers, getEventosOfDay } from '../dominio/dayOfCalendario';
import { getMonthGrid, type DayCell } from '../dominio/getMonthGrid';
import type { Month } from '../dominio/getMonthRange';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/04a-calendario.html.
const CARD_PADDING_TOP = 14; // line 64
const CARD_PADDING_HORIZONTAL = 8;
const CARD_PADDING_BOTTOM = 10;
const WEEKDAYS_PADDING_BOTTOM = 6; // line 65
const WEEKS_GAP = 2; // line 74
const DAY_GAP = 3; // line 78
const DAY_MIN_HEIGHT = 56;
const DAY_PADDING_VERTICAL = 4;
const NUMBER_SIZE = 38; // line 79
const TODAY_BORDER_WIDTH = 2; // line 80
const MARKERS_GAP = 3; // line 82
const MARKERS_HEIGHT = 10;
const MARKER_SIZE = 8; // lines 84-88

// From Sunday to Saturday (lines 66-72).
const WEEKDAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const SATURDAY = 6;

type MonthGridProps = {
  month: Month;
  /** Local dates, `YYYY-MM-DD`. */
  today: string;
  selectedDate: string;
  /** The dates of the eventos of the month, or undefined until they are read. */
  fechas: readonly FechaDeEvento[] | undefined;
  onSelectDate: (date: string) => void;
};

/**
 * The white card with the days of a month. The days do not depend on the
 * eventos: they are there from the start, and the markers show up once the
 * eventos are read.
 */
export function MonthGrid({ month, today, selectedDate, fechas, onSelectDate }: MonthGridProps) {
  return (
    <View style={styles.card}>
      {/* Each day says its weekday, so the letters add nothing to a screen reader. */}
      <View
        style={styles.week}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {WEEKDAY_LETTERS.map((letter, weekday) => (
          <AppText
            key={weekday}
            variant="chico"
            weight={weekday === SATURDAY ? 'bold' : 'semibold'}
            color={weekday === SATURDAY ? 'azulMarca' : 'textoTenue'}
            style={styles.weekdayLetter}
          >
            {letter}
          </AppText>
        ))}
      </View>

      <View style={styles.weeks}>
        {getMonthGrid(month).map((week, weekIndex) => (
          <View key={weekIndex} style={styles.week}>
            {week.map((cell, weekday) =>
              cell === null ? (
                <View key={weekday} style={styles.cell} />
              ) : (
                <Day
                  key={weekday}
                  cell={cell}
                  selected={cell.date === selectedDate}
                  isToday={cell.date === today}
                  markers={fechas ? getDayMarkers(fechas, cell.date) : []}
                  eventosCount={fechas && getEventosOfDay(fechas, cell.date).length}
                  onPress={() => onSelectDate(cell.date)}
                />
              ),
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

type DayProps = {
  cell: DayCell;
  selected: boolean;
  isToday: boolean;
  markers: Categoria[];
  /** Undefined until the eventos are read. */
  eventosCount: number | undefined;
  onPress: () => void;
};

function Day({ cell, selected, isToday, markers, eventosCount, onPress }: DayProps) {
  // Today is ringed only while another day is the selected one (line 240).
  const ringed = isToday && !selected;
  const heading = formatDayHeading(cell.date);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={
        eventosCount === undefined ? heading : `${heading}, ${formatEventosCount(eventosCount)}`
      }
      onPress={onPress}
      style={[styles.cell, styles.day]}
    >
      {/* The key draws the number again whenever its look changes: on Android
          a view that gets its background after being drawn without one loses
          its radius, and the selected day came out as a square. */}
      <View
        key={selected ? 'selected' : ringed ? 'today' : 'plain'}
        style={[styles.number, selected && styles.numberSelected, ringed && styles.numberToday]}
      >
        <AppText
          weight={selected || ringed ? 'bold' : 'regular'}
          color={selected ? 'textoSobreOscuro' : ringed ? 'azulMarca' : 'texto'}
        >
          {cell.day}
        </AppText>
      </View>
      {/* The label of the day already counts its eventos. */}
      <View
        style={styles.markers}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {markers.map((categoria) => (
          <FormaDeEnfasis key={categoria} categoria={categoria} size={MARKER_SIZE} />
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingTop: CARD_PADDING_TOP,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    paddingBottom: CARD_PADDING_BOTTOM,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  weekdayLetter: {
    flex: 1,
    paddingBottom: WEEKDAYS_PADDING_BOTTOM,
    textAlign: 'center',
  },
  weeks: {
    gap: WEEKS_GAP,
  },
  week: {
    flexDirection: 'row',
  },
  // Seven to a week, all of the same width.
  cell: {
    flex: 1,
  },
  day: {
    alignItems: 'center',
    gap: DAY_GAP,
    minHeight: DAY_MIN_HEIGHT,
    paddingVertical: DAY_PADDING_VERTICAL,
  },
  number: {
    width: NUMBER_SIZE,
    height: NUMBER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: NUMBER_SIZE / 2,
  },
  numberSelected: {
    backgroundColor: colors.azulMarca,
  },
  numberToday: {
    borderWidth: TODAY_BORDER_WIDTH,
    borderColor: colors.azulMarca,
  },
  markers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MARKERS_GAP,
    height: MARKERS_HEIGHT,
  },
});
