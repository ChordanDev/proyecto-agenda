import { StyleSheet, View } from 'react-native';

import { AppText, FormaDeEnfasis } from '@/shared/ui';

import type { LineaDeEvento } from '../dominio/conversacion';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/07-chat-ia.html.
const ROW_GAP = 10; // line 73
const SHAPE_BOX_WIDTH = 18; // line 74
const SHAPE_SIZE = 15; // lines 75-79
const TEXT_SIZE = 16; // line 81

/** An evento of a respuesta: its shape and color, its hora, its titulo and its alcance. */
export function EventoDeRespuesta({ linea }: { linea: LineaDeEvento }) {
  const { categoria, cuando, titulo, alcance } = linea;

  return (
    <View style={styles.row}>
      <View style={styles.shapeBox}>
        <FormaDeEnfasis categoria={categoria} size={SHAPE_SIZE} />
      </View>
      <AppText style={styles.text}>
        <AppText weight="bold" style={styles.text}>
          {cuando}
        </AppText>{' '}
        {titulo}
        {alcance !== null && (
          <AppText color="textoSecundario" style={styles.text}>
            {' '}
            {alcance}
          </AppText>
        )}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
  },
  shapeBox: {
    width: SHAPE_BOX_WIDTH,
    alignItems: 'center',
  },
  text: {
    flexShrink: 1,
    fontSize: TEXT_SIZE,
  },
});
