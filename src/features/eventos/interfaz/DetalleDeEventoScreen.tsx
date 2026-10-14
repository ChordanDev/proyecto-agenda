import { useRouter } from 'expo-router';
import { Fragment, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { categorias, colors, fontSize, radius, spacing } from '@/shared/theme';
import { AppText, BackButton, Button, Card, FormaDeEnfasis, ScreenBackground } from '@/shared/ui';

import type { EventoDetallado } from '../datos/getEvento';
import { getTipoDeError, useBorrarEvento } from '../datos/useEscribirEvento';
import { useEvento } from '../datos/useEvento';
import { usePuedeEditar } from '../datos/usePuedeEditar';
import { getCategoria } from '../dominio/categoria';
import { getMensajeDeError } from '../dominio/errorDeEscritura';
import { seEditaEnElFormulario } from '../dominio/formularioDeEvento';
import {
  formatFechaYHora,
  getDuenioDelDetalle,
  getEnfasisDelDetalle,
  hasText,
} from '../dominio/detalleDeEvento';
import { avisarSinConexion } from './avisarSinConexion';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/05-detalle-evento.html.
const HEADER_PADDING_TOP = 22; // line 19
const HEADER_GAP = 12;
const CONTENT_PADDING_TOP = 30; // line 24
const CONTENT_PADDING_BOTTOM = 32;
const TOP_CARD_PADDING_VERTICAL = 20; // line 26
const TOP_CARD_PADDING_HORIZONTAL = 18;
const ENFASIS_GAP = 12; // line 27
const ENFASIS_BOX_SIZE = 44; // line 28
const ENFASIS_BOX_RADIUS = 12;
const ENFASIS_SHAPE_SIZE = 24; // line 29
const ENFASIS_TEXTS_GAP = 1; // line 31
const ROW_PADDING_VERTICAL = 16; // line 43
const ROW_PADDING_HORIZONTAL = 18;
const ROW_GAP = 14;
const ROW_ICON_SIZE = 24; // line 44
const ROW_ICON_STROKE_WIDTH = 2;
const ROW_TEXTS_GAP = 2; // line 45
const DESCRIPTION_PADDING = 18; // line 69
const DESCRIPTION_GAP = 8;
const DESCRIPTION_LINE_HEIGHT = 1.5; // line 71
const ACTIONS_GAP = 8; // line 104
const DELETE_HEIGHT = 56; // line 109
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;
// The texts of the states the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;

// The bottom navigation is not on this screen.
const SAFE_AREA_EDGES = ['top', 'left', 'right', 'bottom'] as const;

type DetalleDeEventoScreenProps = {
  id: string;
  /**
   * The date the evento was opened from: a series has several. Without it, or
   * with one the evento does not have, the first one is shown.
   */
  fecha: string | undefined;
};

/** Everything about an evento, read only. Empty fields are left out. */
export function DetalleDeEventoScreen({ id, fecha }: DetalleDeEventoScreenProps) {
  const router = useRouter();
  const { data, isError, isFetching, refetch } = useEvento(id);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/calendario');
    }
  };

  const renderContent = () => {
    if (data) {
      return <Detalle detallado={data} fecha={fecha} onDeleted={goBack} />;
    }

    // States the mockup does not draw.
    if (data === null) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            Este evento ya no existe.
          </AppText>
          <Button label="Volver al calendario" variant="secondary" onPress={goBack} />
        </Card>
      );
    }

    if (isError && !isFetching) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            No se pudo cargar el evento. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
        </Card>
      );
    }

    return (
      <Card>
        <AppText color="textoSecundario" style={styles.paragraph}>
          Cargando el evento…
        </AppText>
      </Card>
    );
  };

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <BackButton onPress={goBack} />
        <AppText variant="tituloEncabezado" accessibilityRole="header">
          Evento
        </AppText>
      </View>
      <ScrollView contentContainerStyle={styles.content}>{renderContent()}</ScrollView>
    </ScreenBackground>
  );
}

type DetalleProps = {
  detallado: EventoDetallado;
  fecha: string | undefined;
  onDeleted: () => void;
};

function Detalle({ detallado, fecha, onDeleted }: DetalleProps) {
  const { evento, nombreDelDuenio, fechas } = detallado;
  const router = useRouter();
  const puedeEditar = usePuedeEditar(detallado.duenioEnEstructura);
  const borrar = useBorrarEvento(evento.id);
  const categoria = getCategoria(evento.enfasis);
  const enfasis = getEnfasisDelDetalle(evento.enfasis);
  const duenio = getDuenioDelDetalle(evento.duenio, nombreDelDuenio);
  const fechaShown = fecha !== undefined && fechas.includes(fecha) ? fecha : fechas[0];

  const rows: { key: string; icon: ReactNode; label: string; value: string; detail?: string }[] = [
    ...(fechaShown === undefined
      ? []
      : [
          {
            key: 'fecha',
            icon: <CalendarIcon />,
            label: 'Fecha y hora',
            value: formatFechaYHora(fechaShown, evento.hora),
          },
        ]),
    ...(hasText(evento.lugar)
      ? [{ key: 'lugar', icon: <PlaceIcon />, label: 'Lugar', value: evento.lugar }]
      : []),
    {
      key: 'duenio',
      icon: <DuenioIcon />,
      label: 'Evento de',
      value: duenio.nombre,
      detail: duenio.seVe,
    },
  ];

  return (
    <>
      <View style={styles.topCard}>
        <View style={styles.enfasis}>
          <View
            style={[styles.enfasisBox, { backgroundColor: categorias[categoria].fondoSuave }]}
            // The texts beside it already name the enfasis.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <FormaDeEnfasis categoria={categoria} size={ENFASIS_SHAPE_SIZE} />
          </View>
          <View style={styles.enfasisTexts}>
            <AppText weight="bold">{enfasis.lema}</AppText>
            {enfasis.nombre !== null && <AppText variant="chico">{enfasis.nombre}</AppText>}
          </View>
        </View>
        <AppText variant="tituloPantalla" accessibilityRole="header">
          {evento.titulo}
        </AppText>
      </View>

      <View style={styles.rowsCard}>
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {index > 0 && <View style={styles.separator} />}
            <View
              accessible
              accessibilityLabel={[row.label, row.value, row.detail].filter(Boolean).join(', ')}
              style={styles.row}
            >
              {row.icon}
              <View style={styles.rowTexts}>
                <AppText variant="chico" color="textoTenue">
                  {row.label}
                </AppText>
                <AppText weight="bold">{row.value}</AppText>
                {row.detail !== undefined && <AppText variant="secundario">{row.detail}</AppText>}
              </View>
            </View>
          </Fragment>
        ))}
      </View>

      {hasText(evento.descripcion) && (
        <View style={styles.description}>
          <AppText variant="label" color="textoTenue" accessibilityRole="header">
            Descripción
          </AppText>
          <AppText style={styles.descriptionText}>{evento.descripcion}</AppText>
        </View>
      )}

      {puedeEditar && (
        <>
          {/* The actions stay at the bottom of the screen, as in capture 5b. */}
          <View style={styles.spacer} />
          <View style={styles.actions}>
            {seEditaEnElFormulario(evento) && (
              <Button
                label="Editar"
                onPress={() => {
                  if (avisarSinConexion()) {
                    router.push({ pathname: '/evento/editar/[id]', params: { id: evento.id } });
                  }
                }}
              />
            )}
            <Pressable
              accessibilityRole="button"
              disabled={borrar.isPending}
              onPress={() => {
                if (!avisarSinConexion()) {
                  return;
                }
                // Deleting always asks first.
                Alert.alert(
                  '¿Borrar este evento?',
                  'Se borra de todos los calendarios donde aparece. No se puede deshacer.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Borrar',
                      style: 'destructive',
                      onPress: () =>
                        borrar.mutate(undefined, {
                          onSuccess: onDeleted,
                          onError: (error) =>
                            Alert.alert(
                              'No se pudo borrar',
                              getMensajeDeError(getTipoDeError(error)),
                            ),
                        }),
                    },
                  ],
                );
              }}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <AppText variant="cuerpoGrande" weight="bold" color="peligro">
                {borrar.isPending ? 'Borrando…' : 'Borrar'}
              </AppText>
            </Pressable>
          </View>
        </>
      )}
    </>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <Svg
      width={ROW_ICON_SIZE}
      height={ROW_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.azulMarca}
      strokeWidth={ROW_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

/** Line 44. */
function CalendarIcon() {
  return (
    <RowIcon>
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </RowIcon>
  );
}

/** Line 57. */
function PlaceIcon() {
  return (
    <RowIcon>
      <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <Circle cx={12} cy={9.5} r={2.5} />
    </RowIcon>
  );
}

/** Line 63. */
function DuenioIcon() {
  return (
    <RowIcon>
      <Path d="M12 2v4M10 4h4" />
      <Path d="M5 21V11l7-5 7 5v10" />
      <Path d="M10 21v-5h4v5" />
      <Path d="M3 21h18" />
    </RowIcon>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  spacer: {
    flex: 1,
  },
  actions: {
    gap: ACTIONS_GAP,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: DELETE_HEIGHT,
    borderRadius: radius.boton,
    backgroundColor: colors.superficie,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  content: {
    flexGrow: 1,
    gap: spacing.entreTarjetas,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
  topCard: {
    gap: spacing.entreTarjetas,
    paddingVertical: TOP_CARD_PADDING_VERTICAL,
    paddingHorizontal: TOP_CARD_PADDING_HORIZONTAL,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  enfasis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ENFASIS_GAP,
  },
  enfasisBox: {
    width: ENFASIS_BOX_SIZE,
    height: ENFASIS_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ENFASIS_BOX_RADIUS,
  },
  enfasisTexts: {
    flex: 1,
    gap: ENFASIS_TEXTS_GAP,
  },
  rowsCard: {
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  separator: {
    height: 1,
    marginHorizontal: ROW_PADDING_HORIZONTAL,
    backgroundColor: colors.separador,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingHorizontal: ROW_PADDING_HORIZONTAL,
  },
  rowTexts: {
    flex: 1,
    gap: ROW_TEXTS_GAP,
  },
  description: {
    gap: DESCRIPTION_GAP,
    padding: DESCRIPTION_PADDING,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  descriptionText: {
    fontSize: fontSize.cuerpo,
    lineHeight: fontSize.cuerpo * DESCRIPTION_LINE_HEIGHT,
  },
});
