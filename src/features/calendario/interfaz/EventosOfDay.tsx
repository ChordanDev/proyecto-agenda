import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { getCategoria, getLema } from '@/features/eventos/dominio/categoria';
import type { Evento } from '@/features/eventos/dominio/evento';
import { colors, fontSize, radius, spacing } from '@/shared/theme';
import { AppText, Button, Card, FormaDeEnfasis } from '@/shared/ui';

import type { Calendario } from '../datos/getFechasDelMes';
import {
  formatDayHeading,
  formatEventosCount,
  formatTimeAndPlaceDelDia,
} from '../dominio/calendarioTexts';
import { getEventosDelDia } from '../dominio/dayOfCalendario';
import type { DiaDelRango } from '../dominio/diasDeEvento';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/04a-calendario.html.
const HEADING_PADDING_TOP = 8; // line 97
const HEADING_PADDING_HORIZONTAL = 4;
// The mockup separates the heading from the count with `space-between` alone.
// The gap of the row above the grid (line 55) keeps a long heading off the count.
const HEADING_GAP = 12;
const HEADING_SIZE = 21; // line 98
const EMPTY_PADDING_VERTICAL = 24; // line 103
const EMPTY_PADDING_HORIZONTAL = 18;
const ROW_GAP = 14; // line 108
const SHAPE_BOX_WIDTH = 22; // line 109
const SHAPE_BOX_HEIGHT = 26;
const SHAPE_SIZE = 18; // lines 110-114
const ROW_TEXTS_GAP = 3; // line 116
const ROW_TITLE_LINE_HEIGHT = 1.3; // line 117
const ROW_DETAIL_SIZE = 16; // line 118
// The mockup sets no line height on this text: the one of the font.
const ROW_DETAIL_LINE_HEIGHT = 22;
const CHEVRON_SIZE = 20; // line 124
const CHEVRON_STROKE_WIDTH = 2.4;
const CHEVRON_COLOR = '#9B9B9B';
const CHEVRON_MARGIN_TOP = 4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;
// The texts of the states the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;

type EventosOfDayProps = {
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  /** Undefined until the month is read. */
  calendario: Calendario | undefined;
  /** The month could not be read and nobody is trying again right now. */
  failed: boolean;
  onRetry: () => void;
};

/** The heading of the selected day and, under it, its eventos ordered by hora. */
export function EventosOfDay({ date, calendario, failed, onRetry }: EventosOfDayProps) {
  const router = useRouter();
  const eventos = calendario ? getEventosDelDia(calendario.fechas, date) : [];

  const renderEventos = () => {
    if (calendario === undefined) {
      if (failed) {
        return (
          <Card style={styles.message}>
            <AppText color="textoSecundario" style={styles.paragraph}>
              No se pudieron cargar los eventos. Revisá la conexión y probá de nuevo.
            </AppText>
            <Button label="Reintentar" variant="secondary" onPress={onRetry} />
          </Card>
        );
      }
      return (
        <Card>
          <AppText color="textoSecundario" style={styles.paragraph}>
            Cargando eventos…
          </AppText>
        </Card>
      );
    }
    if (eventos.length === 0) {
      return (
        <AppText color="textoSecundario" style={styles.empty}>
          No hay eventos este día.
        </AppText>
      );
    }
    return (
      <View style={styles.list}>
        {eventos.map(({ evento, diaDelRango }) => (
          <EventoRow
            key={evento.id}
            evento={evento}
            diaDelRango={diaDelRango}
            etiqueta={calendario.etiquetas[evento.id] ?? null}
            // The date goes along: a series has several, and the detail shows this one.
            onPress={() =>
              router.push({ pathname: '/evento/[id]', params: { id: evento.id, fecha: date } })
            }
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <View style={styles.heading}>
        <AppText
          variant="tituloEncabezado"
          color="texto"
          accessibilityRole="header"
          style={styles.headingText}
        >
          {formatDayHeading(date)}
        </AppText>
        {eventos.length > 0 && (
          <AppText variant="secundario" color="textoTenue">
            {formatEventosCount(eventos.length)}
          </AppText>
        )}
      </View>

      {renderEventos()}
    </>
  );
}

type EventoRowProps = {
  evento: Evento;
  /** The day of its range, for an evento of several days. */
  diaDelRango: DiaDelRango | null;
  /**
   * Where the evento comes from when it is not of the iglesia, and whether it
   * is shared (`getEtiquetaDelEvento`), or null.
   */
  etiqueta: string | null;
  /** Opens the detail of the evento. */
  onPress: () => void;
};

/** An evento of the list, which opens its detail. */
function EventoRow({ evento, diaDelRango, etiqueta, onPress }: EventoRowProps) {
  const timeAndPlace = formatTimeAndPlaceDelDia(evento, diaDelRango);
  const lema = getLema(evento.enfasis);

  return (
    <Pressable
      accessibilityRole="button"
      // One stop of the screen reader for the whole evento, in reading order.
      accessibilityLabel={[evento.titulo, timeAndPlace, lema, etiqueta]
        .filter((text) => text !== null)
        .join(', ')}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.shapeBox}>
        <FormaDeEnfasis categoria={getCategoria(evento.enfasis)} size={SHAPE_SIZE} />
      </View>
      <View style={styles.rowTexts}>
        <AppText variant="cuerpoGrande" weight="bold" style={styles.rowTitle}>
          {evento.titulo}
        </AppText>
        <AppText color="textoSecundario" style={styles.rowDetail}>
          {timeAndPlace}
        </AppText>
        <AppText variant="chico" color="textoTenue">
          {lema}
          {etiqueta !== null && (
            <AppText variant="chico" weight="semibold" color="azulMarca">
              {' · '}
              {etiqueta}
            </AppText>
          )}
        </AppText>
      </View>
      <Svg
        width={CHEVRON_SIZE}
        height={CHEVRON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        style={styles.chevron}
      >
        <Path
          d="M9 5l7 7-7 7"
          stroke={CHEVRON_COLOR}
          strokeWidth={CHEVRON_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: HEADING_GAP,
    paddingTop: HEADING_PADDING_TOP,
    paddingHorizontal: HEADING_PADDING_HORIZONTAL,
  },
  headingText: {
    flexShrink: 1,
    fontSize: HEADING_SIZE,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  empty: {
    paddingVertical: EMPTY_PADDING_VERTICAL,
    paddingHorizontal: EMPTY_PADDING_HORIZONTAL,
    textAlign: 'center',
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ROW_GAP,
    padding: spacing.tarjetaPadding,
    // Under every row, the last one included, as the mockup draws it.
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  chevron: {
    marginTop: CHEVRON_MARGIN_TOP,
  },
  shapeBox: {
    width: SHAPE_BOX_WIDTH,
    height: SHAPE_BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
    gap: ROW_TEXTS_GAP,
  },
  rowTitle: {
    lineHeight: fontSize.cuerpoGrande * ROW_TITLE_LINE_HEIGHT,
  },
  rowDetail: {
    fontSize: ROW_DETAIL_SIZE,
    lineHeight: ROW_DETAIL_LINE_HEIGHT,
  },
});
