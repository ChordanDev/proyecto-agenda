import { useRouter } from 'expo-router';
import { Fragment, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { nombrarConNivel } from '@/features/calendario/dominio/calendarioTexts';
import { categorias, colors, fontSize, radius, spacing } from '@/shared/theme';
import {
  AppText,
  BackButton,
  Button,
  Card,
  ConfirmDialog,
  DialogText,
  FormaDeEnfasis,
  ScreenBackground,
} from '@/shared/ui';

import type { EventoDetallado } from '../datos/getEvento';
import { getTipoDeError, useBorrarEvento, useBorrarFecha } from '../datos/useEscribirEvento';
import { useEvento } from '../datos/useEvento';
import { usePuedeEditar } from '../datos/usePuedeEditar';
import { useQuienMira } from '../datos/useQuienMira';
import { useQuitarEventoDeIglesia } from '../datos/useQuitarEventoDeIglesia';
import { getCategoria } from '../dominio/categoria';
import {
  getConfirmacionDeBorrarFecha,
  getHojaDeSerie,
  getVistaAbierta,
  muestraHojaDeBorrar,
  muestraHojaDeSerie,
  NOTA_DE_CAMBIOS_PROPIOS,
} from '../dominio/edicionDeFecha';
import { getMensajeDeError } from '../dominio/errorDeEscritura';
import {
  getAvisoDeBorrado,
  formatFechaFin,
  formatFechaYHora,
  getDuenioDelDetalle,
  getEnfasisDelDetalle,
  hasText,
} from '../dominio/detalleDeEvento';
import {
  getAvisoDeQuitar,
  getCompartidoDelDetalle,
  getConfirmacionDeQuitar,
  getIglesiasParaQuitar,
  getAvisoDeQuitado,
  type IglesiaSumada,
} from '../dominio/eventoCompartido';
import { formatHasta, formatRepeticionDelDetalle } from '../dominio/repeticion';
import { avisarSinConexion } from './avisarSinConexion';
import { HojaDeAlcanceDeEdicion } from './HojaDeAlcanceDeEdicion';
import { NotaDeSerie } from './NotaDeSerie';
import { REPEAT_PATHS } from './SelectorDeRepeticion';

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
const SHARED_PADDING = 18; // line 81
const SHARED_GAP = 10;
const CHIPS_GAP = 8; // line 83
const CHIP_PADDING_VERTICAL = 7; // line 84
const CHIP_PADDING_HORIZONTAL = 12;
const CHIP_SIZE = 15;
const SHARED_BY_SIZE = 15; // line 87
const SHARED_BY_LINE_HEIGHT = 1.45;
const SHARED_BY_MARGIN_TOP = 2;
const QUITADO_PADDING = 16; // line 95
const QUITADO_RADIUS = 16;
const QUITAR_HINT_SIZE = 14; // line 100
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
  const { nombreDelDuenio, fechas, vistas, duenioEnEstructura, sumadas } = detallado;
  // The date opened from the calendario, with what it changed of its own.
  const vista = getVistaAbierta(vistas, fecha);
  const evento = vista?.evento ?? detallado.evento;
  const router = useRouter();
  const puedeEditar = usePuedeEditar(duenioEnEstructura);
  const quienMira = useQuienMira();
  const borrar = useBorrarEvento(evento.id);
  const borrarFecha = useBorrarFecha(evento.id);
  // Editar or Borrar on a date of a series first asks which dates (capture 5c, 5d).
  const [hoja, setHoja] = useState<'editar' | 'borrar' | null>(null);
  const [borrandoFecha, setBorrandoFecha] = useState(false);
  const quitar = useQuitarEventoDeIglesia(evento.id);
  // The iglesia the evento was just quitado from. The detail stays and says
  // so once the evento read again confirms it (`getAvisoDeQuitado`).
  const [quitada, setQuitada] = useState<IglesiaSumada | null>(null);
  const categoria = getCategoria(evento.enfasis);
  const enfasis = getEnfasisDelDetalle(evento.enfasis);
  const duenio = getDuenioDelDetalle(evento.duenio, nombreDelDuenio);
  const fechaShown = vista?.fecha;
  const compartido =
    quienMira === undefined
      ? null
      : getCompartidoDelDetalle(quienMira, duenioEnEstructura, duenio.nombre, sumadas);
  const paraQuitar =
    quienMira === undefined ? [] : getIglesiasParaQuitar(quienMira, duenioEnEstructura, sumadas);
  const avisoDeQuitado =
    quitada === null ? null : getAvisoDeQuitado(quitada, duenioEnEstructura, sumadas);
  const hasActions = puedeEditar || paraQuitar.length > 0 || avisoDeQuitado !== null;

  // A date of a series asks first: "only this date" or "the whole series".
  const conHoja = muestraHojaDeSerie(evento, puedeEditar) && vista !== undefined;
  const hojaDeSerie =
    conHoja && hoja !== null && fechas[0] !== undefined
      ? getHojaDeSerie(hoja, vista.fecha, evento.repeticion, fechas[0])
      : null;
  const confirmacionDeBorrarFecha =
    vista === undefined ? null : getConfirmacionDeBorrarFecha(vista.fecha);

  const editarSerie = () => {
    router.push({ pathname: '/evento/editar/[id]', params: { id: evento.id } });
  };

  // The form of a date is anchored on the date of the series it comes from.
  const editarFecha = () => {
    if (vista !== undefined) {
      router.push({
        pathname: '/evento/editar/[id]',
        params: { id: evento.id, fecha: vista.fechaOriginal },
      });
    }
  };

  // Deleting always asks first.
  const askBorrarSerie = () => {
    Alert.alert('¿Borrar este evento?', getAvisoDeBorrado(evento.repeticion, vistas.length), [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () =>
          borrar.mutate(undefined, {
            onSuccess: onDeleted,
            onError: (error) =>
              Alert.alert('No se pudo borrar', getMensajeDeError(getTipoDeError(error))),
          }),
      },
    ]);
  };

  const askQuitar = (iglesia: IglesiaSumada, nombreDeIglesia: string) => {
    if (!avisarSinConexion()) {
      return;
    }
    const { titulo, mensaje } = getConfirmacionDeQuitar(nombreDeIglesia, duenio.nombre);
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () =>
          quitar.mutate(iglesia.id, {
            // The evento was already read again (`useQuitarEventoDeIglesia`).
            onSuccess: () => setQuitada(iglesia),
            onError: (error) =>
              Alert.alert('No se pudo quitar', getMensajeDeError(getTipoDeError(error))),
          }),
      },
    ]);
  };

  const rows: { key: string; icon: ReactNode; label: string; value: string; detail?: string }[] = [
    ...(fechaShown === undefined
      ? []
      : [
          {
            key: 'fecha',
            icon: <CalendarIcon />,
            label: 'Fecha y hora',
            value: formatFechaYHora(fechaShown, evento.hora),
            ...(evento.fechaFin !== null && {
              detail: formatFechaFin(fechaShown, evento.fechaFin),
            }),
          },
        ]),
    ...(evento.repeticion !== 'ninguna' && evento.finDeSerie !== null && fechas[0] !== undefined
      ? [
          {
            key: 'repeticion',
            icon: <RepeatIcon />,
            label: 'Se repite',
            // A series repeats from its first date.
            value: formatRepeticionDelDetalle(evento.repeticion, fechas[0]),
            detail: formatHasta(evento.finDeSerie),
          },
        ]
      : []),
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

      {vista?.tieneCambios && <NotaDeSerie role="text">{NOTA_DE_CAMBIOS_PROPIOS}</NotaDeSerie>}

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

      {compartido !== null && (
        <View style={styles.shared}>
          <AppText variant="label" color="textoTenue" accessibilityRole="header">
            Compartido con
          </AppText>
          <View style={styles.chips}>
            {compartido.iglesias.map((iglesia) => (
              <View key={iglesia.id} style={[styles.chip, iglesia.esMia && styles.chipMia]}>
                <AppText
                  weight={iglesia.esMia ? 'bold' : 'regular'}
                  color={iglesia.esMia ? 'textoSobreOscuro' : 'texto'}
                  style={styles.chipText}
                >
                  {iglesia.esMia ? `${iglesia.nombre} (tu iglesia)` : iglesia.nombre}
                </AppText>
              </View>
            ))}
          </View>
          {compartido.compartidoPor !== null && (
            <AppText color="textoSecundario" style={styles.sharedBy}>
              Compartido por{' '}
              <AppText weight="bold" color="texto" style={styles.sharedBy}>
                {compartido.compartidoPor}
              </AppText>
              .
            </AppText>
          )}
        </View>
      )}

      {/* The actions stay at the bottom of the screen, as in capture 5b. */}
      {hasActions && <View style={styles.spacer} />}

      {avisoDeQuitado !== null && (
        <View accessibilityRole="alert" style={styles.quitado}>
          <AppText weight="bold" style={styles.quitadoText}>
            {avisoDeQuitado}
          </AppText>
        </View>
      )}

      {paraQuitar.map((iglesia) => {
        const nombreDeIglesia = nombrarConNivel('iglesia', iglesia.nombre);

        return (
          <View key={iglesia.id} style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={quitar.isPending}
              onPress={() => askQuitar(iglesia, nombreDeIglesia)}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <AppText variant="cuerpoGrande" weight="bold" color="peligro">
                {quitar.isPending
                  ? 'Quitando…'
                  : paraQuitar.length === 1
                    ? 'Quitar de mi calendario'
                    : `Quitar de ${nombreDeIglesia}`}
              </AppText>
            </Pressable>
            <AppText color="textoSecundario" style={styles.quitarHint}>
              {getAvisoDeQuitar(nombreDeIglesia)}
            </AppText>
          </View>
        );
      })}

      {puedeEditar && (
        <>
          <View style={styles.actions}>
            <Button
              label="Editar"
              onPress={() => {
                if (!avisarSinConexion()) {
                  return;
                }
                if (conHoja) {
                  setHoja('editar');
                } else {
                  editarSerie();
                }
              }}
            />
            <Pressable
              accessibilityRole="button"
              disabled={borrar.isPending || borrarFecha.isPending}
              onPress={() => {
                if (!avisarSinConexion()) {
                  return;
                }
                if (conHoja && muestraHojaDeBorrar(evento, puedeEditar, vistas.length)) {
                  setHoja('borrar');
                } else {
                  askBorrarSerie();
                }
              }}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <AppText variant="cuerpoGrande" weight="bold" color="peligro">
                {borrar.isPending || borrarFecha.isPending ? 'Borrando…' : 'Borrar'}
              </AppText>
            </Pressable>
          </View>
        </>
      )}

      {hojaDeSerie !== null && (
        <HojaDeAlcanceDeEdicion
          visible={hoja !== null}
          pregunta={hojaDeSerie.pregunta}
          recordatorio={hojaDeSerie.recordatorio}
          soloEsta={hojaDeSerie.soloEsta}
          onSoloEsta={() => {
            setHoja(null);
            if (hoja === 'editar') {
              editarFecha();
            } else {
              setBorrandoFecha(true);
            }
          }}
          onTodaLaSerie={() => {
            setHoja(null);
            if (hoja === 'editar') {
              editarSerie();
            } else {
              askBorrarSerie();
            }
          }}
          onClose={() => setHoja(null)}
        />
      )}

      {borrandoFecha && confirmacionDeBorrarFecha !== null && (
        <ConfirmDialog
          title={confirmacionDeBorrarFecha.titulo}
          confirmLabel={confirmacionDeBorrarFecha.boton}
          tone="danger"
          busy={borrarFecha.isPending}
          onConfirm={() => {
            if (vista === undefined || !avisarSinConexion()) {
              return;
            }
            borrarFecha.mutate(vista.fechaOriginal, {
              onSuccess: () => {
                setBorrandoFecha(false);
                onDeleted();
              },
              onError: (error) => {
                setBorrandoFecha(false);
                Alert.alert('No se pudo borrar', getMensajeDeError(getTipoDeError(error)));
              },
            });
          }}
          onCancel={() => setBorrandoFecha(false)}
        >
          <DialogText>{confirmacionDeBorrarFecha.mensaje}</DialogText>
        </ConfirmDialog>
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

/** Line 51. */
function RepeatIcon() {
  return (
    <RowIcon>
      {REPEAT_PATHS.map((d) => (
        <Path key={d} d={d} />
      ))}
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
  shared: {
    gap: SHARED_GAP,
    padding: SHARED_PADDING,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CHIPS_GAP,
  },
  chip: {
    paddingVertical: CHIP_PADDING_VERTICAL,
    paddingHorizontal: CHIP_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
    backgroundColor: colors.campo,
  },
  chipMia: {
    backgroundColor: colors.azulOscuro,
  },
  chipText: {
    fontSize: CHIP_SIZE,
  },
  sharedBy: {
    marginTop: SHARED_BY_MARGIN_TOP,
    fontSize: SHARED_BY_SIZE,
    lineHeight: SHARED_BY_SIZE * SHARED_BY_LINE_HEIGHT,
  },
  quitado: {
    padding: QUITADO_PADDING,
    borderRadius: QUITADO_RADIUS,
    backgroundColor: colors.superficie,
  },
  quitadoText: {
    textAlign: 'center',
  },
  quitarHint: {
    fontSize: QUITAR_HINT_SIZE,
    textAlign: 'center',
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
