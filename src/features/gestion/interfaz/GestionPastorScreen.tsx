import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { accesibilidad, colors, fontSize, radius, spacing } from '@/shared/theme';
import { AppText, Button, Card, Logo, ScreenBackground } from '@/shared/ui';

import { useGestionDelPastor } from '../datos/useGestionDelPastor';
import { getIniciales } from '../dominio/encargados';
import {
  getAvisosDelPastor,
  getDetalleDeIglesia,
  getEtiquetasDeIglesia,
  getSubtituloDelPastor,
  ordenarEncargadosDelPastor,
  type AvisoDelPastor,
  type EncargadoDelPastor,
} from '../dominio/gestionPastor';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/08-gestion-pastor.html.
const HEADER_PADDING_TOP = 22; // line 19
const HEADER_PADDING_HORIZONTAL = 20;
const HEADER_GAP = 14;
const LOGO_BOX_SIZE = 52; // line 20
const HEADER_TEXTS_GAP = 1; // line 21
const CONTENT_PADDING_TOP = 26; // line 27
const CONTENT_PADDING_BOTTOM = 24;
const CONTENT_GAP = 16;
const AVISO_GAP = 14; // line 29
const AVISO_PADDING_VERTICAL = 16;
const AVISO_PADDING_HORIZONTAL = 18;
const AVISO_ICON_BOX_SIZE = 40; // line 30
const AVISO_ICON_SIZE = 22;
const AVISO_ICON_STROKE_WIDTH = 2.2;
const AVISO_TEXTS_GAP = 3; // line 31
const PARAGRAPH_LINE_HEIGHT = 1.4; // line 33
const SECTION_GAP = 10; // line 47
const SECTION_TITLE_SIZE = 19; // line 48
const SECTION_MARGIN_HORIZONTAL = 4;
const IGLESIA_GAP = 4; // line 51
const IGLESIA_PADDING_VERTICAL = 14;
const IGLESIA_PADDING_HORIZONTAL = 18;
const ROW_GAP = 12; // line 65
const ROW_MIN_HEIGHT = 48;
const ROW_PADDING_VERTICAL = 12;
const ROW_PADDING_LEFT = 18;
const ROW_PADDING_RIGHT = 14;
const AVATAR_SIZE = 44; // line 66
const AVATAR_LABEL_SIZE = 15;
const ROW_TEXTS_GAP = 3; // line 67
const BADGE_PADDING_VERTICAL = 3; // lines 53 and 67
const BADGE_PADDING_HORIZONTAL = 10;
const BADGE_LABEL_SIZE = 13;
const CHEVRON_SIZE = 20; // line 68
const CHEVRON_STROKE_WIDTH = 2.4;
const ADD_GAP = 10; // line 74
const ADD_ICON_SIZE = 22; // line 75
const ADD_ICON_STROKE_WIDTH = 2.6;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

type GestionPastorScreenProps = {
  /** The distritos the pastor has a cargo on; almost always one. */
  distritoIds: string[];
};

/**
 * The gestion of the pastor: the iglesias of their distritos, with their
 * encargados and the eventos of the month, the notices of the iglesias without
 * encargado or without secretaria, and every encargado, which they add, edit,
 * name secretaria de iglesia or remove.
 */
export function GestionPastorScreen({ distritoIds }: GestionPastorScreenProps) {
  const router = useRouter();
  const consulta = useGestionDelPastor(distritoIds);
  const datos = consulta.data;

  const abrir = (encargado: EncargadoDelPastor) =>
    router.push({
      pathname: '/gestion/encargado/[id]',
      params: { id: encargado.cargoId, iglesia: encargado.iglesia.id },
    });

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Logo />
        </View>
        <View style={styles.headerTexts}>
          <AppText variant="tituloEncabezado" accessibilityRole="header">
            Gestión
          </AppText>
          {datos && (
            <AppText variant="subtitulo">
              {getSubtituloDelPastor(datos.distritos, datos.iglesias.length)}
            </AppText>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!datos ? (
          // States the mockup does not draw.
          <Card style={styles.message}>
            <AppText color="textoSecundario">
              {consulta.isError
                ? 'No se pudieron leer tus iglesias. Revisá la conexión y probá de nuevo.'
                : 'Cargando…'}
            </AppText>
            {consulta.isError && (
              <Button label="Reintentar" variant="secondary" onPress={() => consulta.refetch()} />
            )}
          </Card>
        ) : (
          <>
            {getAvisosDelPastor(datos.iglesias).map((aviso) => (
              <Aviso key={aviso.titulo} aviso={aviso} />
            ))}

            <View style={styles.section}>
              <AppText weight="bold" accessibilityRole="header" style={styles.sectionTitle}>
                Mis iglesias
              </AppText>
              <View style={styles.list}>
                {datos.iglesias.map((iglesia, index) => {
                  const detalle = getDetalleDeIglesia(iglesia, datos.mes);
                  return (
                    <View
                      key={iglesia.id}
                      style={[
                        styles.iglesia,
                        index < datos.iglesias.length - 1 && styles.rowDivider,
                      ]}
                    >
                      <AppText weight="bold">{iglesia.nombre}</AppText>
                      {detalle !== null && (
                        <AppText variant="secundario" color="textoSecundario">
                          {detalle}
                        </AppText>
                      )}
                      {getEtiquetasDeIglesia(iglesia).map((etiqueta) => (
                        <View key={etiqueta} style={[styles.badge, styles.badgeAviso]}>
                          <AppText weight="bold" color="avisoTexto" style={styles.badgeLabel}>
                            {etiqueta}
                          </AppText>
                        </View>
                      ))}
                    </View>
                  );
                })}
              </View>
            </View>

            {datos.encargados.length > 0 && (
              <View style={styles.section}>
                <AppText weight="bold" accessibilityRole="header" style={styles.sectionTitle}>
                  Encargados
                </AppText>
                <View style={styles.list}>
                  {ordenarEncargadosDelPastor(datos.encargados).map((encargado, index) => (
                    <FilaDeEncargado
                      key={encargado.cargoId}
                      encargado={encargado}
                      ultima={index === datos.encargados.length - 1}
                      onPress={() => abrir(encargado)}
                    />
                  ))}
                </View>
              </View>
            )}

            {datos.iglesias.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/gestion/encargado/nuevo')}
                style={({ pressed }) => [styles.add, pressed && styles.pressed]}
              >
                <Svg
                  width={ADD_ICON_SIZE}
                  height={ADD_ICON_SIZE}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={colors.textoSobreOscuro}
                  strokeWidth={ADD_ICON_STROKE_WIDTH}
                  strokeLinecap="round"
                >
                  <Path d="M12 5v14M5 12h14" />
                </Svg>
                <AppText variant="cuerpoGrande" weight="bold" color="textoSobreOscuro">
                  Agregar encargado
                </AppText>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

/** A notice of an iglesia without encargado or of the iglesias without secretaria. */
function Aviso({ aviso }: { aviso: AvisoDelPastor }) {
  return (
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
        <AppText weight="bold">{aviso.titulo}</AppText>
        <AppText variant="secundario" color="textoSecundario" style={styles.paragraph}>
          {aviso.texto}
        </AppText>
      </View>
    </View>
  );
}

type FilaDeEncargadoProps = {
  encargado: EncargadoDelPastor;
  ultima: boolean;
  onPress: () => void;
};

function FilaDeEncargado({ encargado, ultima, onPress }: FilaDeEncargadoProps) {
  const detalle = [encargado.funcion, encargado.iglesia.nombre]
    .filter((parte) => parte !== null)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre sus datos para editarlos o quitarle el cargo"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !ultima && styles.rowDivider, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        <AppText weight="bold" color="azulOscuro" style={styles.avatarLabel}>
          {getIniciales(encargado.nombre)}
        </AppText>
      </View>
      <View style={styles.rowTexts}>
        <AppText weight="bold">{encargado.nombre}</AppText>
        <AppText variant="secundario" color="textoSecundario">
          {detalle}
        </AppText>
        {encargado.esSecretaria && (
          <View style={styles.badge}>
            <AppText weight="bold" color="azulOscuro" style={styles.badgeLabel}>
              Secretaria de iglesia
            </AppText>
          </View>
        )}
      </View>
      <Svg
        width={CHEVRON_SIZE}
        height={CHEVRON_SIZE}
        viewBox="0 0 24 24"
        fill="none"
        stroke={colors.textoTenue}
        strokeWidth={CHEVRON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={styles.chevron}
      >
        <Path d="M9 6l6 6-6 6" />
      </Svg>
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
    flexShrink: 1,
    gap: HEADER_TEXTS_GAP,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  message: {
    gap: spacing.entreTarjetas,
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
    width: AVISO_ICON_BOX_SIZE,
    height: AVISO_ICON_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AVISO_ICON_BOX_SIZE / 2,
    backgroundColor: colors.avisoSuave,
  },
  avisoTexts: {
    flexShrink: 1,
    gap: AVISO_TEXTS_GAP,
  },
  paragraph: {
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  section: {
    gap: SECTION_GAP,
  },
  sectionTitle: {
    marginHorizontal: SECTION_MARGIN_HORIZONTAL,
    fontSize: SECTION_TITLE_SIZE,
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  iglesia: {
    gap: IGLESIA_GAP,
    paddingVertical: IGLESIA_PADDING_VERTICAL,
    paddingHorizontal: IGLESIA_PADDING_HORIZONTAL,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingLeft: ROW_PADDING_LEFT,
    paddingRight: ROW_PADDING_RIGHT,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.azulSuave,
  },
  avatarLabel: {
    fontSize: AVATAR_LABEL_SIZE,
  },
  rowTexts: {
    flexShrink: 1,
    gap: ROW_TEXTS_GAP,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: BADGE_PADDING_VERTICAL,
    paddingHorizontal: BADGE_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
    backgroundColor: colors.azulSuave,
  },
  badgeAviso: {
    backgroundColor: colors.avisoSuave,
  },
  badgeLabel: {
    fontSize: BADGE_LABEL_SIZE,
  },
  chevron: {
    marginLeft: 'auto',
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ADD_GAP,
    minHeight: accesibilidad.alturaBotonPrincipal,
    borderRadius: radius.boton,
    backgroundColor: colors.azulOscuro,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
