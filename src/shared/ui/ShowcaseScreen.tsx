import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { categorias, colors, radius, spacing } from '@/shared/theme';

import { AppText, type TextVariant } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { FormaDeEnfasis, type Categoria } from './FormaDeEnfasis';
import { ScreenBackground } from './ScreenBackground';
import { TextField } from './TextField';

// Layout of the marks in the approved mockups: the row of the welcome screen
// (01-bienvenida.html, lines 23-24) and the list rows (06-crear-evento.html,
// lines 56-57).
const LARGE_MARK_SIZE = 52;
const LARGE_MARK_GAP = 22;
const MARK_SLOT = 26;
const ROW_GAP = 14;
const ROW_MIN_HEIGHT = 60;

const allCategorias = Object.keys(categorias) as Categoria[];
// The row of the welcome screen shows the four énfasis, without the actividad regular.
const enfasis = allCategorias.filter((categoria) => categoria !== 'R');

const textSamples: Record<Exclude<TextVariant, 'nav'>, string> = {
  tituloPantalla: 'Título de pantalla',
  tituloEncabezado: 'Título del encabezado',
  subtitulo: 'Subtítulo del encabezado',
  cuerpoGrande: 'Texto de cuerpo grande',
  cuerpo: 'Texto de cuerpo',
  secundario: 'Texto secundario',
  chico: 'Texto chico',
  label: 'Etiqueta de campo',
  lemas: enfasis.map((categoria) => categorias[categoria].lema).join(' · '),
};
const textVariants = Object.keys(textSamples) as (keyof typeof textSamples)[];

/**
 * Development-only screen that exhibits the base components of the design
 * together, to compare them with the approved mockups. It is not one of the
 * screens of the app.
 */
export function ShowcaseScreen() {
  const [titulo, setTitulo] = useState('Culto joven');
  const [descripcion, setDescripcion] = useState('');

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="tituloEncabezado" accessibilityRole="header">
          Componentes base
        </AppText>

        <Card style={styles.section}>
          <SectionTitle>Énfasis y actividad regular</SectionTitle>
          <View style={styles.largeMarks}>
            {enfasis.map((categoria) => (
              <FormaDeEnfasis key={categoria} categoria={categoria} size={LARGE_MARK_SIZE} />
            ))}
          </View>
          <View>
            {allCategorias.map((categoria) => (
              <View key={categoria} style={styles.row}>
                <View style={styles.markSlot}>
                  <FormaDeEnfasis categoria={categoria} />
                </View>
                <View style={styles.rowText}>
                  <AppText weight="bold">{categorias[categoria].lema}</AppText>
                  <AppText variant="chico">{categorias[categoria].nombre}</AppText>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionTitle>Textos</SectionTitle>
          {textVariants.map((variant) => (
            <AppText key={variant} variant={variant}>
              {textSamples[variant]}
            </AppText>
          ))}
          {/* The text of the navigation bar is white: it needs the dark blue behind. */}
          <View style={styles.onDark}>
            <AppText variant="nav">Texto de la barra de navegación</AppText>
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionTitle>Botones</SectionTitle>
          <Button label="Botón principal" />
          <Button label="Botón secundario" variant="secondary" />
          <Button label="Principal deshabilitado" disabled />
          <Button label="Secundario deshabilitado" variant="secondary" disabled />
        </Card>

        <Card style={styles.section}>
          <SectionTitle>Campo de texto</SectionTitle>
          <TextField label="Título" value={titulo} onChangeText={setTitulo} />
          <TextField
            label="Descripción"
            optional
            placeholder="Texto de ayuda"
            value={descripcion}
            onChangeText={setDescripcion}
          />
        </Card>

        <Card style={styles.section}>
          <SectionTitle>Tarjeta</SectionTitle>
          <AppText>El contenido de cada pantalla va dentro de tarjetas blancas como esta.</AppText>
          <AppText variant="secundario">Fondo blanco, esquinas redondeadas y sin sombra.</AppText>
        </Card>
      </ScrollView>
    </ScreenBackground>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="label" color="textoTenue" accessibilityRole="header">
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.entreTarjetas,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingVertical: spacing.tarjetaPadding,
  },
  section: {
    gap: spacing.entreTarjetas,
  },
  largeMarks: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: LARGE_MARK_GAP,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
  },
  markSlot: {
    width: MARK_SLOT,
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  onDark: {
    alignSelf: 'flex-start',
    padding: spacing.tarjetaPadding,
    borderRadius: radius.campo,
    backgroundColor: colors.azulOscuro,
  },
});
