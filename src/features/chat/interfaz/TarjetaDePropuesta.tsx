import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { categorias, colors, radius } from '@/shared/theme';
import { AppText, Button, FormaDeEnfasis } from '@/shared/ui';

import type { EstadoDePropuesta } from '../dominio/conversacion';
import type { TarjetaDePropuesta as Tarjeta } from '../dominio/propuesta';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const CARD_WIDTH = '92%'; // line 109
const GAP = 10;
const NOTE_PADDING_HORIZONTAL = 4; // line 110
const NOTE_SIZE = 17;
const NOTE_LINE_HEIGHT = 1.4;
const FOOT_SIZE = 14; // line 151
const ENFASIS_GAP = 12; // line 112
const ENFASIS_BOX_SIZE = 40; // line 113
const ENFASIS_BOX_RADIUS = 12;
const ENFASIS_SHAPE_SIZE = 22;
const LEMA_SIZE = 15; // line 118
const ENFASIS_SIZE = 13; // line 119
const BODY_GAP = 8; // line 122
const BODY_PADDING_TOP = 12;
const TITULO_SIZE = 20; // line 123
const ROW_GAP = 10; // line 124
const ROW_SIZE = 16;
const ROW_LINE_HEIGHT = 1.35;
const ROW_DETAIL_SIZE = 15;
const ROW_ICON_SIZE = 18;
const ROW_ICON_STROKE_WIDTH = 2.2;
const ROW_ICON_MARGIN_TOP = 2;
const ERROR_PADDING_VERTICAL = 12; // line 136
const ERROR_PADDING_HORIZONTAL = 14;
const ERROR_SIZE = 15;
const ERROR_LINE_HEIGHT = 1.4;
const ERROR_BACKGROUND = '#FDE7EC';
const ERROR_COLOR = '#7A0B2B';
const GUARDADO_PADDING_VERTICAL = 6; // line 144
const GUARDADO_PADDING_HORIZONTAL = 14;
const GUARDADO_SIZE = 16;
const GUARDADO_COLOR = '#1E7A45';
const GUARDADO_ICON_SIZE = 18;
const GUARDADO_ICON_STROKE_WIDTH = 2.8;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type TarjetaDePropuestaProps = {
  tarjeta: Tarjeta;
  estado: EstadoDePropuesta;
  /** Why the last Confirmar failed; null when it did not. */
  error: string | null;
  onConfirmar: () => void;
  onEditar: () => void;
  onVerEvento: () => void;
};

/**
 * The vista previa of the evento the asistente proposes. Nothing is saved
 * until Confirmar; once saved, the buttons give way to "Guardado" and
 * "Ver evento", so it cannot be confirmed twice.
 */
export function TarjetaDePropuesta({
  tarjeta,
  estado,
  error,
  onConfirmar,
  onEditar,
  onVerEvento,
}: TarjetaDePropuestaProps) {
  const pendiente = estado !== 'guardado';
  const guardando = estado === 'guardando';

  return (
    <View style={styles.container}>
      {pendiente && <AppText style={styles.note}>Revisá los datos antes de guardarlo:</AppText>}

      <View style={styles.card}>
        <View style={styles.enfasis}>
          <View
            style={[
              styles.enfasisBox,
              { backgroundColor: categorias[tarjeta.categoria].fondoSuave },
            ]}
            // The texts beside it already name the enfasis.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <FormaDeEnfasis categoria={tarjeta.categoria} size={ENFASIS_SHAPE_SIZE} />
          </View>
          <View>
            <AppText weight="bold" style={styles.lema}>
              {tarjeta.lema}
            </AppText>
            {tarjeta.enfasis !== null && (
              <AppText color="textoSecundario" style={styles.enfasisNombre}>
                {tarjeta.enfasis}
              </AppText>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <AppText weight="bold" style={styles.titulo}>
            {tarjeta.titulo}
          </AppText>
          <Row icon={<ClockIcon />} value={tarjeta.cuando} detail={tarjeta.cuandoDetalle} />
          {tarjeta.repeticion !== null && (
            <Row
              icon={<RepeatIcon />}
              value={tarjeta.repeticion.como}
              detail={tarjeta.repeticion.hasta}
            />
          )}
          {tarjeta.lugar !== null && <Row icon={<PlaceIcon />} value={tarjeta.lugar} />}
          <Row icon={<DuenioIcon />} value={tarjeta.duenio} detail={tarjeta.seVe} />
        </View>

        {pendiente && error !== null && (
          <View accessibilityRole="alert" style={styles.error}>
            <AppText style={styles.errorText}>
              <AppText weight="bold" style={styles.errorText}>
                No se pudo guardar.
              </AppText>{' '}
              {error}
            </AppText>
          </View>
        )}

        {pendiente ? (
          <View style={styles.buttons}>
            <Button
              label="Editar"
              variant="secondary"
              disabled={guardando}
              onPress={onEditar}
              style={styles.button}
            />
            <Button
              label={guardando ? 'Guardando…' : error === null ? 'Confirmar' : 'Reintentar'}
              disabled={guardando}
              onPress={onConfirmar}
              style={[styles.button, styles.confirmar]}
            />
          </View>
        ) : (
          <View accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.guardado}>
            <View style={styles.guardadoLabel}>
              <CheckIcon />
              <AppText weight="bold" style={styles.guardadoText}>
                Guardado
              </AppText>
            </View>
            <Pressable
              accessibilityRole="link"
              onPress={onVerEvento}
              style={({ pressed }) => [styles.verEvento, pressed && styles.pressed]}
            >
              <AppText weight="bold" color="azulOscuro" style={styles.verEventoText}>
                Ver evento
              </AppText>
            </Pressable>
          </View>
        )}
      </View>

      {pendiente && (
        <AppText color="textoSecundario" style={styles.foot}>
          No se guarda hasta que lo confirmes.
        </AppText>
      )}
    </View>
  );
}

function Row({ icon, value, detail }: { icon: ReactNode; value: string; detail?: string | null }) {
  return (
    <View
      accessible
      accessibilityLabel={[value, detail].filter(Boolean).join(', ')}
      style={styles.row}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowTexts}>
        <AppText style={styles.rowText}>{value}</AppText>
        {detail != null && detail !== '' && (
          <AppText color="textoSecundario" style={styles.rowDetail}>
            {detail}
          </AppText>
        )}
      </View>
    </View>
  );
}

function RowIcon({ children }: { children: ReactNode }) {
  return (
    <Svg
      width={ROW_ICON_SIZE}
      height={ROW_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.azulOscuro}
      strokeWidth={ROW_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </Svg>
  );
}

/** Line 124. */
function ClockIcon() {
  return (
    <RowIcon>
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M12 7.5V12l3 2" />
    </RowIcon>
  );
}

/** Line 127. */
function RepeatIcon() {
  return (
    <RowIcon>
      <Path d="M4 11a8 8 0 0 1 14-4.5L20 8M20 4v4h-4M20 13a8 8 0 0 1-14 4.5L4 16M4 20v-4h4" />
    </RowIcon>
  );
}

/** Line 129. */
function PlaceIcon() {
  return (
    <RowIcon>
      <Path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <Circle cx={12} cy={9.5} r={2.5} />
    </RowIcon>
  );
}

/** Line 131. */
function DuenioIcon() {
  return (
    <RowIcon>
      <Path d="M4 11l8-7 8 7v9H4z" />
      <Path d="M10 20v-5h4v5" />
    </RowIcon>
  );
}

/** Line 145. */
function CheckIcon() {
  return (
    <Svg
      width={GUARDADO_ICON_SIZE}
      height={GUARDADO_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={GUARDADO_COLOR}
      strokeWidth={GUARDADO_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    width: CARD_WIDTH,
    gap: GAP,
  },
  note: {
    paddingHorizontal: NOTE_PADDING_HORIZONTAL,
    fontSize: NOTE_SIZE,
    lineHeight: NOTE_SIZE * NOTE_LINE_HEIGHT,
  },
  foot: {
    paddingHorizontal: NOTE_PADDING_HORIZONTAL,
    fontSize: FOOT_SIZE,
  },
  card: {
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
    overflow: 'hidden',
  },
  enfasis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ENFASIS_GAP,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  enfasisBox: {
    width: ENFASIS_BOX_SIZE,
    height: ENFASIS_BOX_SIZE,
    borderRadius: ENFASIS_BOX_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lema: {
    fontSize: LEMA_SIZE,
  },
  enfasisNombre: {
    fontSize: ENFASIS_SIZE,
  },
  body: {
    gap: BODY_GAP,
    paddingTop: BODY_PADDING_TOP,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  titulo: {
    fontSize: TITULO_SIZE,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ROW_GAP,
  },
  rowIcon: {
    marginTop: ROW_ICON_MARGIN_TOP,
  },
  rowTexts: {
    flexShrink: 1,
  },
  rowText: {
    fontSize: ROW_SIZE,
    lineHeight: ROW_SIZE * ROW_LINE_HEIGHT,
  },
  rowDetail: {
    fontSize: ROW_DETAIL_SIZE,
    lineHeight: ROW_DETAIL_SIZE * ROW_LINE_HEIGHT,
  },
  error: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: ERROR_PADDING_VERTICAL,
    paddingHorizontal: ERROR_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: ERROR_BACKGROUND,
  },
  errorText: {
    fontSize: ERROR_SIZE,
    lineHeight: ERROR_SIZE * ERROR_LINE_HEIGHT,
    color: ERROR_COLOR,
  },
  buttons: {
    flexDirection: 'row',
    gap: GAP,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  button: {
    flex: 1,
  },
  confirmar: {
    paddingHorizontal: 0,
  },
  guardado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: GAP,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: GUARDADO_PADDING_VERTICAL,
    paddingHorizontal: GUARDADO_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: colors.exitoSuave,
  },
  guardadoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  guardadoText: {
    fontSize: GUARDADO_SIZE,
    color: GUARDADO_COLOR,
  },
  verEvento: {
    minHeight: 44,
    justifyContent: 'center',
  },
  verEventoText: {
    fontSize: GUARDADO_SIZE,
    textDecorationLine: 'underline',
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
