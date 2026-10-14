import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CATEGORIAS, type Categoria } from '@/features/eventos/dominio/categoria';
import { accesibilidad, categorias, colors, radius } from '@/shared/theme';
import { AppText, FormaDeEnfasis } from '@/shared/ui';

import {
  countHiddenCategorias,
  formatFiltroSummary,
  toggleCategoria,
} from '../dominio/filtroDeCategorias';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/04a-calendario.html.
const ROW_PADDING_HORIZONTAL = 4; // line 55
const ROW_GAP = 12;
const SUMMARY_SIZE = 15;
const BUTTON_HEIGHT = 46; // line 57
const BUTTON_PADDING_HORIZONTAL = 16;
const BUTTON_GAP = 8;
const FUNNEL_SIZE = 20; // line 58
const FUNNEL_STROKE_WIDTH = 2.2;
const FUNNEL_PATH = 'M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z';
const BADGE_MIN_SIZE = 22; // line 60
const BADGE_PADDING_HORIZONTAL = 6;
const BADGE_SIZE = 13;
const SCRIM_COLOR = 'rgba(15,27,42,0.45)'; // line 137
const SHEET_PADDING_TOP = 12; // line 138
const SHEET_PADDING_HORIZONTAL = 20;
const SHEET_PADDING_BOTTOM = 28;
const SHEET_GAP = 6;
const HANDLE_WIDTH = 44; // line 139
const HANDLE_HEIGHT = 5;
const HANDLE_COLOR = '#D5D9DF';
const HANDLE_MARGIN_BOTTOM = 8;
const SHEET_TITLE_SIZE = 22; // line 140
const SHEET_TITLE_MARGIN_BOTTOM = 4;
const SHEET_HINT_MARGIN_BOTTOM = 8; // line 141
const OPTION_MIN_HEIGHT = 60; // line 143
const OPTION_PADDING_VERTICAL = 8;
const OPTION_PADDING_HORIZONTAL = 4;
const OPTION_GAP = 14;
const SHAPE_BOX_SIZE = 26; // line 144
const SHAPE_SIZE = 20;
const OPTION_TEXTS_GAP = 1; // line 151
const OPTION_LEMA_SIZE = 18; // line 152
const OPTION_NAME_SIZE = 14; // line 153
const CHECKBOX_SIZE = 28; // line 155
const CHECKBOX_RADIUS = 8;
const CHECKBOX_BORDER_WIDTH = 2;
const CHECK_SIZE = 18;
const CHECK_STROKE_WIDTH = 3;
const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
const ACTIONS_GAP = 10; // line 163
const ACTIONS_MARGIN_TOP = 14;
const ACTION_HEIGHT = 54;
const ACTION_LABEL_SIZE = 17;
const ACTION_BORDER_WIDTH = 2;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type FiltroDeCategoriasProps = {
  selected: readonly Categoria[];
  onChange: (selected: Categoria[]) => void;
};

/**
 * The "Filtrar" row under the month title and the bottom sheet it opens, where
 * each énfasis and the actividad regular is switched on or off.
 */
export function FiltroDeCategorias({ selected, onChange }: FiltroDeCategoriasProps) {
  const [open, setOpen] = useState(false);
  const hidden = countHiddenCategorias(selected);

  return (
    <View style={styles.row}>
      <AppText color="textoSecundario" style={styles.summary}>
        {formatFiltroSummary(selected)}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={hidden > 0 ? `Filtrar, ${hidden} ocultos` : 'Filtrar'}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Svg width={FUNNEL_SIZE} height={FUNNEL_SIZE} viewBox="0 0 24 24" fill="none">
          <Path
            d={FUNNEL_PATH}
            stroke={colors.azulOscuro}
            strokeWidth={FUNNEL_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <AppText weight="bold" color="azulOscuro" style={styles.buttonLabel}>
          Filtrar
        </AppText>
        {hidden > 0 && (
          <View style={styles.badge} importantForAccessibility="no-hide-descendants">
            <AppText weight="bold" color="textoSobreOscuro" style={styles.badgeLabel}>
              {hidden}
            </AppText>
          </View>
        )}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        statusBarTranslucent
      >
        <View style={styles.scrim}>
          {/* Tapping the dark area closes the sheet, as the back button does. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar filtro"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <AppText variant="tituloEncabezado" accessibilityRole="header" style={styles.title}>
              Filtrar eventos
            </AppText>
            <AppText color="textoSecundario" style={styles.hint}>
              Elegí qué mostrar en el calendario.
            </AppText>
            {CATEGORIAS.map((categoria) => (
              <OptionRow
                key={categoria}
                categoria={categoria}
                checked={selected.includes(categoria)}
                onPress={() => onChange(toggleCategoria(selected, categoria))}
              />
            ))}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => onChange([...CATEGORIAS])}
                style={({ pressed }) => [
                  styles.action,
                  styles.actionOutlined,
                  pressed && styles.pressed,
                ]}
              >
                <AppText weight="bold" color="azulOscuro" style={styles.actionLabel}>
                  Mostrar todo
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={({ pressed }) => [
                  styles.action,
                  styles.actionFilled,
                  pressed && styles.pressed,
                ]}
              >
                <AppText weight="bold" color="textoSobreOscuro" style={styles.actionLabel}>
                  Listo
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

type OptionRowProps = {
  categoria: Categoria;
  checked: boolean;
  onPress: () => void;
};

/** One option of the sheet: its shape, its lema and name, and a checkbox. */
function OptionRow({ categoria, checked, onPress }: OptionRowProps) {
  const { lema, nombre } = categorias[categoria];

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${lema}, ${nombre}`}
      onPress={onPress}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.shapeBox}>
        <FormaDeEnfasis categoria={categoria} size={SHAPE_SIZE} />
      </View>
      <View style={styles.optionTexts}>
        <AppText weight="bold" style={styles.optionLema}>
          {lema}
        </AppText>
        <AppText color="textoSecundario" style={styles.optionName}>
          {nombre}
        </AppText>
      </View>
      <View style={[styles.checkbox, checked ? styles.checkboxOn : styles.checkboxOff]}>
        {checked && (
          <Svg width={CHECK_SIZE} height={CHECK_SIZE} viewBox="0 0 24 24" fill="none">
            <Path
              d={CHECK_PATH}
              stroke={colors.textoSobreOscuro}
              strokeWidth={CHECK_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ROW_GAP,
    paddingHorizontal: ROW_PADDING_HORIZONTAL,
  },
  summary: {
    flex: 1,
    fontSize: SUMMARY_SIZE,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BUTTON_GAP,
    minHeight: Math.max(BUTTON_HEIGHT, accesibilidad.alturaMinTactil),
    paddingHorizontal: BUTTON_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
    backgroundColor: colors.superficie,
  },
  buttonLabel: {
    fontSize: 16,
  },
  badge: {
    minWidth: BADGE_MIN_SIZE,
    height: BADGE_MIN_SIZE,
    paddingHorizontal: BADGE_PADDING_HORIZONTAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pastilla,
    backgroundColor: colors.azulOscuro,
  },
  badgeLabel: {
    fontSize: BADGE_SIZE,
  },
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: SCRIM_COLOR,
  },
  sheet: {
    gap: SHEET_GAP,
    paddingTop: SHEET_PADDING_TOP,
    paddingHorizontal: SHEET_PADDING_HORIZONTAL,
    paddingBottom: SHEET_PADDING_BOTTOM,
    borderTopLeftRadius: radius.hoja,
    borderTopRightRadius: radius.hoja,
    backgroundColor: colors.superficie,
  },
  handle: {
    alignSelf: 'center',
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    marginBottom: HANDLE_MARGIN_BOTTOM,
    borderRadius: radius.pastilla,
    backgroundColor: HANDLE_COLOR,
  },
  title: {
    marginBottom: SHEET_TITLE_MARGIN_BOTTOM,
    fontSize: SHEET_TITLE_SIZE,
  },
  hint: {
    marginBottom: SHEET_HINT_MARGIN_BOTTOM,
    fontSize: SUMMARY_SIZE,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: OPTION_GAP,
    minHeight: OPTION_MIN_HEIGHT,
    paddingVertical: OPTION_PADDING_VERTICAL,
    paddingHorizontal: OPTION_PADDING_HORIZONTAL,
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  shapeBox: {
    width: SHAPE_BOX_SIZE,
    height: SHAPE_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTexts: {
    flex: 1,
    gap: OPTION_TEXTS_GAP,
  },
  optionLema: {
    fontSize: OPTION_LEMA_SIZE,
  },
  optionName: {
    fontSize: OPTION_NAME_SIZE,
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
    borderWidth: CHECKBOX_BORDER_WIDTH,
    borderColor: colors.radioInactivo,
  },
  actions: {
    flexDirection: 'row',
    gap: ACTIONS_GAP,
    marginTop: ACTIONS_MARGIN_TOP,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ACTION_HEIGHT,
    borderRadius: radius.boton,
  },
  actionOutlined: {
    borderWidth: ACTION_BORDER_WIDTH,
    borderColor: colors.azulOscuro,
    backgroundColor: colors.superficie,
  },
  actionFilled: {
    backgroundColor: colors.azulOscuro,
  },
  actionLabel: {
    fontSize: ACTION_LABEL_SIZE,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
