import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fonts, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

import { recortarMensaje } from '../dominio/conversacion';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const CONTAINER_GAP = 6; // line 169
const CONTAINER_PADDING_TOP = 10;
const CONTAINER_PADDING_HORIZONTAL = 16;
const CONTAINER_PADDING_BOTTOM = 14;
const ROW_GAP = 10; // line 170
const INPUT_HEIGHT = 56; // line 172
const INPUT_PADDING_HORIZONTAL = 20;
const INPUT_TEXT_SIZE = 17;
const SEND_SIZE = 58; // line 179
const SEND_ICON_SIZE = 24;
const SEND_DISABLED_COLOR = '#9AA7B6'; // line 318
const AVISO_PADDING_HORIZONTAL = 8; // line 185
const AVISO_TEXT_SIZE = 15;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type CuadroDeTextoProps = {
  /** Whether the texto can be sent now: there is conexion and nothing in flight. */
  puedeEnviar: (texto: string) => boolean;
  /** Sends the texto; the cuadro empties itself. */
  onEnviar: (texto: string) => void;
  /** "Te quedan 5 consultas por hoy", under the cuadro. */
  aviso: string | null;
};

/** The cuadro de texto of the chat, up to 500 characters. The micrófono waits for v2 (#9). */
export function CuadroDeTexto({ puedeEnviar, onEnviar, aviso }: CuadroDeTextoProps) {
  const [texto, setTexto] = useState('');
  const habilitado = puedeEnviar(texto);

  const enviar = () => {
    if (!habilitado) {
      return;
    }
    onEnviar(texto);
    setTexto('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Mensaje"
          placeholder="Escribí tu pregunta"
          placeholderTextColor={colors.textoTenue}
          value={texto}
          // Not maxLength: it counts UTF-16 units and would stop at 250 emoji.
          onChangeText={(nuevo) => setTexto(recortarMensaje(nuevo))}
          returnKeyType="send"
          submitBehavior="submit"
          onSubmitEditing={enviar}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enviar"
          accessibilityState={{ disabled: !habilitado }}
          disabled={!habilitado}
          onPress={enviar}
          style={({ pressed }) => [
            styles.send,
            !habilitado && styles.sendDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Svg
            width={SEND_ICON_SIZE}
            height={SEND_ICON_SIZE}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textoSobreOscuro}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M4 12l16-8-6 16-3-7-7-1z" />
          </Svg>
        </Pressable>
      </View>
      {aviso !== null && (
        <AppText color="textoSecundario" accessibilityLiveRegion="polite" style={styles.aviso}>
          {aviso}.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: CONTAINER_GAP,
    paddingTop: CONTAINER_PADDING_TOP,
    paddingHorizontal: CONTAINER_PADDING_HORIZONTAL,
    paddingBottom: CONTAINER_PADDING_BOTTOM,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: INPUT_HEIGHT,
    paddingHorizontal: INPUT_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
    backgroundColor: colors.superficie,
    fontFamily: fonts.regular,
    fontSize: INPUT_TEXT_SIZE,
    color: colors.texto,
  },
  send: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SEND_SIZE / 2,
    backgroundColor: colors.azulOscuro,
  },
  sendDisabled: {
    backgroundColor: SEND_DISABLED_COLOR,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  aviso: {
    paddingHorizontal: AVISO_PADDING_HORIZONTAL,
    fontSize: AVISO_TEXT_SIZE,
  },
});
