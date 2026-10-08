import { useRouter } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { categorias } from '@/shared/theme';
import {
  AppText,
  Button,
  FormaDeEnfasis,
  Logo,
  ScreenBackground,
  type Categoria,
} from '@/shared/ui';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/01-bienvenida.html.
const PADDING_TOP = 48; // line 17
const PADDING_HORIZONTAL = 24;
const PADDING_BOTTOM = 40;
const LOGO_BOX_SIZE = 104; // line 19
const LOGO_BOX_RADIUS = 28;
const LOGO_BOX_SHADOW = { offsetX: 0, offsetY: 8, blurRadius: 24, color: 'rgba(22,46,74,0.18)' };
const LOGO_HEIGHT = 66; // line 20
const MARKS_MARGIN_TOP = 64; // line 23
const MARK_GAP = 22;
const MARK_SIZE = 52; // line 24
const LEMAS_MARGIN_TOP = 14; // line 29
const LEMAS_GAP = 10;
const TEXTS_MARGIN_TOP = 56; // line 33
const TEXTS_GAP = 12;
const TITLE_SIZE = 34; // line 34
const TITLE_LINE_HEIGHT = 1.12;
const PARAGRAPH_MAX_WIDTH = 300; // line 35
const BUTTONS_GAP = 12; // line 40

// The four énfasis, without the actividad regular.
const enfasis = ['S', 'F', 'I', 'H'] as const satisfies readonly Categoria[];
const lemas = enfasis.map((categoria) => categorias[categoria].lema);

/**
 * First screen for whoever has no iglesia elegida and no session: it says what
 * the first step is and leaves a way to the login for encargados and pastores.
 */
export function BienvenidaScreen() {
  const router = useRouter();

  return (
    <ScreenBackground>
      {/* It only scrolls on a phone too short to hold everything. */}
      <ScrollView contentContainerStyle={styles.content} alwaysBounceVertical={false}>
        <View style={styles.logoBox}>
          <Logo height={LOGO_HEIGHT} />
        </View>

        {/* Decorative here: the lemas below already say it in words. */}
        <View
          style={styles.marks}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {enfasis.map((categoria) => (
            <FormaDeEnfasis
              key={categoria}
              categoria={categoria}
              size={MARK_SIZE}
              outlined={false}
            />
          ))}
        </View>
        <View style={styles.lemas} accessible accessibilityLabel={lemas.join(', ')}>
          {lemas.map((lema, index) => (
            <Fragment key={lema}>
              {index > 0 && <AppText variant="lemas">·</AppText>}
              <AppText variant="lemas">{lema}</AppText>
            </Fragment>
          ))}
        </View>

        <View style={styles.texts}>
          <AppText variant="tituloPantalla" accessibilityRole="header" style={styles.title}>
            Agenda de iglesia
          </AppText>
          <AppText variant="cuerpoGrande" color="textoSecundario" style={styles.paragraph}>
            Los eventos de tu iglesia, tu distrito y la asociación, siempre a mano.
          </AppText>
        </View>

        <View style={styles.spacer} />

        <View style={styles.buttons}>
          <Button
            label="Elegir mi iglesia"
            size="large"
            onPress={() => router.push('/choose-iglesia')}
          />
          <Button
            label="Soy encargado o pastor"
            variant="text"
            onPress={() => router.push('/login')}
          />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: PADDING_TOP,
    paddingHorizontal: PADDING_HORIZONTAL,
    paddingBottom: PADDING_BOTTOM,
  },
  logoBox: {
    width: LOGO_BOX_SIZE,
    height: LOGO_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: LOGO_BOX_RADIUS,
    boxShadow: [LOGO_BOX_SHADOW],
  },
  marks: {
    flexDirection: 'row',
    // Every mark is as tall as the row but the square, which sits centered in it.
    alignItems: 'center',
    gap: MARK_GAP,
    marginTop: MARKS_MARGIN_TOP,
  },
  lemas: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: LEMAS_GAP,
    marginTop: LEMAS_MARGIN_TOP,
  },
  texts: {
    alignItems: 'center',
    gap: TEXTS_GAP,
    marginTop: TEXTS_MARGIN_TOP,
  },
  title: {
    fontSize: TITLE_SIZE,
    lineHeight: TITLE_SIZE * TITLE_LINE_HEIGHT,
    textAlign: 'center',
  },
  paragraph: {
    maxWidth: PARAGRAPH_MAX_WIDTH,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  buttons: {
    alignSelf: 'stretch',
    gap: BUTTONS_GAP,
  },
});
