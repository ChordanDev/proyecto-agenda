import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { IglesiaConEstructura } from '@/features/calendario/datos/getIglesiasEnEstructura';
import { HojaInferior } from '@/features/eventos/interfaz/HojaInferior';
import { normalize } from '@/features/iglesias/dominio/buscarIglesias';
import { colors, fonts, radius } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';

import { cuantasIglesias } from '../dominio/textos';

// Layout of the sheet of 10-ajustes.html (lines 141-178), which the theme has
// no tokens for.
const SEARCH_HEIGHT = 52;
const SEARCH_PADDING_HORIZONTAL = 16;
const SEARCH_TEXT_SIZE = 17;
const GROUP_TITLE_SIZE = 15;
const GROUP_TITLE_PADDING_TOP = 8;
const GROUP_TITLE_PADDING_BOTTOM = 2;
const ROW_MIN_HEIGHT = 56;
const ROW_GAP = 14;
const ROW_PADDING_VERTICAL = 4;
const CHECKBOX_SIZE = 28;
const CHECKBOX_RADIUS = 8;
const CHECKBOX_BORDER = 2;
const CHECK_SIZE = 18;
const CHECK_STROKE_WIDTH = 3;
const NAME_SIZE = 17;
const NOTE_SIZE = 15;
const NOTE_LINE_HEIGHT = 1.4;
const BUTTONS_GAP = 10;
const BUTTONS_MARGIN_TOP = 4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type HojaDeIglesiasProps = {
  visible: boolean;
  /** The iglesias that can be chosen, in the order to show them. */
  opciones: readonly IglesiaConEstructura[];
  elegidas: readonly string[];
  /** An admin gets a buscador, and the elegidas above (capture 10j). */
  conBuscador: boolean;
  guardando: boolean;
  onGuardar: (iglesiaIds: string[]) => void;
  onClose: () => void;
};

/** "¿De qué iglesias querés recordatorios?": the choice of a pastor (10h) or an admin (10j). */
export function HojaDeIglesias(props: HojaDeIglesiasProps) {
  // Mounted again on every opening, so it starts from what is saved.
  return props.visible ? <Contenido {...props} /> : null;
}

function Contenido({
  opciones,
  elegidas,
  conBuscador,
  guardando,
  onGuardar,
  onClose,
}: HojaDeIglesiasProps) {
  const [marcadas, setMarcadas] = useState<string[]>(() => [...elegidas]);
  const [texto, setTexto] = useState('');

  const alternar = (id: string) =>
    setMarcadas((actuales) =>
      actuales.includes(id) ? actuales.filter((otra) => otra !== id) : [...actuales, id],
    );

  const buscado = normalize(texto);
  const visibles = opciones.filter((iglesia) => normalize(iglesia.nombre).includes(buscado));
  // The elegidas stay above while the admin looks for more, as they were on opening.
  const grupos = conBuscador
    ? [
        { titulo: 'Elegidas', iglesias: visibles.filter((i) => elegidas.includes(i.id)) },
        { titulo: 'Todas', iglesias: visibles.filter((i) => !elegidas.includes(i.id)) },
      ].filter((grupo) => grupo.iglesias.length > 0)
    : [{ titulo: undefined, iglesias: visibles }];

  return (
    <HojaInferior visible title="¿De qué iglesias querés recordatorios?" onClose={onClose}>
      {conBuscador && (
        <View style={styles.search}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder="Buscar iglesia"
            placeholderTextColor={colors.textoTenue}
            accessibilityLabel="Buscar iglesia"
            style={styles.searchInput}
          />
        </View>
      )}
      {grupos.map((grupo) => (
        <View key={grupo.titulo ?? 'todas'}>
          {grupo.titulo !== undefined && (
            <AppText weight="bold" accessibilityRole="header" style={styles.groupTitle}>
              {grupo.titulo}
            </AppText>
          )}
          {grupo.iglesias.map((iglesia) => (
            <Opcion
              key={iglesia.id}
              iglesia={iglesia}
              conDistrito={conBuscador}
              marcada={marcadas.includes(iglesia.id)}
              onPress={() => alternar(iglesia.id)}
            />
          ))}
        </View>
      ))}
      {!conBuscador && (
        <AppText color="textoSecundario" style={styles.note}>
          Los eventos del distrito llegan con cualquiera de ellas.
        </AppText>
      )}
      <View style={styles.buttons}>
        <Button
          label={
            guardando
              ? 'Guardando…'
              : marcadas.length === 0
                ? 'Guardar'
                : `Guardar (${cuantasIglesias(marcadas.length)})`
          }
          disabled={guardando}
          onPress={() => onGuardar(marcadas)}
        />
        <Button label="Cancelar" variant="secondary" onPress={onClose} />
      </View>
    </HojaInferior>
  );
}

type OpcionProps = {
  iglesia: IglesiaConEstructura;
  conDistrito: boolean;
  marcada: boolean;
  onPress: () => void;
};

function Opcion({ iglesia, conDistrito, marcada, onPress }: OpcionProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.checkbox, marcada ? styles.checkboxOn : styles.checkboxOff]}>
        {marcada && (
          <Svg width={CHECK_SIZE} height={CHECK_SIZE} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke={colors.textoSobreOscuro}
              strokeWidth={CHECK_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
      <View style={styles.rowTexts}>
        <AppText weight="semibold" style={styles.name}>
          {iglesia.nombre}
        </AppText>
        {conDistrito && <AppText variant="secundario">{iglesia.distrito}</AppText>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: {
    height: SEARCH_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: SEARCH_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  searchInput: {
    fontFamily: fonts.regular,
    fontSize: SEARCH_TEXT_SIZE,
    color: colors.texto,
  },
  groupTitle: {
    paddingTop: GROUP_TITLE_PADDING_TOP,
    paddingBottom: GROUP_TITLE_PADDING_BOTTOM,
    fontSize: GROUP_TITLE_SIZE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separador,
  },
  rowTexts: {
    flex: 1,
  },
  name: {
    fontSize: NAME_SIZE,
  },
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CHECKBOX_RADIUS,
  },
  checkboxOn: {
    backgroundColor: colors.azulOscuro,
  },
  checkboxOff: {
    borderWidth: CHECKBOX_BORDER,
    borderColor: colors.radioInactivo,
    backgroundColor: colors.superficie,
  },
  note: {
    fontSize: NOTE_SIZE,
    lineHeight: NOTE_SIZE * NOTE_LINE_HEIGHT,
  },
  buttons: {
    gap: BUTTONS_GAP,
    marginTop: BUTTONS_MARGIN_TOP,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
