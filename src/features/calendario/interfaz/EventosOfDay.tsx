import { StyleSheet, View } from 'react-native';

import { getCategoria, getLema } from '@/features/eventos/dominio/categoria';
import type { Evento } from '@/features/eventos/dominio/evento';
import { colors, fontSize, radius, spacing } from '@/shared/theme';
import { AppText, Button, Card, FormaDeEnfasis } from '@/shared/ui';

import type { CalendarioDeIglesia } from '../datos/getCalendarioDeIglesia';
import {
  formatDayHeading,
  formatEventosCount,
  formatTimeAndPlace,
  getAlcanceLabel,
} from '../dominio/calendarioTexts';
import { getEventosOfDay } from '../dominio/dayOfCalendario';

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
// The texts of the states the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;

type EventosOfDayProps = {
  /** Local date, `YYYY-MM-DD`. */
  date: string;
  /** Undefined until the month is read. */
  calendario: CalendarioDeIglesia | undefined;
  /** The month could not be read and nobody is trying again right now. */
  failed: boolean;
  onRetry: () => void;
};

/** The heading of the selected day and, under it, its eventos ordered by hora. */
export function EventosOfDay({ date, calendario, failed, onRetry }: EventosOfDayProps) {
  const eventos = calendario ? getEventosOfDay(calendario.fechas, date) : [];

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
        {eventos.map((evento) => (
          <EventoRow
            key={evento.id}
            evento={evento}
            alcanceLabel={getAlcanceLabel(evento.duenio, calendario.nombresDeDistritos)}
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
  /** Where the evento comes from when it is not of the iglesia, or null. */
  alcanceLabel: string | null;
};

/**
 * An evento of the list. It opens nothing yet, so it is not a button and has
 * no chevron: the detail of an evento belongs to issue #26.
 */
function EventoRow({ evento, alcanceLabel }: EventoRowProps) {
  const timeAndPlace = formatTimeAndPlace(evento);
  const lema = getLema(evento.enfasis);

  return (
    <View
      accessible
      // One stop of the screen reader for the whole evento, in reading order.
      accessibilityLabel={[evento.titulo, timeAndPlace, lema, alcanceLabel]
        .filter((text) => text !== null)
        .join(', ')}
      style={styles.row}
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
          {alcanceLabel !== null && (
            <AppText variant="chico" weight="semibold" color="azulMarca">
              {' · '}
              {alcanceLabel}
            </AppText>
          )}
        </AppText>
      </View>
    </View>
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
