import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { getLineasDeEventos, type MensajeDeChat as Mensaje } from '../dominio/conversacion';
import { getPreguntaDeHora, getTarjetaDePropuesta } from '../dominio/propuesta';
import type { Reporte } from '../dominio/reporte';
import { FallaDeMensaje } from './EstadoDeFalla';
import { EventoDeRespuesta } from './EventoDeRespuesta';
import { TarjetaDePropuesta } from './TarjetaDePropuesta';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const PREGUNTA_MAX_WIDTH = '80%'; // line 66
const PREGUNTA_PADDING_VERTICAL = 12;
const PREGUNTA_PADDING_HORIZONTAL = 16;
const RESPUESTA_MAX_WIDTH = '92%'; // line 70
const RESPUESTA_GAP = 10;
const RESPUESTA_PADDING_VERTICAL = 14;
const RESPUESTA_PADDING_HORIZONTAL = 16;
const BUBBLE_RADIUS = 20;
const BUBBLE_TAIL_RADIUS = 6;
const TEXT_SIZE = 17;
const TEXT_LINE_HEIGHT = 1.4;
const REPORTE_MIN_HEIGHT = 44; // line 87
const REPORTE_MARGIN_TOP = -8;
const REPORTE_PADDING_HORIZONTAL = 6;
const REPORTE_GAP = 6;
const REPORTE_SIZE = 15;
const REPORTE_COLOR = '#4A4A4A';
const REPORTE_ICON_SIZE = 18;
const REPORTE_ICON_STROKE_WIDTH = 2.2;
const ENVIADO_COLOR = '#1E7A45'; // line 90
const ENVIADO_ICON_STROKE_WIDTH = 2.8;
const ERROR_COLOR = '#7A0B2B'; // the error of TarjetaDePropuesta
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type MensajeDeChatProps = {
  mensaje: Mensaje;
  /** For the falla that can be retried; null on any other mensaje. */
  onReintentar: (() => void) | null;
  onIrAlFormulario: () => void;
  /** Confirmar, Editar and "Ver evento" of a propuesta, by its id. */
  onConfirmar: (id: string) => void;
  onEditar: (id: string) => void;
  onVerEvento: (id: string) => void;
  /** "Reportar respuesta" of a respuesta, by its id: it opens the hoja of motivos. */
  onReportar: (id: string) => void;
};

/** A mensaje of the conversacion: a pregunta, a respuesta, a falla or a propuesta. */
export function MensajeDeChat({
  mensaje,
  onReintentar,
  onIrAlFormulario,
  onConfirmar,
  onEditar,
  onVerEvento,
  onReportar,
}: MensajeDeChatProps) {
  switch (mensaje.tipo) {
    case 'pregunta':
      return (
        <View style={[styles.bubble, styles.pregunta]}>
          <AppText color="textoSobreOscuro" style={styles.text}>
            {mensaje.texto}
          </AppText>
        </View>
      );
    case 'respuesta':
      return (
        <>
          <View style={[styles.bubble, styles.respuesta]}>
            <AppText style={styles.text}>{mensaje.texto}</AppText>
            {getLineasDeEventos(mensaje.eventos).map((linea) => (
              <EventoDeRespuesta key={linea.clave} linea={linea} />
            ))}
          </View>
          <ReportarRespuesta reporte={mensaje.reporte} onReportar={() => onReportar(mensaje.id)} />
        </>
      );
    case 'falla':
      return (
        <FallaDeMensaje
          falla={mensaje.falla}
          onReintentar={onReintentar}
          onIrAlFormulario={onIrAlFormulario}
        />
      );
    case 'propuesta':
      return (
        <>
          {/* The eventos found in the same respuesta go first, as in any respuesta. */}
          {mensaje.eventos.length > 0 && (
            <View style={[styles.bubble, styles.respuesta]}>
              <AppText style={styles.text}>{mensaje.texto}</AppText>
              {getLineasDeEventos(mensaje.eventos).map((linea) => (
                <EventoDeRespuesta key={linea.clave} linea={linea} />
              ))}
            </View>
          )}
          <TarjetaDePropuesta
            tarjeta={getTarjetaDePropuesta(mensaje.borrador)}
            estado={mensaje.estado}
            error={mensaje.error}
            preguntaDeHora={getPreguntaDeHora(mensaje.borrador)}
            onConfirmar={() => onConfirmar(mensaje.id)}
            onEditar={() => onEditar(mensaje.id)}
            onVerEvento={() => onVerEvento(mensaje.id)}
          />
          {/* The issue asks for it on each respuesta: a propuesta is one too. */}
          <ReportarRespuesta reporte={mensaje.reporte} onReportar={() => onReportar(mensaje.id)} />
        </>
      );
  }
}

/**
 * Under a respuesta: "Reportar respuesta" until it is reported, then "Reporte
 * enviado. Gracias.", which cannot be reported again (captures 7 and 7j).
 */
function ReportarRespuesta({ reporte, onReportar }: { reporte: Reporte; onReportar: () => void }) {
  if (reporte.estado === 'enviado') {
    return (
      <View
        accessibilityRole="text"
        accessibilityLiveRegion="polite"
        style={[styles.reporteBox, styles.reporte]}
      >
        <ReporteIcon
          d="M5 12.5l4.5 4.5L19 7.5"
          color={ENVIADO_COLOR}
          strokeWidth={ENVIADO_ICON_STROKE_WIDTH}
        />
        <AppText weight="semibold" style={[styles.reporteText, styles.enviado]}>
          Reporte enviado. Gracias.
        </AppText>
      </View>
    );
  }

  const enviando = reporte.estado === 'enviando';
  return (
    <View style={styles.reporteBox}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: enviando, busy: enviando }}
        disabled={enviando}
        onPress={onReportar}
        style={({ pressed }) => [styles.reporte, pressed && styles.pressed]}
      >
        <ReporteIcon
          d="M5 21V4M5 4h11l-2 4 2 4H5"
          color={REPORTE_COLOR}
          strokeWidth={REPORTE_ICON_STROKE_WIDTH}
        />
        <AppText weight="semibold" style={[styles.reporteText, styles.reportar]}>
          {enviando ? 'Enviando reporte…' : 'Reportar respuesta'}
        </AppText>
      </Pressable>
      {/* The mockups draw no failed reporte: the error of the card, in its color. */}
      {reporte.error !== null && !enviando && (
        <AppText accessibilityLiveRegion="polite" style={[styles.reporteText, styles.error]}>
          {reporte.error}
        </AppText>
      )}
    </View>
  );
}

function ReporteIcon({ d, color, strokeWidth }: { d: string; color: string; strokeWidth: number }) {
  return (
    <Svg width={REPORTE_ICON_SIZE} height={REPORTE_ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d={d}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** While the asistente looks for the respuesta. The mockups draw no such state. */
export function Buscando() {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.bubble, styles.respuesta, styles.buscando]}
    >
      <AppText color="textoSecundario" style={styles.text}>
        Buscando…
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    borderRadius: BUBBLE_RADIUS,
  },
  pregunta: {
    alignSelf: 'flex-end',
    maxWidth: PREGUNTA_MAX_WIDTH,
    paddingVertical: PREGUNTA_PADDING_VERTICAL,
    paddingHorizontal: PREGUNTA_PADDING_HORIZONTAL,
    borderBottomRightRadius: BUBBLE_TAIL_RADIUS,
    backgroundColor: colors.azulOscuro,
  },
  respuesta: {
    alignSelf: 'flex-start',
    maxWidth: RESPUESTA_MAX_WIDTH,
    gap: RESPUESTA_GAP,
    paddingVertical: RESPUESTA_PADDING_VERTICAL,
    paddingHorizontal: RESPUESTA_PADDING_HORIZONTAL,
    borderBottomLeftRadius: BUBBLE_TAIL_RADIUS,
    backgroundColor: colors.superficie,
  },
  buscando: {
    gap: 0,
  },
  text: {
    fontSize: TEXT_SIZE,
    lineHeight: TEXT_SIZE * TEXT_LINE_HEIGHT,
  },
  reporteBox: {
    alignSelf: 'flex-start',
    marginTop: REPORTE_MARGIN_TOP,
  },
  reporte: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: REPORTE_GAP,
    minHeight: REPORTE_MIN_HEIGHT,
    paddingHorizontal: REPORTE_PADDING_HORIZONTAL,
  },
  reporteText: {
    fontSize: REPORTE_SIZE,
  },
  reportar: {
    color: REPORTE_COLOR,
  },
  enviado: {
    color: ENVIADO_COLOR,
  },
  error: {
    paddingHorizontal: REPORTE_PADDING_HORIZONTAL,
    color: ERROR_COLOR,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
