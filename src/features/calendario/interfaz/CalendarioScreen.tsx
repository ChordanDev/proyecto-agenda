import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, spacing } from '@/shared/theme';
import { AppText, Button, Card, Logo, ScreenBackground } from '@/shared/ui';

import { useCalendario, type FuenteDeCalendario } from '../datos/useCalendario';
import { useIglesiaDeCalendario } from '../datos/useIglesiaDeCalendario';
import { formatMonthTitle } from '../dominio/calendarioTexts';
import type { Month } from '../dominio/getMonthRange';
import {
  getMonthOf,
  getNextMonth,
  getPreviousMonth,
  getSelectedDate,
  getSelectedDateAfterTodayChange,
} from '../dominio/monthNavigation';
import { EventosOfDay } from './EventosOfDay';
import { MonthGrid } from './MonthGrid';
import { useToday } from './useToday';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/04a-calendario.html.
const HEADER_PADDING_TOP = 22; // line 18
const HEADER_PADDING_HORIZONTAL = 20;
const HEADER_GAP = 14;
const LOGO_BOX_SIZE = 52; // line 19
const HEADER_TEXTS_GAP = 1; // line 22
const CONTENT_PADDING_TOP = 26; // line 28
const CONTENT_PADDING_BOTTOM = 24;
const CONTENT_GAP = 16;
const MONTH_ROW_PADDING_HORIZONTAL = 4; // line 30
const MONTH_TITLE_SIZE = 26; // line 31
const MONTH_TITLE_LINE_HEIGHT = 1.1;
const MONTH_BUTTONS_GAP = 8; // line 32
const MONTH_BUTTON_SIZE = 46; // line 33
const CHEVRON_SIZE = 22; // line 34
const CHEVRON_STROKE_WIDTH = 2.4;
const CHEVRON_PATHS = { previous: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7' }; // lines 34 and 37
// The text of the state the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

/**
 * The calendario of the iglesia elegida (a hermano) or of everything the cargos
 * of the usuario cover, a month at a time: the grid with the markers of each
 * day and, under it, the eventos of the selected day.
 */
export function CalendarioScreen() {
  const router = useRouter();
  const origen = useIglesiaDeCalendario();
  const encabezado = origen.estado === 'listo' ? origen.encabezado : undefined;

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Logo />
        </View>
        {encabezado !== undefined && (
          <View style={styles.headerTexts}>
            <AppText variant="tituloEncabezado" accessibilityRole="header">
              {encabezado.titulo}
            </AppText>
            <AppText variant="subtitulo">{encabezado.subtitulo}</AppText>
          </View>
        )}
      </View>

      {origen.estado === 'listo' ? (
        <MonthOfCalendario fuente={origen.fuente} onRetry={origen.onRetry} />
      ) : (
        // States the mockup does not draw.
        <View style={styles.content}>
          <Card style={styles.message}>
            {origen.estado === 'sin-iglesia' && (
              <>
                <AppText color="textoSecundario" style={styles.paragraph}>
                  Elegí tu iglesia para ver su calendario.
                </AppText>
                <Button label="Elegir mi iglesia" onPress={() => router.push('/choose-iglesia')} />
              </>
            )}
            {origen.estado === 'cargando' && (
              <AppText color="textoSecundario" style={styles.paragraph}>
                Cargando tu calendario…
              </AppText>
            )}
            {origen.estado === 'sin-iglesias-asignadas' && (
              <AppText color="textoSecundario" style={styles.paragraph}>
                Todavía no tenés iglesias asignadas. Consultá con la asociación.
              </AppText>
            )}
            {origen.estado === 'error' && (
              <>
                <AppText color="textoSecundario" style={styles.paragraph}>
                  No se pudo cargar tu calendario. Revisá la conexión y probá de nuevo.
                </AppText>
                <Button label="Reintentar" variant="secondary" onPress={origen.refetch} />
              </>
            )}
          </Card>
        </View>
      )}
    </ScreenBackground>
  );
}

type MonthOfCalendarioProps = {
  fuente: FuenteDeCalendario;
  /** Something else to read again when the person retries a failed load. */
  onRetry: (() => void) | undefined;
};

function MonthOfCalendario({ fuente, onRetry }: MonthOfCalendarioProps) {
  const today = useToday();
  const [month, setMonth] = useState(() => getMonthOf(today));
  const [selectedDate, setSelectedDate] = useState(today);
  // Today changes when the app comes back to the front on another day. The
  // selection follows it only if it was on today, and takes its month along.
  const [previousToday, setPreviousToday] = useState(today);
  if (previousToday !== today) {
    const newSelectedDate = getSelectedDateAfterTodayChange(selectedDate, previousToday, today);
    setPreviousToday(today);
    if (newSelectedDate !== selectedDate) {
      setSelectedDate(newSelectedDate);
      setMonth(getMonthOf(newSelectedDate));
    }
  }
  const { data: calendario, isError, isFetching, refetch } = useCalendario(fuente, month);

  const showMonth = (newMonth: Month) => {
    setMonth(newMonth);
    setSelectedDate(getSelectedDate(newMonth, today));
  };

  const retry = () => {
    refetch();
    onRetry?.();
  };

  return (
    // The header stays in place and the bottom navigation is outside: only
    // the month and its eventos scroll.
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.monthRow}>
        <AppText variant="tituloPantalla" accessibilityRole="header" style={styles.monthTitle}>
          {formatMonthTitle(month)}
        </AppText>
        <View style={styles.monthButtons}>
          <MonthButton
            label="Mes anterior"
            direction="previous"
            onPress={() => showMonth(getPreviousMonth(month))}
          />
          <MonthButton
            label="Mes siguiente"
            direction="next"
            onPress={() => showMonth(getNextMonth(month))}
          />
        </View>
      </View>

      <MonthGrid
        month={month}
        today={today}
        selectedDate={selectedDate}
        fechas={calendario?.fechas}
        onSelectDate={setSelectedDate}
      />

      <EventosOfDay
        date={selectedDate}
        calendario={calendario}
        failed={isError && !isFetching}
        onRetry={retry}
      />
    </ScrollView>
  );
}

type MonthButtonProps = {
  label: string;
  direction: keyof typeof CHEVRON_PATHS;
  onPress: () => void;
};

/** One of the two round white buttons that move the calendar a month. */
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: HEADER_PADDING_HORIZONTAL,
  },
  logoBox: {
    width: LOGO_BOX_SIZE,
    height: LOGO_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
    gap: HEADER_TEXTS_GAP,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: MONTH_ROW_PADDING_HORIZONTAL,
  },
  monthTitle: {
    flexShrink: 1,
    fontSize: MONTH_TITLE_SIZE,
    lineHeight: MONTH_TITLE_SIZE * MONTH_TITLE_LINE_HEIGHT,
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
    borderRadius: MONTH_BUTTON_SIZE / 2,
    backgroundColor: colors.superficie,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
