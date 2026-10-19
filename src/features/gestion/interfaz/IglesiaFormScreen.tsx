import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { newId } from '@/shared/newId';
import { accesibilidad, colors, fontSize, radius } from '@/shared/theme';
import { AppText, Button, Card, TextField } from '@/shared/ui';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import { useEstructuraDelAdmin, useGuardarIglesia } from '../datos/useGestionAdmin';
import type { DistritoDelAdmin } from '../dominio/distritosSinPastor';
import {
  getAvisoDeCambioDeDistrito,
  validarIglesia,
  type DatosDeLaIglesia,
  type ErroresDeLaIglesia,
  type IglesiaDelAdmin,
} from '../dominio/estructuraDelAdmin';
import {
  AvisoSinConexion,
  Campo,
  ErrorAlGuardar,
  EstadoDelFormulario,
  PantallaDeFormulario,
  useSalir,
} from './FormularioDelAdmin';
import { HojaDeDistrito } from './HojaDeDistrito';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/09b-iglesia.html.
const CARD_GAP = 16;
const CARD_PADDING_VERTICAL = 18;
const SELECT_LABEL_GAP = 8;
const SELECT_PADDING_HORIZONTAL = 16;
const SELECT_ICON_SIZE = 22;
const SELECT_ICON_STROKE_WIDTH = 2.4;
const MOVIDA_PADDING_VERTICAL = 12;
const MOVIDA_PADDING_HORIZONTAL = 14;
const PARAGRAPH_LINE_HEIGHT = 1.4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

export type ModoDeIglesia =
  | { tipo: 'nueva'; distritoId: string | null }
  /** `distritoId`: a distrito to move it to, chosen in "Agregar iglesia" of a distrito. */
  | { tipo: 'editar'; iglesiaId: string; distritoId: string | null };

/** Nueva or Editar iglesia, for the admin: its texts and its distrito. */
export function IglesiaFormScreen({ modo }: { modo: ModoDeIglesia }) {
  const salir = useSalir();
  const consulta = useEstructuraDelAdmin();
  const titulo = modo.tipo === 'nueva' ? 'Nueva iglesia' : 'Editar iglesia';
  const estructura = consulta.data;
  const iglesia =
    modo.tipo === 'editar'
      ? estructura?.iglesias.find((una) => una.id === modo.iglesiaId)
      : undefined;

  return (
    <PantallaDeFormulario titulo={titulo} onClose={salir}>
      {estructura && (modo.tipo === 'nueva' || iglesia) ? (
        <Formulario
          iglesia={iglesia ?? null}
          distritoInicial={modo.distritoId}
          distritos={estructura.distritos}
          onClose={salir}
        />
      ) : (
        <EstadoDelFormulario
          cargando={consulta.isPending}
          error={consulta.isError}
          onRetry={() => consulta.refetch()}
          onClose={salir}
          ausente="Esta iglesia ya no está en la lista."
        />
      )}
    </PantallaDeFormulario>
  );
}

type FormularioProps = {
  /** The iglesia being edited; null when creating one. */
  iglesia: IglesiaDelAdmin | null;
  /** The distrito chosen before opening the form, if any. */
  distritoInicial: string | null;
  distritos: DistritoDelAdmin[];
  onClose: () => void;
};

function Formulario({ iglesia, distritoInicial, distritos, onClose }: FormularioProps) {
  const conConexion = useOnlineStatus();
  // A new iglesia gets its id here, once: every try sends the same one.
  const [nuevoId] = useState(newId);
  const guardar = useGuardarIglesia(iglesia === null ? { crear: nuevoId } : { editar: iglesia.id });
  const [datos, setDatos] = useState<DatosDeLaIglesia>(() => ({
    nombre: iglesia?.nombre ?? '',
    direccion: iglesia?.direccion ?? '',
    localidad: iglesia?.localidad ?? '',
    distritoId: distritoInicial ?? iglesia?.distritoId ?? null,
  }));
  // The fields only show what is wrong after a first attempt to save.
  const [errores, setErrores] = useState<ErroresDeLaIglesia>({});
  const [fallo, setFallo] = useState(false);
  const [eligiendoDistrito, setEligiendoDistrito] = useState(false);

  const nombreDe = (id: string | null) =>
    distritos.find((distrito) => distrito.id === id)?.nombre ?? null;
  const distritoElegido = nombreDe(datos.distritoId);
  const movida =
    iglesia !== null && datos.distritoId !== null && datos.distritoId !== iglesia.distritoId;

  const cambiar = (campo: 'nombre' | 'direccion' | 'localidad') => (valor: string) =>
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));

  const onGuardar = () => {
    const validado = validarIglesia(datos);
    if (!validado.ok) {
      setErrores(validado.errores);
      return;
    }
    setErrores({});
    setFallo(false);
    guardar.mutate(validado.valores, {
      onSuccess: (resultado) => (resultado.ok ? onClose() : setFallo(true)),
    });
  };

  const boton = fallo ? 'Probar de nuevo' : iglesia === null ? 'Crear iglesia' : 'Guardar cambios';

  return (
    <>
      {!conConexion && <AvisoSinConexion />}

      <Card style={styles.card}>
        <Campo error={errores.nombre}>
          <TextField
            label="Nombre"
            value={datos.nombre}
            onChangeText={cambiar('nombre')}
            autoCapitalize="words"
          />
        </Campo>

        <Campo error={errores.direccion}>
          <TextField
            label="Dirección"
            value={datos.direccion}
            onChangeText={cambiar('direccion')}
            autoCapitalize="words"
            textContentType="fullStreetAddress"
          />
        </Campo>

        <Campo error={errores.localidad}>
          <TextField
            label="Localidad"
            value={datos.localidad}
            onChangeText={cambiar('localidad')}
            autoCapitalize="words"
            textContentType="addressCity"
          />
          <AppText variant="secundario" color="textoSecundario">
            Se muestra en el buscador de &quot;Elegir iglesia&quot;.
          </AppText>
        </Campo>

        <Campo error={errores.distritoId}>
          <View style={styles.select}>
            <AppText variant="label">Distrito</AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Distrito: ${distritoElegido ?? 'sin elegir'}`}
              accessibilityHint="Abre la lista de distritos"
              onPress={() => setEligiendoDistrito(true)}
              style={({ pressed }) => [styles.selectBox, pressed && styles.pressed]}
            >
              <AppText
                variant="cuerpoGrande"
                color={distritoElegido === null ? 'textoTenue' : 'texto'}
                style={styles.selectText}
              >
                {distritoElegido ?? 'Elegí el distrito'}
              </AppText>
              <Svg
                width={SELECT_ICON_SIZE}
                height={SELECT_ICON_SIZE}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.azulOscuro}
                strokeWidth={SELECT_ICON_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <Path d="M6 9l6 6 6-6" />
              </Svg>
            </Pressable>
          </View>
        </Campo>

        {movida && iglesia !== null && distritoElegido !== null && (
          <View accessibilityRole="text" style={styles.movida}>
            <AppText variant="secundario" style={styles.movidaText}>
              {getAvisoDeCambioDeDistrito(iglesia.distritoNombre, distritoElegido)}
            </AppText>
          </View>
        )}
      </Card>

      {fallo && <ErrorAlGuardar />}

      <Button label={boton} disabled={!conConexion || guardar.isPending} onPress={onGuardar} />

      <HojaDeDistrito
        visible={eligiendoDistrito}
        title="Distrito"
        distritos={distritos}
        selected={datos.distritoId}
        onSelect={(distritoId) => {
          setDatos((anteriores) => ({ ...anteriores, distritoId }));
          setEligiendoDistrito(false);
        }}
        onClose={() => setEligiendoDistrito(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_GAP,
    paddingVertical: CARD_PADDING_VERTICAL,
  },
  select: {
    gap: SELECT_LABEL_GAP,
  },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: accesibilidad.alturaCampo,
    paddingHorizontal: SELECT_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  selectText: {
    flex: 1,
  },
  movida: {
    paddingVertical: MOVIDA_PADDING_VERTICAL,
    paddingHorizontal: MOVIDA_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: colors.avisoSuave,
  },
  movidaText: {
    color: colors.avisoTexto,
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
