import { StyleSheet, View } from 'react-native';

import { colors } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { getLineasDeEventos, type MensajeDeChat as Mensaje } from '../dominio/conversacion';
import { getPreguntaDeHora, getTarjetaDePropuesta } from '../dominio/propuesta';
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

type MensajeDeChatProps = {
  mensaje: Mensaje;
  /** For the falla that can be retried; null on any other mensaje. */
  onReintentar: (() => void) | null;
  onIrAlFormulario: () => void;
  /** Confirmar, Editar and "Ver evento" of a propuesta, by its id. */
  onConfirmar: (id: string) => void;
  onEditar: (id: string) => void;
  onVerEvento: (id: string) => void;
};

/** A mensaje of the conversacion: a pregunta, a respuesta, a falla or a propuesta. */
export function MensajeDeChat({
  mensaje,
  onReintentar,
  onIrAlFormulario,
  onConfirmar,
  onEditar,
  onVerEvento,
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
        <View style={[styles.bubble, styles.respuesta]}>
          <AppText style={styles.text}>{mensaje.texto}</AppText>
          {getLineasDeEventos(mensaje.eventos).map((linea) => (
            <EventoDeRespuesta key={linea.clave} linea={linea} />
          ))}
        </View>
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
        </>
      );
  }
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
});
