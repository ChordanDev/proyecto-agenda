import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HojaInferior } from '@/features/eventos/interfaz/HojaInferior';
import { RadioMark } from '@/features/eventos/interfaz/RadioMark';
import { colors } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';

import { MOTIVOS_DE_REPORTE, type MotivoDeReporte } from '../dominio/reporte';

// Layout of the sheet of capture 7i, which the theme has no tokens for. The
// line numbers are those of diseno/pantallas/07-chat-ia.html.
const ROW_MIN_HEIGHT = 56; // line 226
const ROW_GAP = 14;
const BUTTONS_GAP = 10; // line 220
const BUTTONS_MARGIN_TOP = 14;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type HojaDeReporteProps = {
  visible: boolean;
  /** The motivo chosen when it opens. */
  motivoInicial: MotivoDeReporte;
  onEnviar: (motivo: MotivoDeReporte) => void;
  onClose: () => void;
};

/** The motivos of "Reportar respuesta": only the motivo is saved, never the texto. */
export function HojaDeReporte({ visible, motivoInicial, onEnviar, onClose }: HojaDeReporteProps) {
  const [motivo, setMotivo] = useState<MotivoDeReporte>(motivoInicial);

  return (
    <HojaInferior
      visible={visible}
      title="¿Qué tiene de malo esta respuesta?"
      intro="Se guarda solo el motivo, no el texto de la conversación."
      onClose={onClose}
    >
      <View accessibilityRole="radiogroup">
        {MOTIVOS_DE_REPORTE.map((opcion) => {
          const checked = opcion.motivo === motivo;
          return (
            <Pressable
              key={opcion.motivo}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={opcion.texto}
              onPress={() => setMotivo(opcion.motivo)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <RadioMark checked={checked} />
              <AppText variant="cuerpoGrande" weight="semibold">
                {opcion.texto}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.buttons}>
        <Button label="Enviar reporte" onPress={() => onEnviar(motivo)} />
        <Button label="Cancelar" variant="secondary" onPress={onClose} />
      </View>
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  buttons: {
    gap: BUTTONS_GAP,
    marginTop: BUTTONS_MARGIN_TOP,
  },
});
