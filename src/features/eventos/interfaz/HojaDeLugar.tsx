import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import {
  getMensajeDeErrorDeLugar,
  getOpcionesDeLugar,
  resolverLugarNuevo,
  type LugarElegido,
} from '@/features/lugares/dominio/lugar';
import {
  getTipoDeErrorDeLugar,
  useGuardarLugar,
  useLugares,
} from '@/features/lugares/datos/useLugares';
import { colors } from '@/shared/theme';
import { AppText, Button, TextField } from '@/shared/ui';

import { hasConexion } from '../datos/useEscribirEvento';
import type { Duenio } from '../dominio/evento';
import { HojaInferior } from './HojaInferior';
import { RadioMark } from './RadioMark';

// Layout of capture 6c (06-crear-evento.html, the Lugar sheet), which the theme
// has no tokens for.
const ROW_MIN_HEIGHT = 60;
const ROW_PADDING_VERTICAL = 8;
const ROW_GAP = 14;
const ROW_TEXTS_GAP = 1;
const ADD_GAP = 12;
const ADD_ICON_SIZE = 22;
const ADD_STROKE_WIDTH = 2.8;
const NEW_PADDING_TOP = 14;
const NEW_GAP = 10;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type HojaDeLugarProps = {
  visible: boolean;
  duenio: Duenio;
  /** "Iglesia Córdoba Central": whose lugares the sheet lists. */
  nombreDelDuenio: string;
  selected: LugarElegido | null;
  onSelect: (lugar: LugarElegido | null) => void;
  onClose: () => void;
};

/**
 * "¿Dónde es?": the lugares of the duenio of the evento, as in capture 6c.
 * "+ Agregar lugar" saves a new one and leaves it chosen (capture 6d).
 */
export function HojaDeLugar({
  visible,
  duenio,
  nombreDelDuenio,
  selected,
  onSelect,
  onClose,
}: HojaDeLugarProps) {
  const lugares = useLugares(duenio);
  const guardar = useGuardarLugar();
  const [agregando, setAgregando] = useState(false);
  const [nuevo, setNuevo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const opciones = getOpcionesDeLugar(lugares.data ?? [], duenio, selected);

  const close = () => {
    setAgregando(false);
    setNuevo('');
    setError(null);
    onClose();
  };

  const choose = (lugar: LugarElegido | null) => {
    setAgregando(false);
    setNuevo('');
    setError(null);
    onSelect(lugar);
  };

  const saveNuevo = () => {
    setError(null);
    const result = resolverLugarNuevo(lugares.data ?? [], nuevo);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    // A nombre the list already has picks that lugar, without saving another.
    if ('existente' in result) {
      choose({ tipo: 'guardado', lugar: result.existente });
      return;
    }

    if (!hasConexion()) {
      setError(getMensajeDeErrorDeLugar('sin-conexion'));
      return;
    }

    guardar.mutate(
      { nombre: result.nuevo, duenio },
      {
        onSuccess: (lugar) => choose({ tipo: 'guardado', lugar }),
        onError: (failure) => setError(getMensajeDeErrorDeLugar(getTipoDeErrorDeLugar(failure))),
      },
    );
  };

  return (
    <HojaInferior
      visible={visible}
      title="¿Dónde es?"
      intro={`Lugares de ${nombreDelDuenio}.`}
      onClose={close}
    >
      <View accessibilityRole="radiogroup">
        {opciones.map((opcion) => (
          <Pressable
            key={opcion.key}
            accessibilityRole="radio"
            accessibilityState={{ checked: opcion.checked }}
            accessibilityLabel={opcion.aMano ? `${opcion.nombre}, escrito a mano` : opcion.nombre}
            onPress={() => choose(opcion.elegido)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.texts}>
              <AppText variant="cuerpoGrande" weight="bold">
                {opcion.nombre}
              </AppText>
              {opcion.aMano && <AppText color="textoSecundario">Escrito a mano</AppText>}
            </View>
            <RadioMark checked={opcion.checked} />
          </Pressable>
        ))}
      </View>

      {/* States the mockup does not draw: the list is still read, or could not be. */}
      {lugares.isPending && <AppText color="textoSecundario">Cargando los lugares…</AppText>}
      {lugares.isError && (
        <AppText color="textoSecundario">
          No se pudieron leer los lugares. Revisá la conexión y probá de nuevo.
        </AppText>
      )}

      {agregando ? (
        <View style={styles.nuevo}>
          <TextField
            label="Nombre del lugar"
            value={nuevo}
            onChangeText={setNuevo}
            placeholder="Por ejemplo: Salón de jóvenes"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={saveNuevo}
          />
          {error !== null && (
            <AppText variant="chico" color="peligro" accessibilityRole="alert">
              {error}
            </AppText>
          )}
          <Button
            label={guardar.isPending ? 'Guardando…' : 'Guardar lugar'}
            disabled={guardar.isPending}
            onPress={saveNuevo}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Agregar lugar"
          onPress={() => setAgregando(true)}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        >
          <Svg width={ADD_ICON_SIZE} height={ADD_ICON_SIZE} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 5v14M5 12h14"
              stroke={colors.azulOscuro}
              strokeWidth={ADD_STROKE_WIDTH}
              strokeLinecap="round"
            />
          </Svg>
          <AppText variant="cuerpoGrande" weight="bold" color="azulOscuro">
            Agregar lugar
          </AppText>
        </Pressable>
      )}
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  texts: {
    flex: 1,
    gap: ROW_TEXTS_GAP,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ADD_GAP,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
  },
  nuevo: {
    gap: NEW_GAP,
    paddingTop: NEW_PADDING_TOP,
  },
});
