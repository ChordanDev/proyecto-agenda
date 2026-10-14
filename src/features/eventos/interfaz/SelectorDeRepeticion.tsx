import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { accesibilidad, colors, fontSize, radius, spacing } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import type { Repeticion } from '../dominio/evento';
import { formatFechaDelCampo } from '../dominio/formularioDeEvento';
import { formatFraseDeRepeticion, getOpcionesDeRepeticion } from '../dominio/repeticion';
import { RadioMark } from './RadioMark';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/06-crear-evento.html.
const CARD_PADDING_TOP = 16; // line 100
const CARD_PADDING_BOTTOM = 4;
const TITLE_MARGIN_BOTTOM = 4; // line 101
const NOTE_MARGIN_BOTTOM = 4; // line 103
const NOTE_LINE_HEIGHT = 1.4;
const ROW_MIN_HEIGHT = 56; // line 106
const ROW_PADDING_VERTICAL = 8;
const ROW_GAP = 14;
const DISABLED_OPACITY = 0.45; // line 231
const HASTA_MARGIN_TOP = 14; // line 118
const HASTA_GAP = 8;
const HASTA_PADDING_HORIZONTAL = 16; // line 120
const PHRASE_MARGIN_TOP = 14; // line 123
const PHRASE_MARGIN_BOTTOM = 12;
const PHRASE_PADDING_VERTICAL = 12;
const PHRASE_PADDING_HORIZONTAL = 14;
const PHRASE_GAP = 10;
const PHRASE_ICON_SIZE = 22; // line 124
const PHRASE_ICON_STROKE_WIDTH = 2.2;
const PHRASE_ICON_MARGIN_TOP = 1;
const PHRASE_SIZE = 16; // line 125
const PHRASE_LINE_HEIGHT = 1.4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/** The arrows of "Se repite" (05-detalle-evento.html, line 51). */
export const REPEAT_PATHS = [
  'M17 2l4 4-4 4',
  'M3 11v-1a4 4 0 0 1 4-4h14',
  'M7 22l-4-4 4-4',
  'M21 13v1a4 4 0 0 1-4 4H3',
];

type SelectorDeRepeticionProps = {
  /** The first date; until it is chosen, the options name the weekday of today. */
  fecha: string;
  repeticion: Repeticion;
  finDeSerie: string | null;
  /** An evento of several days cannot repeat: the options are disabled. */
  tieneFechaFin: boolean;
  editando: boolean;
  errorDeRepeticion: string | undefined;
  errorDeHasta: string | undefined;
  onChangeRepeticion: (repeticion: Repeticion) => void;
  onOpenHasta: () => void;
};

/** How the evento repeats, its "Hasta" and the sentence that explains it with words. */
export function SelectorDeRepeticion({
  fecha,
  repeticion,
  finDeSerie,
  tieneFechaFin,
  editando,
  errorDeRepeticion,
  errorDeHasta,
  onChangeRepeticion,
  onOpenHasta,
}: SelectorDeRepeticionProps) {
  const seRepite = repeticion !== 'ninguna';

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Repetición" style={styles.card}>
      <AppText variant="label" style={styles.title}>
        Repetición
      </AppText>
      {tieneFechaFin && (
        <AppText variant="chico" style={styles.note}>
          Un evento de varios días no puede repetirse.
        </AppText>
      )}
      {errorDeRepeticion !== undefined && (
        <AppText variant="chico" color="peligro" style={styles.note}>
          {errorDeRepeticion}
        </AppText>
      )}
      {getOpcionesDeRepeticion(fecha).map((opcion) => {
        const checked = opcion.repeticion === repeticion;
        // "No se repite" is always available, to undo the conflict.
        const disabled = tieneFechaFin && opcion.repeticion !== 'ninguna';

        return (
          <Pressable
            key={opcion.repeticion}
            accessibilityRole="radio"
            accessibilityState={{ checked, disabled }}
            disabled={disabled}
            onPress={() => onChangeRepeticion(opcion.repeticion)}
            style={({ pressed }) => [
              styles.row,
              disabled && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <AppText weight="bold" style={styles.rowLabel}>
              {opcion.label}
            </AppText>
            <RadioMark checked={checked} />
          </Pressable>
        );
      })}

      {seRepite && (
        <>
          <View style={styles.hasta}>
            <AppText variant="label">Hasta</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Hasta: ${finDeSerie ? formatFechaDelCampo(finDeSerie) : 'sin elegir'}`}
              onPress={onOpenHasta}
              style={({ pressed }) => [styles.hastaBox, pressed && styles.pressed]}
            >
              <AppText variant="cuerpoGrande" color={finDeSerie ? 'texto' : 'textoTenue'}>
                {finDeSerie ? formatFechaDelCampo(finDeSerie) : 'Elegir'}
              </AppText>
            </Pressable>
            {errorDeHasta !== undefined ? (
              <AppText variant="chico" color="peligro">
                {errorDeHasta}
              </AppText>
            ) : (
              <AppText variant="chico" style={styles.noteText}>
                {editando
                  ? 'Como máximo, un año desde hoy.'
                  : 'Como máximo, un año desde la primera fecha.'}
              </AppText>
            )}
          </View>
          {finDeSerie !== null && (
            <View accessibilityRole="summary" style={styles.phrase}>
              <Svg
                width={PHRASE_ICON_SIZE}
                height={PHRASE_ICON_SIZE}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.azulOscuro}
                strokeWidth={PHRASE_ICON_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.phraseIcon}
              >
                {REPEAT_PATHS.map((d) => (
                  <Path key={d} d={d} />
                ))}
              </Svg>
              <AppText weight="semibold" color="azulOscuro" style={styles.phraseText}>
                {formatFraseDeRepeticion(repeticion, fecha, finDeSerie)}
              </AppText>
            </View>
          )}
        </>
      )}
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
  note: {
    marginBottom: NOTE_MARGIN_BOTTOM,
    lineHeight: fontSize.chico * NOTE_LINE_HEIGHT,
  },
  noteText: {
    lineHeight: fontSize.chico * NOTE_LINE_HEIGHT,
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
  rowLabel: {
    flex: 1,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  hasta: {
    gap: HASTA_GAP,
    marginTop: HASTA_MARGIN_TOP,
  },
  hastaBox: {
    justifyContent: 'center',
    minHeight: accesibilidad.alturaCampo,
    paddingHorizontal: HASTA_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  phrase: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: PHRASE_GAP,
    marginTop: PHRASE_MARGIN_TOP,
    marginBottom: PHRASE_MARGIN_BOTTOM,
    paddingVertical: PHRASE_PADDING_VERTICAL,
    paddingHorizontal: PHRASE_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.azulSuave,
  },
  phraseIcon: {
    marginTop: PHRASE_ICON_MARGIN_TOP,
  },
  phraseText: {
    flex: 1,
    fontSize: PHRASE_SIZE,
    lineHeight: PHRASE_SIZE * PHRASE_LINE_HEIGHT,
  },
});
