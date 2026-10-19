import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { accesibilidad, colors, radius, spacing } from '@/shared/theme';
import { AppText, Button, Card, Logo, ScreenBackground } from '@/shared/ui';

import { useEncargadosDeIglesia } from '../datos/useEncargadosDeIglesia';
import {
  getIniciales,
  getSubtituloDeIglesia,
  ordenarEncargados,
  puedeEditarEncargado,
  type Encargado,
} from '../dominio/encargados';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/08b-gestion-secretaria.html.
const HEADER_PADDING_TOP = 22; // line 17
const HEADER_PADDING_HORIZONTAL = 20;
const HEADER_GAP = 14;
const LOGO_BOX_SIZE = 52; // line 18
const HEADER_TEXTS_GAP = 1; // line 19
const CONTENT_PADDING_TOP = 26; // line 25
const CONTENT_PADDING_BOTTOM = 24;
const CONTENT_GAP = 16;
const SECTION_GAP = 10; // line 27
const SECTION_TITLE_SIZE = 19; // line 28
const SECTION_MARGIN_HORIZONTAL = 4;
const ROW_GAP = 12; // line 31
const ROW_MIN_HEIGHT = 48;
const ROW_PADDING_VERTICAL = 12;
const ROW_PADDING_LEFT = 18;
const ROW_PADDING_RIGHT = 14;
const AVATAR_SIZE = 44; // line 32
const AVATAR_LABEL_SIZE = 15;
const ROW_TEXTS_GAP = 3; // line 33
const BADGE_PADDING_VERTICAL = 3; // line 36
const BADGE_PADDING_HORIZONTAL = 10;
const BADGE_LABEL_SIZE = 13;
const CHEVRON_SIZE = 20; // line 38
const CHEVRON_STROKE_WIDTH = 2.4;
const ADD_GAP = 10; // line 45
const ADD_ICON_SIZE = 22; // line 46
const ADD_ICON_STROKE_WIDTH = 2.6;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

type GestionSecretariaScreenProps = {
  /** The iglesias she is secretaria de iglesia of; almost always one. */
  iglesiaIds: string[];
  /** The usuario signed in, marked "(vos)" in the list. */
  usuarioId: string | null;
};

/**
 * The gestion of the secretaria de iglesia: the encargados of her iglesia,
 * which she adds, edits and removes. The secretarias show without a way in:
 * only the pastor or the admin names or removes them.
 */
export function GestionSecretariaScreen({ iglesiaIds, usuarioId }: GestionSecretariaScreenProps) {
  const unaIglesia = iglesiaIds.length === 1;
  const primera = useEncargadosDeIglesia(iglesiaIds[0]);
  const subtitulo =
    unaIglesia && primera.data
      ? getSubtituloDeIglesia(primera.data.iglesia.nombre, primera.data.encargados.length)
      : null;

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
          {subtitulo !== null && <AppText variant="subtitulo">{subtitulo}</AppText>}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {iglesiaIds.map((iglesiaId) => (
          <EncargadosDeIglesia
            key={iglesiaId}
            iglesiaId={iglesiaId}
            usuarioId={usuarioId}
            conNombreDeIglesia={!unaIglesia}
          />
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

type EncargadosDeIglesiaProps = {
  iglesiaId: string;
  usuarioId: string | null;
  /** With several iglesias, each section is titled with its nombre. */
  conNombreDeIglesia: boolean;
};

function EncargadosDeIglesia({
  iglesiaId,
  usuarioId,
  conNombreDeIglesia,
}: EncargadosDeIglesiaProps) {
  const router = useRouter();
  const consulta = useEncargadosDeIglesia(iglesiaId);

  // States the mockup does not draw.
  if (!consulta.data) {
    const sinIglesia = consulta.data === null;
    return (
      <Card style={styles.message}>
        <AppText color="textoSecundario">
          {sinIglesia
            ? 'Esta iglesia ya no existe.'
            : consulta.isError
              ? 'No se pudieron leer los encargados. Revisá la conexión y probá de nuevo.'
              : 'Cargando…'}
        </AppText>
        {consulta.isError && (
          <Button label="Reintentar" variant="secondary" onPress={() => consulta.refetch()} />
        )}
      </Card>
    );
  }

  const { iglesia, encargados } = consulta.data;
  const ordenados = ordenarEncargados(encargados, usuarioId);

  const abrir = (encargado: Encargado) =>
    router.push({
      pathname: '/gestion/encargado/[id]',
      params: { id: encargado.cargoId, iglesia: iglesia.id },
    });

  return (
    <>
      <View style={styles.section}>
        <AppText weight="bold" accessibilityRole="header" style={styles.sectionTitle}>
          {conNombreDeIglesia ? iglesia.nombre : 'Encargados'}
        </AppText>
        <View style={styles.list}>
          {ordenados.map((encargado, index) => (
            <FilaDeEncargado
              key={encargado.cargoId}
              encargado={encargado}
              esUsuario={encargado.usuarioId === usuarioId}
              ultima={index === ordenados.length - 1}
              onPress={puedeEditarEncargado(encargado) ? () => abrir(encargado) : undefined}
            />
          ))}
        </View>
        <AppText variant="secundario" color="textoSecundario" style={styles.note}>
          Las secretarias de iglesia las nombra el pastor.
        </AppText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          conNombreDeIglesia ? `Agregar encargado en ${iglesia.nombre}` : 'Agregar encargado'
        }
        onPress={() =>
          router.push({ pathname: '/gestion/encargado/nuevo', params: { iglesia: iglesia.id } })
        }
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
    </>
  );
}

type FilaDeEncargadoProps = {
  encargado: Encargado;
  esUsuario: boolean;
  ultima: boolean;
  /** Undefined when it cannot be opened: a secretaria de iglesia. */
  onPress: (() => void) | undefined;
};

function FilaDeEncargado({ encargado, esUsuario, ultima, onPress }: FilaDeEncargadoProps) {
  const contenido = (
    <>
      <View style={styles.avatar}>
        <AppText weight="bold" color="azulOscuro" style={styles.avatarLabel}>
          {getIniciales(encargado.nombre)}
        </AppText>
      </View>
      <View style={styles.rowTexts}>
        <AppText weight="bold">
          {encargado.nombre}
          {esUsuario && (
            <AppText weight="regular" color="textoSecundario">
              {' (vos)'}
            </AppText>
          )}
        </AppText>
        {encargado.funcion !== null && (
          <AppText variant="secundario" color="textoSecundario">
            {encargado.funcion}
          </AppText>
        )}
        {encargado.esSecretaria && (
          <View style={styles.badge}>
            <AppText weight="bold" color="azulOscuro" style={styles.badgeLabel}>
              Secretaria de iglesia
            </AppText>
          </View>
        )}
      </View>
      {onPress !== undefined && (
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
      )}
    </>
  );

  const rowStyle = [styles.row, !ultima && styles.rowDivider];

  if (onPress === undefined) {
    return <View style={rowStyle}>{contenido}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Abre sus datos para editarlos o quitarle el cargo"
      onPress={onPress}
      style={({ pressed }) => [rowStyle, pressed && styles.pressed]}
    >
      {contenido}
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
  badgeLabel: {
    fontSize: BADGE_LABEL_SIZE,
  },
  chevron: {
    marginLeft: 'auto',
  },
  note: {
    marginHorizontal: SECTION_MARGIN_HORIZONTAL,
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
