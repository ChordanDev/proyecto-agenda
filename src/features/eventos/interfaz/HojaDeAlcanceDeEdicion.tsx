import { StyleSheet, View } from 'react-native';

import { Button } from '@/shared/ui';

import { HojaInferior } from './HojaInferior';

// Capture 5c and 5d of the approved mockups (05-detalle-evento.html, lines
// 118-131): two large buttons and "Cancelar" under them.
const BUTTONS_GAP = 10;
const BUTTONS_PADDING_TOP = 4;

type HojaDeAlcanceDeEdicionProps = {
  visible: boolean;
  /** "¿Qué querés cambiar?" or "¿Qué querés borrar?". */
  pregunta: string;
  /** How the evento repeats: "Este evento se repite el tercer sábado de cada mes." */
  recordatorio: string;
  /** "Solo el sábado 17 de octubre". */
  soloEsta: string;
  onSoloEsta: () => void;
  onTodaLaSerie: () => void;
  onClose: () => void;
};

/**
 * Asks whether Editar or Borrar on a date of a series is about that date or
 * the whole series. There is no "this date and the following ones".
 */
export function HojaDeAlcanceDeEdicion({
  visible,
  pregunta,
  recordatorio,
  soloEsta,
  onSoloEsta,
  onTodaLaSerie,
  onClose,
}: HojaDeAlcanceDeEdicionProps) {
  return (
    <HojaInferior visible={visible} title={pregunta} intro={recordatorio} onClose={onClose}>
      <View style={styles.buttons}>
        <Button label={soloEsta} size="large" onPress={onSoloEsta} />
        <Button label="Toda la serie" variant="secondary" size="large" onPress={onTodaLaSerie} />
        <Button label="Cancelar" variant="text" onPress={onClose} />
      </View>
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  buttons: {
    gap: BUTTONS_GAP,
    paddingTop: BUTTONS_PADDING_TOP,
  },
});
