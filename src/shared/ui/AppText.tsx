import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fonts, fontSize } from '@/shared/theme';

// Values the theme has no token for, read from the approved mockups.
const LABEL_SIZE = 16; // field labels and card headings (02-login.html, line 33)
const TITLE_LINE_HEIGHT = 1.15; // 02-login.html, line 27
const BODY_LINE_HEIGHT = 1.4; // 06-crear-evento.html, line 49
const LARGE_BODY_LINE_HEIGHT = 1.5; // 01-bienvenida.html, line 35
const LEMAS_LETTER_SPACING = 0.06; // in em (01-bienvenida.html, line 30)

export type TextVariant = keyof typeof fontSize | 'label' | 'lemas';

type AppTextProps = TextProps & {
  variant?: TextVariant;
  /** Overrides the color of the variant. */
  color?: keyof typeof colors;
  /** Overrides the weight of the variant. */
  weight?: 'regular' | 'semibold' | 'bold';
};

/** Text in one of the styles of the design. Every text of the app goes through it. */
export function AppText({ variant = 'cuerpo', color, weight, style, ...rest }: AppTextProps) {
  return (
    <Text
      style={[
        styles[variant],
        color && { color: colors[color] },
        weight && { fontFamily: fonts[weight] },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  tituloPantalla: {
    fontFamily: fonts.bold,
    fontSize: fontSize.tituloPantalla,
    lineHeight: fontSize.tituloPantalla * TITLE_LINE_HEIGHT,
    color: colors.texto,
  },
  tituloEncabezado: {
    fontFamily: fonts.bold,
    fontSize: fontSize.tituloEncabezado,
    color: colors.textoTitulo,
  },
  subtitulo: {
    fontFamily: fonts.regular,
    fontSize: fontSize.subtitulo,
    color: colors.textoTitulo,
  },
  cuerpoGrande: {
    fontFamily: fonts.regular,
    fontSize: fontSize.cuerpoGrande,
    lineHeight: fontSize.cuerpoGrande * LARGE_BODY_LINE_HEIGHT,
    color: colors.texto,
  },
  cuerpo: {
    fontFamily: fonts.regular,
    fontSize: fontSize.cuerpo,
    lineHeight: fontSize.cuerpo * BODY_LINE_HEIGHT,
    color: colors.texto,
  },
  secundario: {
    fontFamily: fonts.regular,
    fontSize: fontSize.secundario,
    lineHeight: fontSize.secundario * BODY_LINE_HEIGHT,
    color: colors.textoSecundario,
  },
  chico: {
    fontFamily: fonts.regular,
    fontSize: fontSize.chico,
    color: colors.textoSecundario,
  },
  nav: {
    fontFamily: fonts.semibold,
    fontSize: fontSize.nav,
    color: colors.textoSobreOscuro,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: LABEL_SIZE,
    color: colors.texto,
  },
  // The row of lemas of the welcome screen: Oswald, uppercase.
  lemas: {
    fontFamily: fonts.lemas,
    fontSize: fontSize.secundario,
    letterSpacing: fontSize.secundario * LEMAS_LETTER_SPACING,
    textTransform: 'uppercase',
    color: colors.textoSecundario,
  },
});
