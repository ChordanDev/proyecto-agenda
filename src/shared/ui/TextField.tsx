import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { accesibilidad, colors, fonts, fontSize, radius } from '@/shared/theme';

import { AppText } from './AppText';

// Spacing of the fields in the approved mockups (02-login.html, lines 32-34).
const LABEL_GAP = 8;
const HORIZONTAL_PADDING = 16;

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Adds "(opcional)" after the label. */
  optional?: boolean;
};

/** A text input with its label above, as the fields inside the cards of the design. */
export function TextField({ label, optional = false, ...rest }: TextFieldProps) {
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
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textoTenue}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: LABEL_GAP,
  },
  input: {
    minHeight: accesibilidad.alturaCampo,
    paddingHorizontal: HORIZONTAL_PADDING,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
    fontFamily: fonts.regular,
    fontSize: fontSize.cuerpoGrande,
    color: colors.texto,
  },
});
