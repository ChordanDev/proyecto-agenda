import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/shared/theme';
import { AppText, Button, CalendarioIcon } from '@/shared/ui';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const BUBBLE_MAX_WIDTH = '92%'; // line 96
const BUBBLE_GAP = 10;
const BUBBLE_PADDING_VERTICAL = 14;
const BUBBLE_PADDING_HORIZONTAL = 16;
const BUBBLE_RADIUS = 20;
const BUBBLE_TAIL_RADIUS = 6;
const FALLA_BACKGROUND = '#FDE7EC';
const FALLA_COLOR = '#7A0B2B';
const FALLA_TEXT_SIZE = 16;
const FALLA_LINE_HEIGHT = 1.45;
const FALLA_BUTTON_HEIGHT = 44; // line 99
const FALLA_BUTTON_PADDING_HORIZONTAL = 16;
const FALLA_BUTTON_RADIUS = 12;
const FALLA_BUTTON_BORDER = 2;
const FALLA_BUTTON_TEXT_SIZE = 16;
const BANNER_HEIGHT = 48; // line 58
const BANNER_GAP = 10;
const BANNER_PADDING_VERTICAL = 8;
const BANNER_PADDING_HORIZONTAL = 14;
const BANNER_ICON_SIZE = 22;
const BANNER_TEXT_SIZE = 15; // line 60
const BANNER_LINE_HEIGHT = 1.35;
const LIMITE_PADDING_HORIZONTAL = 16; // line 159
const LIMITE_PADDING_BOTTOM = 14;
const LIMITE_GAP = 12; // line 160
const LIMITE_PADDING_VERTICAL = 18;
const LIMITE_TITLE_SIZE = 18; // line 161
const LIMITE_TEXT_SIZE = 16; // line 162
const PARAGRAPH_LINE_HEIGHT = 1.45;
const PARAGRAPH_COLOR = '#333333';
const CERRADO_PADDING_HORIZONTAL = 20; // line 42
const CERRADO_GAP = 14;
const ICON_CIRCLE_SIZE = 64; // line 43
const ICON_SIZE = 32;
const CERRADO_TITLE_SIZE = 22; // line 44
const CERRADO_TEXT_SIZE = 17; // line 45
const FORMULARIO_MARGIN_TOP = 8; // line 46
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

const TEXTOS = {
  'sin-conexion': {
    titulo: 'No se pudo enviar tu mensaje.',
    texto: 'Cuando vuelva la conexión, tocá Reintentar.',
  },
  caido: {
    titulo: 'El asistente no está funcionando en este momento.',
    texto:
      'Probá de nuevo en un rato. Si es urgente, cargá el evento con el formulario. Esta consulta no se cuenta.',
  },
} as const;

function BotonDeFalla({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.fallaButton, pressed && styles.pressed]}
    >
      <AppText weight="bold" color="azulOscuro" style={styles.fallaButtonLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

type FallaDeMensajeProps = {
  falla: 'sin-conexion' | 'caido';
  /** Only the last falla can be retried; null hides the button. */
  onReintentar: (() => void) | null;
  onIrAlFormulario: () => void;
};

/**
 * A pregunta that got no respuesta (estados `7g` and `7h`). Without conexion
 * it does not offer the formulario: it cannot save without one either.
 */
export function FallaDeMensaje({ falla, onReintentar, onIrAlFormulario }: FallaDeMensajeProps) {
  const { titulo, texto } = TEXTOS[falla];

  return (
    <View accessibilityRole="alert" style={styles.fallaBubble}>
      <AppText weight="bold" style={styles.fallaText}>
        {titulo}
      </AppText>
      <AppText style={styles.fallaText}>{texto}</AppText>
      {onReintentar !== null && <BotonDeFalla label="Reintentar" onPress={onReintentar} />}
      {falla === 'caido' && <BotonDeFalla label="Ir al formulario" onPress={onIrAlFormulario} />}
    </View>
  );
}

/** A cloud crossed out. */
function SinConexionIcon() {
  return (
    <Svg
      width={BANNER_ICON_SIZE}
      height={BANNER_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.azulOscuro}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2 2l20 20" />
      <Path d="M5.8 5.8A5.5 5.5 0 0 0 6.5 17H17" />
      <Path d="M9.6 4.6A6 6 0 0 1 17.6 9 4 4 0 0 1 20.7 15.6" />
    </Svg>
  );
}

/** Above the mensajes while the phone has no conexion (estado `7g`). */
export function AvisoSinConexion() {
  return (
    <View accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.banner}>
      <SinConexionIcon />
      <AppText style={styles.bannerText}>
        <AppText weight="bold" color="azulOscuro" style={styles.bannerText}>
          Sin conexión.
        </AppText>{' '}
        El chat necesita internet.
      </AppText>
    </View>
  );
}

/** In place of the cuadro de texto once the consultas of today ran out (estado `7e`). */
export function AvisoDeLimite({ onIrAlFormulario }: { onIrAlFormulario: () => void }) {
  return (
    <View style={styles.limiteContainer}>
      <View accessibilityLiveRegion="polite" style={styles.limiteCard}>
        <AppText weight="bold" style={styles.limiteTitle}>
          Llegaste al máximo de consultas de hoy
        </AppText>
        <AppText style={styles.limiteText}>
          Mañana podés volver a usar el chat. Mientras tanto, los eventos los podés cargar con el
          formulario.
        </AppText>
        <Button label="Crear evento con el formulario" onPress={onIrAlFormulario} />
      </View>
    </View>
  );
}

type ChatSinPresupuestoProps = {
  /** "1 de noviembre". */
  vuelta: string;
  onIrAlFormulario: () => void;
};

/** The whole tab once the presupuesto of the mes ran out (estado `7f`): the tab stays visible. */
export function ChatSinPresupuesto({ vuelta, onIrAlFormulario }: ChatSinPresupuestoProps) {
  return (
    <View style={styles.cerrado}>
      <View style={styles.iconCircle}>
        <CalendarioIcon color={colors.aviso} size={ICON_SIZE} />
      </View>
      <AppText weight="bold" accessibilityRole="header" style={styles.cerradoTitle}>
        El chat no está disponible este mes
      </AppText>
      <AppText style={styles.cerradoText}>
        Vuelve a funcionar el {vuelta}. Los eventos los podés cargar con el formulario.
      </AppText>
      <Button
        label="Crear evento con el formulario"
        onPress={onIrAlFormulario}
        style={styles.formulario}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallaBubble: {
    alignSelf: 'flex-start',
    maxWidth: BUBBLE_MAX_WIDTH,
    gap: BUBBLE_GAP,
    paddingVertical: BUBBLE_PADDING_VERTICAL,
    paddingHorizontal: BUBBLE_PADDING_HORIZONTAL,
    borderRadius: BUBBLE_RADIUS,
    borderBottomLeftRadius: BUBBLE_TAIL_RADIUS,
    backgroundColor: FALLA_BACKGROUND,
  },
  fallaText: {
    fontSize: FALLA_TEXT_SIZE,
    lineHeight: FALLA_TEXT_SIZE * FALLA_LINE_HEIGHT,
    color: FALLA_COLOR,
  },
  fallaButton: {
    alignSelf: 'flex-start',
    minHeight: FALLA_BUTTON_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: FALLA_BUTTON_PADDING_HORIZONTAL,
    borderRadius: FALLA_BUTTON_RADIUS,
    borderWidth: FALLA_BUTTON_BORDER,
    borderColor: colors.azulOscuro,
    backgroundColor: colors.superficie,
  },
  fallaButtonLabel: {
    fontSize: FALLA_BUTTON_TEXT_SIZE,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: BANNER_GAP,
    minHeight: BANNER_HEIGHT,
    paddingVertical: BANNER_PADDING_VERTICAL,
    paddingHorizontal: BANNER_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: colors.superficie,
  },
  bannerText: {
    flexShrink: 1,
    fontSize: BANNER_TEXT_SIZE,
    lineHeight: BANNER_TEXT_SIZE * BANNER_LINE_HEIGHT,
  },
  limiteContainer: {
    paddingHorizontal: LIMITE_PADDING_HORIZONTAL,
    paddingBottom: LIMITE_PADDING_BOTTOM,
  },
  limiteCard: {
    gap: LIMITE_GAP,
    paddingVertical: LIMITE_PADDING_VERTICAL,
    paddingHorizontal: LIMITE_PADDING_HORIZONTAL,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  limiteTitle: {
    fontSize: LIMITE_TITLE_SIZE,
  },
  limiteText: {
    fontSize: LIMITE_TEXT_SIZE,
    lineHeight: LIMITE_TEXT_SIZE * PARAGRAPH_LINE_HEIGHT,
    color: PARAGRAPH_COLOR,
  },
  cerrado: {
    flex: 1,
    justifyContent: 'center',
    gap: CERRADO_GAP,
    paddingHorizontal: CERRADO_PADDING_HORIZONTAL,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: colors.avisoSuave,
  },
  cerradoTitle: {
    fontSize: CERRADO_TITLE_SIZE,
    textAlign: 'center',
  },
  cerradoText: {
    fontSize: CERRADO_TEXT_SIZE,
    lineHeight: CERRADO_TEXT_SIZE * PARAGRAPH_LINE_HEIGHT,
    color: PARAGRAPH_COLOR,
    textAlign: 'center',
  },
  formulario: {
    marginTop: FORMULARIO_MARGIN_TOP,
  },
});
