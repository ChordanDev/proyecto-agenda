import { StyleSheet, View } from 'react-native';

import { colors } from '@/shared/theme';
import { AppText, Button, ChatIcon } from '@/shared/ui';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const PADDING_HORIZONTAL = 20; // line 33
const GAP = 14;
const ICON_CIRCLE_SIZE = 64; // line 34
const ICON_CIRCLE_COLOR = '#D9E2EC';
const ICON_SIZE = 32;
const TITLE_SIZE = 22; // line 35
const TEXT_SIZE = 17; // line 36
const TEXT_LINE_HEIGHT = 1.45;
const TEXT_COLOR = '#333333';
const FORMULARIO_MARGIN_TOP = 8; // line 37
const RELEER_HEIGHT = 56; // line 38
const RELEER_COLOR = '#D9E2EC';

type ChatNoAceptadoProps = {
  onCrearEvento: () => void;
  onReleerAviso: () => void;
};

/**
 * The Chat tab of a usuario who turned the aviso of OpenAI down: no messages
 * and no cuadro de texto, only the way to the formulario and back to the aviso.
 */
export function ChatNoAceptado({ onCrearEvento, onReleerAviso }: ChatNoAceptadoProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <ChatIcon color={colors.azulOscuro} size={ICON_SIZE} />
      </View>
      <AppText weight="bold" accessibilityRole="header" style={styles.title}>
        El chat no está disponible
      </AppText>
      <AppText style={styles.text}>
        Para usarlo tenés que aceptar que tus mensajes se envían a OpenAI. Los eventos los podés
        cargar con el formulario.
      </AppText>
      <Button
        label="Crear evento con el formulario"
        onPress={onCrearEvento}
        style={styles.formulario}
      />
      <Button
        label="Leer el aviso de nuevo"
        variant="secondary"
        onPress={onReleerAviso}
        style={styles.releer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: GAP,
    paddingHorizontal: PADDING_HORIZONTAL,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: ICON_CIRCLE_COLOR,
  },
  title: {
    fontSize: TITLE_SIZE,
    textAlign: 'center',
  },
  text: {
    fontSize: TEXT_SIZE,
    lineHeight: TEXT_SIZE * TEXT_LINE_HEIGHT,
    color: TEXT_COLOR,
    textAlign: 'center',
  },
  formulario: {
    marginTop: FORMULARIO_MARGIN_TOP,
  },
  releer: {
    minHeight: RELEER_HEIGHT,
    backgroundColor: RELEER_COLOR,
  },
});
