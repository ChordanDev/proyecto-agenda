import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fontSize, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { getAvisoDeDistritosSinPastor, type DistritoDelAdmin } from '../dominio/distritosSinPastor';
import { getEtiquetaDePastores, getTextoDeIglesias } from '../dominio/estructuraDelAdmin';
import { BotonAgregar, Fila, Lista } from './ListaDelAdmin';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/09-gestion-admin.html.
const BUTTONS_GAP = 10; // line 42
const AVISO_GAP = 14; // line 55
const AVISO_PADDING_VERTICAL = 16;
const AVISO_PADDING_HORIZONTAL = 18;
const AVISO_ICON_BOX = 40; // line 56
const AVISO_ICON_SIZE = 22;
const AVISO_ICON_STROKE_WIDTH = 2.2;
const AVISO_TEXTS_GAP = 3; // line 57
const AVISO_TITLE_SIZE = 17; // line 58
const PARAGRAPH_LINE_HEIGHT = 1.4; // line 59
const BADGE_PADDING_VERTICAL = 3; // line 70
const BADGE_PADDING_HORIZONTAL = 10;
const BADGE_LABEL_SIZE = 13;

type DistritosTabProps = {
  /** Ordered by nombre. */
  distritos: DistritoDelAdmin[];
};

/** The tab Distritos: each distrito with its iglesias and its pastor, and those without one. */
export function DistritosTab({ distritos }: DistritosTabProps) {
  const router = useRouter();
  const aviso = getAvisoDeDistritosSinPastor(distritos);

  return (
    <>
      <View style={styles.buttons}>
        <BotonAgregar
          label="Nuevo distrito"
          onPress={() => router.push('/gestion/distrito/nuevo')}
          style={styles.button}
        />
        <BotonAgregar
          label="Nueva iglesia"
          onPress={() => router.push('/gestion/iglesia/nueva')}
          style={styles.button}
        />
      </View>

      {aviso !== null && (
        <View accessibilityRole="alert" style={styles.aviso}>
          <View style={styles.avisoIcon}>
            <Svg
              width={AVISO_ICON_SIZE}
              height={AVISO_ICON_SIZE}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.aviso}
              strokeWidth={AVISO_ICON_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M12 3l9.5 17h-19L12 3z" />
              <Path d="M12 10v4.5M12 17.5v.5" />
            </Svg>
          </View>
          <View style={styles.avisoTexts}>
            <AppText weight="bold" style={styles.avisoTitle}>
              {aviso.titulo}
            </AppText>
            <AppText variant="secundario" color="textoSecundario" style={styles.paragraph}>
              {aviso.texto}
            </AppText>
          </View>
        </View>
      )}

      {distritos.length > 0 && (
        <Lista>
          {distritos.map((distrito, index) => {
            const pastores = getEtiquetaDePastores(distrito.pastores);
            return (
              <Fila
                key={distrito.id}
                titulo={distrito.nombre}
                ultima={index === distritos.length - 1}
                accessibilityHint="Abre el distrito para editarlo"
                onPress={() =>
                  router.push({ pathname: '/gestion/distrito/[id]', params: { id: distrito.id } })
                }
              >
                <AppText variant="secundario" color="textoSecundario">
                  {getTextoDeIglesias(distrito.cantidadDeIglesias)}
                </AppText>
                {pastores === null ? (
                  <View style={styles.badge}>
                    <AppText weight="bold" style={styles.badgeLabel}>
                      Sin pastor
                    </AppText>
                  </View>
                ) : (
                  <AppText variant="secundario" weight="semibold" color="azulOscuro">
                    {pastores}
                  </AppText>
                )}
              </Fila>
            );
          })}
        </Lista>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  buttons: {
    flexDirection: 'row',
    gap: BUTTONS_GAP,
  },
  button: {
    flex: 1,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AVISO_GAP,
    paddingVertical: AVISO_PADDING_VERTICAL,
    paddingHorizontal: AVISO_PADDING_HORIZONTAL,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  avisoIcon: {
    width: AVISO_ICON_BOX,
    height: AVISO_ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AVISO_ICON_BOX / 2,
    backgroundColor: colors.avisoSuave,
  },
  avisoTexts: {
    flexShrink: 1,
    gap: AVISO_TEXTS_GAP,
  },
  avisoTitle: {
    fontSize: AVISO_TITLE_SIZE,
  },
  paragraph: {
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: BADGE_PADDING_VERTICAL,
    paddingHorizontal: BADGE_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
    backgroundColor: colors.avisoSuave,
  },
  badgeLabel: {
    fontSize: BADGE_LABEL_SIZE,
    color: colors.avisoTexto,
  },
});
