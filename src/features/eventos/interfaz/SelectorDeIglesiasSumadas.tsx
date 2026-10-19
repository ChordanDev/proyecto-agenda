import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { formatDistancia } from '@/features/iglesias/dominio/distancia';
import { accesibilidad, colors, fonts, fontSize, radius, spacing } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';

import type { Duenio } from '../dominio/evento';
import {
  getIglesiasElegidas,
  getOpcionesParaCompartir,
  getTituloDeOpciones,
  type IglesiaParaCompartir,
} from '../dominio/opcionesParaCompartir';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/06-crear-evento.html.
const CARD_GAP = 12; // line 159
const CARD_PADDING_VERTICAL = 18;
const TEXTS_GAP = 4; // line 160
const HINT_LINE_HEIGHT = 1.4; // line 162
const CHIPS_GAP = 8; // line 166
const CHIP_GAP = 8; // line 168
const CHIP_PADDING_LEFT = 14;
const CHIP_PADDING_RIGHT = 10;
const CHIP_ICON_SIZE = 18; // line 170
const CHIP_ICON_STROKE_WIDTH = 2.6;
const SEARCH_HEIGHT = 54; // line 177
const SEARCH_GAP = 10;
const SEARCH_PADDING_HORIZONTAL = 14;
const SEARCH_ICON_SIZE = 22; // line 178
const SEARCH_ICON_STROKE_WIDTH = 2.2;
const ROW_GAP = 12; // line 186
const ROW_PADDING_VERTICAL = 10;
const ROW_TEXTS_GAP = 2; // line 187
const PLUS_ICON_SIZE = 16; // line 192
const PLUS_ICON_STROKE_WIDTH = 3;
const SUMAR_GAP = 6; // line 191
const SUMAR_PADDING_HORIZONTAL = 14;
const EMPTY_PADDING_VERTICAL = 12; // line 198
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type SelectorDeIglesiasSumadasProps = {
  duenio: Duenio;
  nombreDelDuenio: string;
  /** Ids of the iglesias chosen, in the order they were chosen. */
  elegidas: readonly string[];
  /** Undefined while they are read. */
  iglesias: readonly IglesiaParaCompartir[] | undefined;
  isError: boolean;
  onRetry: () => void;
  onChange: (elegidas: string[]) => void;
};

/**
 * "Compartir con otras iglesias": a search over every iglesia of the
 * asociacion, the closest to the duenio first, and the chosen ones on top as
 * chips that are tapped to quitar them.
 */
export function SelectorDeIglesiasSumadas({
  duenio,
  nombreDelDuenio,
  elegidas,
  iglesias,
  isError,
  onRetry,
  onChange,
}: SelectorDeIglesiasSumadasProps) {
  const [texto, setTexto] = useState('');
  const input = useRef<TextInput>(null);

  const renderContent = () => {
    // States the mockup does not draw.
    if (iglesias === undefined) {
      return isError ? (
        <>
          <AppText variant="secundario">
            No se pudieron cargar las iglesias. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button label="Reintentar" variant="secondary" onPress={onRetry} />
        </>
      ) : (
        <AppText variant="secundario">Cargando iglesias…</AppText>
      );
    }

    const chips = getIglesiasElegidas(duenio, elegidas, iglesias);
    const opciones = getOpcionesParaCompartir(duenio, iglesias, { texto, elegidas });

    return (
      <>
        {chips.length > 0 && (
          <View style={styles.chips}>
            {chips.map((iglesia) => (
              <Pressable
                key={iglesia.id}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${iglesia.nombre}`}
                onPress={() => onChange(elegidas.filter((id) => id !== iglesia.id))}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <AppText variant="secundario" weight="bold" color="textoSobreOscuro">
                  {iglesia.nombre}
                </AppText>
                <CloseIcon />
              </Pressable>
            ))}
          </View>
        )}

        <Pressable accessible={false} onPress={() => input.current?.focus()} style={styles.search}>
          <SearchIcon />
          <TextInput
            ref={input}
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar iglesia"
            placeholderTextColor={colors.textoTenue}
            accessibilityLabel="Buscar iglesia"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.input}
          />
        </Pressable>

        <AppText variant="chico" weight="bold" color="textoTenue">
          {getTituloDeOpciones(texto)}
        </AppText>

        <View>
          {opciones.map((iglesia) => (
            <View key={iglesia.id} style={styles.row}>
              <View style={styles.rowTexts}>
                <AppText weight="bold">{iglesia.nombre}</AppText>
                <AppText variant="chico">
                  {iglesia.distancia === null
                    ? iglesia.distrito
                    : `${iglesia.distrito} · ${formatDistancia(iglesia.distancia)}`}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sumar ${iglesia.nombre}`}
                onPress={() => {
                  onChange([...elegidas, iglesia.id]);
                  setTexto('');
                }}
                style={({ pressed }) => [styles.sumar, pressed && styles.pressed]}
              >
                <PlusIcon />
                <AppText variant="secundario" weight="bold" color="azulOscuro">
                  Sumar
                </AppText>
              </Pressable>
            </View>
          ))}
          {opciones.length === 0 && (
            <AppText variant="secundario" style={styles.empty}>
              {texto.trim() === ''
                ? 'No quedan iglesias para sumar.'
                : 'No encontramos iglesias con ese nombre.'}
            </AppText>
          )}
        </View>
      </>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.texts}>
        <AppText variant="label" accessibilityRole="header">
          Compartir con otras iglesias
        </AppText>
        <AppText variant="secundario" style={styles.hint}>
          Se publica en {nombreDelDuenio}. Sumá otras para que también lo vean.
        </AppText>
      </View>
      {renderContent()}
    </View>
  );
}

function CloseIcon() {
  return (
    <Svg width={CHIP_ICON_SIZE} height={CHIP_ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={colors.textoSobreOscuro}
        strokeWidth={CHIP_ICON_STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg width={SEARCH_ICON_SIZE} height={SEARCH_ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Circle
        cx={11}
        cy={11}
        r={7}
        stroke={colors.textoSecundario}
        strokeWidth={SEARCH_ICON_STROKE_WIDTH}
      />
      <Path
        d="M20 20l-4-4"
        stroke={colors.textoSecundario}
        strokeWidth={SEARCH_ICON_STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg width={PLUS_ICON_SIZE} height={PLUS_ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={colors.azulOscuro}
        strokeWidth={PLUS_ICON_STROKE_WIDTH}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_GAP,
    paddingVertical: CARD_PADDING_VERTICAL,
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  texts: {
    gap: TEXTS_GAP,
  },
  hint: {
    lineHeight: fontSize.secundario * HINT_LINE_HEIGHT,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CHIPS_GAP,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CHIP_GAP,
    minHeight: accesibilidad.alturaMinTactil,
    paddingLeft: CHIP_PADDING_LEFT,
    paddingRight: CHIP_PADDING_RIGHT,
    borderRadius: radius.pastilla,
    backgroundColor: colors.azulOscuro,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SEARCH_GAP,
    height: SEARCH_HEIGHT,
    paddingHorizontal: SEARCH_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    // Android adds a vertical padding of its own to every input.
    paddingVertical: 0,
    fontFamily: fonts.regular,
    fontSize: fontSize.cuerpo,
    color: colors.texto,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingVertical: ROW_PADDING_VERTICAL,
    borderTopWidth: 1,
    borderTopColor: colors.separador,
  },
  rowTexts: {
    flex: 1,
    minWidth: 0,
    gap: ROW_TEXTS_GAP,
  },
  sumar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SUMAR_GAP,
    minHeight: accesibilidad.alturaMinTactil,
    paddingHorizontal: SUMAR_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.azulSuave,
  },
  empty: {
    paddingVertical: EMPTY_PADDING_VERTICAL,
    borderTopWidth: 1,
    borderTopColor: colors.separador,
  },
});
