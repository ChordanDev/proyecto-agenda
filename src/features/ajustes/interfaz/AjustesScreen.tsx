import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/theme';
import { AppText, Button, Logo, ScreenBackground } from '@/shared/ui';

import { useMiIglesia, type EstadoDeMiIglesia } from '../datos/useMiIglesia';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/10-ajustes.html.
const HEADER_PADDING_TOP = 22; // line 19
const HEADER_PADDING_HORIZONTAL = 20;
const HEADER_GAP = 14;
const LOGO_BOX_SIZE = 52; // line 20
const HEADER_TEXTS_GAP = 1; // line 21
const CONTENT_PADDING_TOP = 26; // line 27
const CONTENT_PADDING_BOTTOM = 24;
const CONTENT_GAP = 22;
const SECTION_GAP = 10; // line 29
const SECTION_TITLE_SIZE = 17; // line 30
const SECTION_TITLE_MARGIN_HORIZONTAL = 4;
const CARD_PADDING_VERTICAL = 16; // line 31
const CARD_PADDING_HORIZONTAL = 18;
const CARD_ROW_GAP = 12;
const CARD_TEXTS_GAP = 2; // line 32
const CHANGE_HEIGHT = 46; // line 36
const CHANGE_LABEL_SIZE = 16;
// The text of the states the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

/** Ajustes: the iglesia elegida of this phone, which can be changed from here. */
export function AjustesScreen() {
  const router = useRouter();
  const miIglesia = useMiIglesia();

  // The same buscador as the first time; once another iglesia is stored, it
  // goes to the calendario, which shows the new one.
  const changeIglesia = () =>
    router.push({ pathname: '/choose-iglesia', params: { desde: 'ajustes' } });

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Logo />
        </View>
        <View style={styles.headerTexts}>
          <AppText variant="tituloEncabezado" accessibilityRole="header">
            Ajustes
          </AppText>
          {miIglesia.estado === 'lista' && (
            <AppText variant="subtitulo">{miIglesia.iglesia.nombre}</AppText>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Mi iglesia">
          <MiIglesiaCard miIglesia={miIglesia} onChange={changeIglesia} />
        </Section>
      </ScrollView>
    </ScreenBackground>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

type MiIglesiaCardProps = {
  miIglesia: EstadoDeMiIglesia;
  onChange: () => void;
};

function MiIglesiaCard({ miIglesia, onChange }: MiIglesiaCardProps) {
  switch (miIglesia.estado) {
    case 'lista':
      return (
        <View style={[styles.card, styles.cardRow]}>
          <View style={styles.cardTexts}>
            <AppText variant="cuerpoGrande" weight="bold">
              {miIglesia.iglesia.nombre}
            </AppText>
            <AppText variant="secundario">{miIglesia.iglesia.distrito}</AppText>
          </View>
          <ChangeButton
            label="Cambiar"
            accessibilityLabel="Cambiar de iglesia"
            onPress={onChange}
          />
        </View>
      );
    // States the mockup does not draw.
    case 'sin-iglesia':
      return (
        <View style={[styles.card, styles.cardRow]}>
          <AppText color="textoSecundario" style={[styles.paragraph, styles.cardTexts]}>
            Todavía no elegiste tu iglesia.
          </AppText>
          <ChangeButton label="Elegir" accessibilityLabel="Elegir mi iglesia" onPress={onChange} />
        </View>
      );
    case 'error':
      return (
        <View style={[styles.card, styles.cardColumn]}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            No se pudo cargar tu iglesia. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button label="Reintentar" variant="secondary" onPress={miIglesia.refetch} />
        </View>
      );
    case 'cargando':
      return (
        <View style={styles.card}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            Cargando tu iglesia…
          </AppText>
        </View>
      );
  }
}

type ChangeButtonProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

/** The small button at the right of the card ("Cambiar"), smaller than `Button`. */
function ChangeButton({ label, accessibilityLabel, onPress }: ChangeButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
    >
      <AppText weight="bold" color="azulOscuro" style={styles.changeLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: HEADER_PADDING_HORIZONTAL,
  },
  logoBox: {
    width: LOGO_BOX_SIZE,
    height: LOGO_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
    gap: HEADER_TEXTS_GAP,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  section: {
    gap: SECTION_GAP,
  },
  sectionTitle: {
    fontSize: SECTION_TITLE_SIZE,
    marginHorizontal: SECTION_TITLE_MARGIN_HORIZONTAL,
  },
  card: {
    paddingVertical: CARD_PADDING_VERTICAL,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CARD_ROW_GAP,
  },
  cardColumn: {
    gap: spacing.entreTarjetas,
  },
  cardTexts: {
    flex: 1,
    gap: CARD_TEXTS_GAP,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
  changeButton: {
    minHeight: CHANGE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: radius.campo,
    backgroundColor: colors.azulSuave,
  },
  changeLabel: {
    fontSize: CHANGE_LABEL_SIZE,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
