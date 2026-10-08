import { useRef } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { accesibilidad, colors, fonts, fontSize, radius } from '@/shared/theme';

// The search field of the approved mockups (03-elegir-iglesia.html, lines 32-34).
const HORIZONTAL_PADDING = 16;
const ICON_GAP = 10;
const ICON_SIZE = 22;
const ICON_STROKE_WIDTH = 2.2;

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  /** The mockups hide the label of the field: screen readers still get it. */
  accessibilityLabel: string;
};

/** A white search input with a magnifier, placed straight on the background of a screen. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
}: SearchFieldProps) {
  const input = useRef<TextInput>(null);

  return (
    // The whole field takes the touch, the magnifier included. Screen readers
    // only get the input.
    <Pressable accessible={false} onPress={() => input.current?.focus()} style={styles.field}>
      <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
        <Circle
          cx={11}
          cy={11}
          r={7}
          stroke={colors.textoSecundario}
          strokeWidth={ICON_STROKE_WIDTH}
        />
        <Path
          d="M20 20l-4-4"
          stroke={colors.textoSecundario}
          strokeWidth={ICON_STROKE_WIDTH}
          strokeLinecap="round"
        />
      </Svg>
      <TextInput
        ref={input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textoSecundario}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={styles.input}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ICON_GAP,
    minHeight: accesibilidad.alturaCampo,
    paddingHorizontal: HORIZONTAL_PADDING,
    // Rounded like a button (14), not like the fields inside a card (12).
    borderRadius: radius.boton,
    backgroundColor: colors.superficie,
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
});
