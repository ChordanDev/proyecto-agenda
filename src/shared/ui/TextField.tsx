import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { accesibilidad, colors, fonts, fontSize, radius } from '@/shared/theme';

import { AppText } from './AppText';

// Spacing of the fields in the approved mockups (02-login.html, lines 32-34).
const LABEL_GAP = 8;
const HORIZONTAL_PADDING = 16;
// The field with something at its right end (02-login.html, line 38): the box
// holds the input and the trailing element, with less padding on that side.
const TRAILING_PADDING = 6;
const TRAILING_GAP = 8;

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Adds "(opcional)" after the label. */
  optional?: boolean;
  /** Something inside the field, at its right end: the "Mostrar" button of a password. */
  trailing?: ReactNode;
};

/** A text input with its label above, as the fields inside the cards of the design. */
export function TextField({ label, optional = false, trailing, ...rest }: TextFieldProps) {
  return (
    <View style={styles.field}>
      <AppText variant="label">
        {label}
        {optional ? (
          <AppText variant="label" weight="regular" color="textoTenue">
            {' (opcional)'}
          </AppText>
        ) : null}
      </AppText>
      {trailing === undefined ? (
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textoTenue}
          style={[styles.box, styles.input]}
          {...rest}
        />
      ) : (
        <View style={[styles.box, styles.withTrailing]}>
          <TextInput
            accessibilityLabel={label}
            placeholderTextColor={colors.textoTenue}
            style={[styles.input, styles.inputInBox]}
            {...rest}
          />
          {trailing}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: LABEL_GAP,
  },
  box: {
    minHeight: accesibilidad.alturaCampo,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  input: {
    paddingHorizontal: HORIZONTAL_PADDING,
    fontFamily: fonts.regular,
    fontSize: fontSize.cuerpoGrande,
    color: colors.texto,
  },
  withTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: TRAILING_PADDING,
    gap: TRAILING_GAP,
  },
  inputInBox: {
    flex: 1,
    minWidth: 0,
    minHeight: accesibilidad.alturaCampo,
    paddingRight: 0,
  },
});
