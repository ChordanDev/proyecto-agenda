import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HojaInferior } from '@/features/eventos/interfaz/HojaInferior';
import { RadioMark } from '@/features/eventos/interfaz/RadioMark';
import { colors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

// Layout of the sheet of capture 9h, which the theme has no tokens for.
const ROW_MIN_HEIGHT = 60;
const ROW_PADDING_VERTICAL = 12;
const ROW_GAP = 14;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type HojaDeDistritoProps = {
  visible: boolean;
  title: string;
  distritos: readonly { id: string; nombre: string }[];
  selected: string | null;
  onSelect: (distritoId: string) => void;
  onClose: () => void;
  /** Under the list: the aviso of the move and its button, in "Sacar". */
  children?: ReactNode;
};

/** The distritos of the asociacion, to choose the one of an iglesia. */
export function HojaDeDistrito({
  visible,
  title,
  distritos,
  selected,
  onSelect,
  onClose,
  children,
}: HojaDeDistritoProps) {
  return (
    <HojaInferior visible={visible} title={title} onClose={onClose}>
      <View accessibilityRole="radiogroup">
        {distritos.map((distrito) => {
          const checked = distrito.id === selected;
          return (
            <Pressable
              key={distrito.id}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={distrito.nombre}
              onPress={() => onSelect(distrito.id)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <RadioMark checked={checked} />
              <AppText variant="cuerpoGrande" weight={checked ? 'bold' : 'regular'}>
                {distrito.nombre}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {children}
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
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
});
