import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, fontSize, radius, spacing } from '@/shared/theme';
import {
  AppText,
  BackButton,
  Button,
  Card,
  ConfirmDialog,
  DialogText,
  ScreenBackground,
  TextField,
} from '@/shared/ui';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import { useEncargadosDeIglesia } from '../datos/useEncargadosDeIglesia';
import {
  useAgregarEncargado,
  useEditarEncargado,
  useQuitarEncargado,
  type ResultadoDeGestion,
} from '../datos/useGestionarEncargado';
import {
  getMensajeDeError,
  getTextosDelFormulario,
  getTextosDeQuitar,
  puedeEditarEncargado,
  validarEncargado,
  type DatosDelEncargado,
  type Encargado,
  type ErroresDelEncargado,
  type FallaDeGestion,
} from '../dominio/encargados';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/08c-encargado.html.
const HEADER_PADDING_TOP = 22; // line 21
const HEADER_GAP = 12;
const CONTENT_PADDING_TOP = 30; // line 28
const CONTENT_PADDING_BOTTOM = 36;
const CONTENT_GAP = 14;
const NOTICE_GAP = 10; // line 31
const NOTICE_MIN_HEIGHT = 48;
const NOTICE_PADDING_VERTICAL = 8;
const NOTICE_PADDING_HORIZONTAL = 14;
const NOTICE_ICON_SIZE = 22; // line 32
const NOTICE_ICON_STROKE_WIDTH = 2.2;
const CARD_GAP = 16; // line 37
const CARD_PADDING_VERTICAL = 18;
const FIXED_FIELD_GAP = 4; // line 51
const ERROR_BACKGROUND = '#FDE7EC'; // line 87
const ERROR_COLOR = '#7A0B2B';
const ERROR_PADDING_VERTICAL = 12;
const ERROR_PADDING_HORIZONTAL = 14;
const QUITAR_HEIGHT = 54; // line 97
const QUITAR_BORDER_WIDTH = 2;
const QUITAR_DISABLED_OPACITY = 0.45; // line 100
const PARAGRAPH_LINE_HEIGHT = 1.4; // line 46
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

const SAFE_AREA_EDGES = ['top', 'left', 'right', 'bottom'] as const;

export type ModoDeEncargado = { tipo: 'agregar' } | { tipo: 'editar'; cargoId: string };

type EncargadoScreenProps = {
  iglesiaId: string;
  modo: ModoDeEncargado;
};

/**
 * Agregar or Editar encargado, for the secretaria de iglesia: the iglesia is
 * always hers and never changes. Editing also removes the cargo, after asking.
 */
export function EncargadoScreen({ iglesiaId, modo }: EncargadoScreenProps) {
  const router = useRouter();
  const consulta = useEncargadosDeIglesia(iglesiaId);
  const { titulo } = getTextosDelFormulario(modo.tipo, false);

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gestion');
    }
  };

  const renderContent = () => {
    if (consulta.data) {
      const { iglesia, encargados } = consulta.data;

      if (modo.tipo === 'agregar') {
        return <Formulario iglesia={iglesia} encargado={null} onClose={leave} />;
      }

      const encargado = encargados.find((uno) => uno.cargoId === modo.cargoId);
      if (encargado && puedeEditarEncargado(encargado)) {
        return <Formulario iglesia={iglesia} encargado={encargado} onClose={leave} />;
      }
    }

    // States the mockup does not draw.
    if (consulta.data !== undefined) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario">Este encargado ya no está en la lista.</AppText>
          <Button label="Volver a Gestión" variant="secondary" onPress={leave} />
        </Card>
      );
    }

    if (consulta.isError) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario">
            No se pudo preparar el formulario. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button label="Reintentar" variant="secondary" onPress={() => consulta.refetch()} />
        </Card>
      );
    }

    return (
      <Card>
        <AppText color="textoSecundario">Cargando…</AppText>
      </Card>
    );
  };

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <BackButton icon="close" onPress={leave} />
        <AppText variant="tituloEncabezado" accessibilityRole="header">
          {titulo}
        </AppText>
      </View>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          // Scrolling hides the keyboard, so the fields below it can be reached.
          keyboardDismissMode="on-drag"
        >
          {renderContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

type FormularioProps = {
  iglesia: { id: string; nombre: string };
  /** The encargado being edited; null when adding one. */
  encargado: Encargado | null;
  /** Leaves the form, after saving or removing. */
  onClose: () => void;
};

function Formulario({ iglesia, encargado, onClose }: FormularioProps) {
  const modo = encargado === null ? 'agregar' : 'editar';
  const conConexion = useOnlineStatus();
  const agregar = useAgregarEncargado(iglesia.id);
  const editar = useEditarEncargado(iglesia.id, encargado?.cargoId ?? '');
  const quitar = useQuitarEncargado(iglesia.id, encargado?.cargoId ?? '');
  const guardar = modo === 'agregar' ? agregar : editar;

  const [datos, setDatos] = useState<DatosDelEncargado>({
    nombre: encargado?.nombre ?? '',
    correo: encargado?.correo ?? '',
    funcion: encargado?.funcion ?? '',
  });
  // The fields only show what is wrong after a first attempt to save.
  const [errores, setErrores] = useState<ErroresDelEncargado>({});
  const [falla, setFalla] = useState<{
    accion: 'agregar' | 'editar' | 'quitar';
    falla: FallaDeGestion;
  } | null>(null);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  const textos = getTextosDelFormulario(modo, falla !== null && falla.accion !== 'quitar');
  const ocupado = guardar.isPending || quitar.isPending;

  const cambiar = (campo: keyof DatosDelEncargado) => (valor: string) =>
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));

  const despues = (accion: 'agregar' | 'editar' | 'quitar') => (resultado: ResultadoDeGestion) => {
    if (resultado.ok) {
      onClose();
    } else {
      setFalla({ accion, falla: resultado.falla });
    }
  };

  const onGuardar = () => {
    const validado = validarEncargado(datos, modo);
    if (!validado.ok) {
      setErrores(validado.errores);
      return;
    }
    setErrores({});
    setFalla(null);
    guardar.mutate(validado.valores, { onSuccess: despues(modo) });
  };

  const onQuitar = () => {
    setFalla(null);
    quitar.mutate(undefined, {
      onSuccess: (resultado) => {
        setConfirmandoQuitar(false);
        despues('quitar')(resultado);
      },
    });
  };

  const mensaje = falla === null ? null : getMensajeDeError(falla.accion, falla.falla);
  const textosDeQuitar =
    encargado === null ? null : getTextosDeQuitar(encargado.nombre, iglesia.nombre);

  return (
    <>
      {!conConexion && (
        <View accessibilityRole="summary" style={styles.notice}>
          <CloudOffIcon />
          <AppText variant="secundario" style={styles.noticeText}>
            <AppText variant="secundario" weight="bold" color="azulOscuro">
              Sin conexión.
            </AppText>{' '}
            {textos.sinConexion}
          </AppText>
        </View>
      )}

      <Card style={styles.card}>
        <Field error={errores.nombre}>
          <TextField
            label="Nombre"
            value={datos.nombre}
            onChangeText={cambiar('nombre')}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
        </Field>

        {modo === 'agregar' ? (
          <Field error={errores.correo}>
            <TextField
              label="Correo"
              value={datos.correo}
              onChangeText={cambiar('correo')}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <AppText variant="secundario" color="textoSecundario" style={styles.paragraph}>
              Le llega un correo de bienvenida. Entra con este correo, sin contraseña.
            </AppText>
          </Field>
        ) : (
          <View style={styles.fixedField}>
            <AppText variant="label">Correo</AppText>
            <AppText variant="cuerpoGrande">{encargado?.correo ?? '—'}</AppText>
            <AppText variant="secundario" color="textoSecundario" style={styles.paragraph}>
              Solo el admin de la asociación puede cambiar el correo.
            </AppText>
          </View>
        )}

        <Field error={errores.funcion}>
          <TextField
            label="Función"
            value={datos.funcion}
            onChangeText={cambiar('funcion')}
            placeholder="Por ejemplo: Tesorero"
            autoCapitalize="sentences"
          />
        </Field>

        <View style={styles.fixedField}>
          <AppText variant="label">Iglesia</AppText>
          <AppText variant="cuerpoGrande">{iglesia.nombre}</AppText>
        </View>
      </Card>

      {mensaje !== null && (
        <View accessibilityRole="alert" style={styles.error}>
          <AppText variant="secundario" style={styles.errorText}>
            <AppText variant="secundario" weight="bold" style={styles.errorText}>
              {mensaje.titulo}
            </AppText>{' '}
            {mensaje.texto}
          </AppText>
        </View>
      )}

      <Button label={textos.boton} disabled={!conConexion || ocupado} onPress={onGuardar} />

      {encargado !== null && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !conConexion || ocupado }}
          disabled={!conConexion || ocupado}
          onPress={() => setConfirmandoQuitar(true)}
          style={({ pressed }) => [
            styles.quitar,
            pressed && styles.pressed,
            (!conConexion || ocupado) && styles.quitarDisabled,
          ]}
        >
          <AppText weight="bold" color="peligro">
            Quitar cargo
          </AppText>
        </Pressable>
      )}

      {confirmandoQuitar && textosDeQuitar !== null && (
        <ConfirmDialog
          title={textosDeQuitar.titulo}
          confirmLabel="Quitar cargo"
          tone="danger"
          busy={quitar.isPending}
          onConfirm={onQuitar}
          onCancel={() => setConfirmandoQuitar(false)}
        >
          <DialogText>{textosDeQuitar.texto}</DialogText>
        </ConfirmDialog>
      )}
    </>
  );
}

function Field({ error, children }: { error: string | undefined; children: ReactNode }) {
  return (
    <View style={styles.field}>
      {children}
      {error !== undefined && (
        <AppText variant="chico" color="peligro">
          {error}
        </AppText>
      )}
    </View>
  );
}

/** A cloud crossed out, as in the notice of the mockup (line 32). */
function CloudOffIcon() {
  return (
    <Svg
      width={NOTICE_ICON_SIZE}
      height={NOTICE_ICON_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.azulOscuro}
      strokeWidth={NOTICE_ICON_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M2 2l20 20" />
      <Path d="M5.8 5.8A5.5 5.5 0 0 0 6.5 17H17" />
      <Path d="M9.6 4.6A6 6 0 0 1 17.6 9 4 4 0 0 1 20.7 15.6" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  fill: {
    flex: 1,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: NOTICE_GAP,
    minHeight: NOTICE_MIN_HEIGHT,
    paddingVertical: NOTICE_PADDING_VERTICAL,
    paddingHorizontal: NOTICE_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: colors.superficie,
  },
  noticeText: {
    flexShrink: 1,
    color: colors.texto,
  },
  card: {
    gap: CARD_GAP,
    paddingVertical: CARD_PADDING_VERTICAL,
  },
  field: {
    gap: FIXED_FIELD_GAP,
  },
  fixedField: {
    gap: FIXED_FIELD_GAP,
  },
  paragraph: {
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  error: {
    paddingVertical: ERROR_PADDING_VERTICAL,
    paddingHorizontal: ERROR_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: ERROR_BACKGROUND,
  },
  errorText: {
    color: ERROR_COLOR,
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  quitar: {
    minHeight: QUITAR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: QUITAR_BORDER_WIDTH,
    borderColor: colors.peligro,
    borderRadius: radius.boton,
    backgroundColor: colors.superficie,
  },
  quitarDisabled: {
    opacity: QUITAR_DISABLED_OPACITY,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
