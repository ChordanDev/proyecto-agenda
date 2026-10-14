import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import type { Duenio } from '../dominio/evento';
import {
  getDuenioId,
  getOpcionDeDuenio,
  type OpcionDeDuenio,
  type OpcionesDeDuenio,
} from '../dominio/opcionesDeDuenio';
import { HojaInferior } from './HojaInferior';
import { RadioMark } from './RadioMark';

// Layout of capture 6b, which the theme has no tokens for.
const GROUP_TITLE_MARGIN_TOP = 12;
const GROUP_TITLE_MARGIN_BOTTOM = 4;
const ROW_MIN_HEIGHT = 72;
const ROW_PADDING_VERTICAL = 12;
const ROW_GAP = 14;
const ROW_TEXTS_GAP = 2;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type HojaDeDuenioProps = {
  visible: boolean;
  opciones: OpcionesDeDuenio;
  selected: Duenio | null;
  onSelect: (duenio: Duenio) => void;
  onClose: () => void;
};

/** "¿De quién es el evento?": the levels the cargos cover, grouped as in capture 6b. */
export function HojaDeDuenio({
  visible,
  opciones,
  selected,
  onSelect,
  onClose,
}: HojaDeDuenioProps) {
  const selectedOpcion = getOpcionDeDuenio(opciones, selected);
  const groups: { title: string; opciones: OpcionDeDuenio[] }[] = [
    { title: 'Asociación', opciones: opciones.asociaciones },
    {
      title: opciones.distritos.length === 1 ? 'Distrito' : 'Distritos',
      opciones: opciones.distritos,
    },
    { title: opciones.iglesias.length === 1 ? 'Iglesia' : 'Iglesias', opciones: opciones.iglesias },
  ].filter((group) => group.opciones.length > 0);

  return (
    <HojaInferior
      visible={visible}
      title="¿De quién es el evento?"
      intro="El evento se ve en todas las iglesias del dueño que elijas."
      onClose={onClose}
    >
      <View accessibilityRole="radiogroup">
        {groups.map((group) => (
          <Fragment key={group.title}>
            <AppText
              variant="label"
              color="textoTenue"
              accessibilityRole="header"
              style={styles.groupTitle}
            >
              {group.title}
            </AppText>
            {group.opciones.map((opcion) => {
              const checked = opcion === selectedOpcion;

              return (
                <Pressable
                  key={getDuenioId(opcion.duenio)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  accessibilityLabel={`${opcion.nombre}, ${opcion.detalle}`}
                  onPress={() => onSelect(opcion.duenio)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <View style={styles.texts}>
                    <AppText variant="cuerpoGrande" weight="bold">
                      {opcion.nombre}
                    </AppText>
                    <AppText color="textoSecundario">{opcion.detalle}</AppText>
                  </View>
                  <RadioMark checked={checked} />
                </Pressable>
              );
            })}
          </Fragment>
        ))}
      </View>
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    marginTop: GROUP_TITLE_MARGIN_TOP,
    marginBottom: GROUP_TITLE_MARGIN_BOTTOM,
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
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  texts: {
    flex: 1,
    gap: ROW_TEXTS_GAP,
  },
});
