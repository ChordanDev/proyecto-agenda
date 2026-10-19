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

import { accesibilidad, colors, fontSize, radius, spacing } from '@/shared/theme';
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
import { useGestionDelPastor } from '../datos/useGestionDelPastor';
import { useGestor } from '../datos/useGestor';
import {
  useAgregarEncargado,
  useEditarEncargado,
  useQuitarEncargado,
  type ResultadoDeGestion,
} from '../datos/useGestionarEncargado';
import {
  getDatosIniciales,
  getDatosTrasFalla,
  getMensajeDeError,
  getTextosDelFormulario,
  getTextosDeQuitar,
  puedeEditarEncargado,
  validarEncargado,
  validarIglesia,
  type DatosDelEncargado,
  type Encargado,
  type ErroresDelEncargado,
  type FallaDeGestion,
  type QuienGestiona,
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
const PICKER_PADDING_LEFT = 16; // line 65
const PICKER_PADDING_RIGHT = 12;
const PICKER_GAP = 10;
const PICKER_ICON_SIZE = 22;
const PICKER_ICON_STROKE_WIDTH = 2.4;
const OPTION_PADDING_HORIZONTAL = 16;
const CHECK_GAP = 14; // line 76
const CHECK_PADDING_TOP = 4;
const CHECK_BOX_SIZE = 28; // line 77
const CHECK_BOX_MARGIN_TOP = 2;
const CHECK_BOX_RADIUS = 8;
const CHECK_BOX_BORDER_WIDTH = 2;
const CHECK_ICON_SIZE = 18;
const CHECK_ICON_STROKE_WIDTH = 3;
const CHECK_TEXTS_GAP = 2; // line 78
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

const SAFE_AREA_EDGES = ['top', 'left', 'right', 'bottom'] as const;

export type ModoDeEncargado = { tipo: 'agregar' } | { tipo: 'editar'; cargoId: string };

type EncargadoScreenProps = {
  /**
   * The iglesia of the encargado. When adding, the pastor may come without one
   * and choose it among the iglesias of their distritos.
   */
  iglesiaId: string | undefined;
  modo: ModoDeEncargado;
};

type Iglesia = { id: string; nombre: string };

/**
 * Agregar or Editar encargado. For the secretaria de iglesia, the iglesia is
 * always hers. The pastor chooses it among the iglesias of their distritos
 * when adding, and also names or removes the secretarias de iglesia. The
 * iglesia of a cargo never changes. Editing also removes the cargo, after asking.
 */
export function EncargadoScreen({ iglesiaId, modo }: EncargadoScreenProps) {
  const router = useRouter();
  const vista = useGestor()?.vista;
  const quien: QuienGestiona | undefined =
    vista?.tipo === 'secretaria' ? 'secretaria' : vista?.tipo === 'pastor' ? 'pastor' : undefined;
  const eligeIglesia = modo.tipo === 'agregar' && quien === 'pastor';
  const consulta = useEncargadosDeIglesia(
    iglesiaId ?? '',
    !eligeIglesia && iglesiaId !== undefined,
  );
  const delPastor = useGestionDelPastor(
    eligeIglesia && vista?.tipo === 'pastor' ? vista.distritoIds : null,
  );
  const { titulo } = getTextosDelFormulario(modo.tipo, false);

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/gestion');
    }
  };

  const renderContent = () => {
    // While the cargos of the usuario are read, before knowing who manages.
    if (quien === undefined) {
      return (
        <Card>
          <AppText color="textoSecundario">Cargando…</AppText>
        </Card>
      );
    }

    if (eligeIglesia && delPastor.data) {
      return (
        <Formulario
          quien={quien}
          iglesia={null}
          iglesias={delPastor.data.iglesias.map(({ id, nombre }) => ({ id, nombre }))}
          iglesiaInicial={iglesiaId ?? null}
          encargado={null}
          onClose={leave}
        />
      );
    }

    if (!eligeIglesia && consulta.data) {
      const { iglesia, encargados } = consulta.data;

      if (modo.tipo === 'agregar') {
        return <Formulario quien={quien} iglesia={iglesia} encargado={null} onClose={leave} />;
      }

      const encargado = encargados.find((uno) => uno.cargoId === modo.cargoId);
      if (encargado && puedeEditarEncargado(encargado, quien)) {
        return <Formulario quien={quien} iglesia={iglesia} encargado={encargado} onClose={leave} />;
      }
    }

    // States the mockup does not draw.
    if (!eligeIglesia && consulta.data !== undefined) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario">Este encargado ya no está en la lista.</AppText>
          <Button label="Volver a Gestión" variant="secondary" onPress={leave} />
        </Card>
      );
    }

    if (eligeIglesia ? delPastor.isError : consulta.isError) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario">
            No se pudo preparar el formulario. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button
            label="Reintentar"
            variant="secondary"
            onPress={() => (eligeIglesia ? delPastor.refetch() : consulta.refetch())}
          />
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
  quien: QuienGestiona;
  /** The iglesia of the encargado; null when the pastor chooses it among `iglesias`. */
  iglesia: Iglesia | null;
  /** The iglesias the pastor chooses among when adding. */
  iglesias?: Iglesia[];
  /** The iglesia chosen at first, when it is one of `iglesias`. */
  iglesiaInicial?: string | null;
  /** The encargado being edited; null when adding one. */
  encargado: Encargado | null;
  /** Leaves the form, after saving or removing. */
  onClose: () => void;
};

function Formulario({
  quien,
  iglesia: iglesiaFija,
  iglesias = [],
  iglesiaInicial = null,
  encargado,
  onClose,
}: FormularioProps) {
  const modo = encargado === null ? 'agregar' : 'editar';
  const nombraSecretaria = quien === 'pastor';
  const conConexion = useOnlineStatus();
  const [iglesiaElegida, setIglesiaElegida] = useState<string | null>(() =>
    iglesias.some((una) => una.id === iglesiaInicial)
      ? iglesiaInicial
      : iglesias.length === 1
        ? iglesias[0].id
        : null,
  );
  const iglesia = iglesiaFija ?? iglesias.find((una) => una.id === iglesiaElegida) ?? null;
  const agregar = useAgregarEncargado();
  const editar = useEditarEncargado(iglesia?.id ?? '', encargado?.cargoId ?? '');
  const quitar = useQuitarEncargado(iglesia?.id ?? '', encargado?.cargoId ?? '');
  const ocupado = agregar.isPending || editar.isPending || quitar.isPending;

  const [iniciales] = useState(() => getDatosIniciales(encargado));
  const [datos, setDatos] = useState<DatosDelEncargado>(iniciales);
  const [esSecretaria, setEsSecretaria] = useState(encargado?.esSecretaria ?? false);
  const [errorDeIglesia, setErrorDeIglesia] = useState<string | undefined>();
  // The fields only show what is wrong after a first attempt to save.
  const [errores, setErrores] = useState<ErroresDelEncargado>({});
  const [falla, setFalla] = useState<{
    accion: 'agregar' | 'editar' | 'quitar';
    falla: FallaDeGestion;
  } | null>(null);
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  const textos = getTextosDelFormulario(modo, falla !== null && falla.accion !== 'quitar');

  const cambiar = (campo: keyof DatosDelEncargado) => (valor: string) =>
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));

  const despues = (accion: 'agregar' | 'editar' | 'quitar') => (resultado: ResultadoDeGestion) => {
    if (resultado.ok) {
      onClose();
    } else {
      setFalla({ accion, falla: resultado.falla });
      setDatos((escritos) => getDatosTrasFalla(escritos, iniciales, resultado.falla));
    }
  };

  const onGuardar = () => {
    const validado = validarEncargado(datos, modo);
    const sinIglesia = validarIglesia(iglesia?.id ?? null);
    setErrorDeIglesia(sinIglesia);
    if (!validado.ok) {
      setErrores(validado.errores);
      return;
    }
    setErrores({});
    if (iglesia === null) {
      return;
    }
    setFalla(null);
    if (modo === 'agregar') {
      agregar.mutate(
        {
          valores: validado.valores,
          iglesiaId: iglesia.id,
          esSecretaria: nombraSecretaria && esSecretaria,
        },
        { onSuccess: despues('agregar') },
      );
    } else {
      // The secretaria never sends the mark: it stays as it is.
      editar.mutate(
        { ...validado.valores, esSecretaria: nombraSecretaria ? esSecretaria : undefined },
        { onSuccess: despues('editar') },
      );
    }
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
    encargado === null || iglesia === null
      ? null
      : getTextosDeQuitar(encargado.nombre, iglesia.nombre);

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

        {iglesiaFija === null ? (
          <Field error={errorDeIglesia}>
            <SelectorDeIglesia
              iglesias={iglesias}
              elegida={iglesia}
              onElegir={(id) => {
                setIglesiaElegida(id);
                setErrorDeIglesia(undefined);
              }}
            />
          </Field>
        ) : (
          <View style={styles.fixedField}>
            <AppText variant="label">Iglesia</AppText>
            <AppText variant="cuerpoGrande">{iglesiaFija.nombre}</AppText>
          </View>
        )}

        {nombraSecretaria && (
          <CasillaDeSecretaria marcada={esSecretaria} onCambiar={setEsSecretaria} />
        )}
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

type SelectorDeIglesiaProps = {
  iglesias: Iglesia[];
  elegida: Iglesia | null;
  onElegir: (iglesiaId: string) => void;
};

/**
 * The iglesia the pastor adds the encargado to, among those of their
 * distritos: a field that opens the list under it.
 */
function SelectorDeIglesia({ iglesias, elegida, onElegir }: SelectorDeIglesiaProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <View style={styles.fixedField}>
      <AppText variant="label" nativeID="etiqueta-iglesia">
        Iglesia
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabelledBy="etiqueta-iglesia"
        accessibilityLabel={`Iglesia: ${elegida?.nombre ?? 'sin elegir'}`}
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((antes) => !antes)}
        style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
      >
        <AppText
          variant="cuerpoGrande"
          color={elegida === null ? 'textoTenue' : undefined}
          style={styles.pickerText}
        >
          {elegida?.nombre ?? 'Elegí una iglesia'}
        </AppText>
        <Svg
          width={PICKER_ICON_SIZE}
          height={PICKER_ICON_SIZE}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.azulOscuro}
          strokeWidth={PICKER_ICON_STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <Path d={abierto ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
        </Svg>
      </Pressable>
      {abierto && (
        <View style={styles.options}>
          {iglesias.map((una, index) => (
            <Pressable
              key={una.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: una.id === elegida?.id }}
              onPress={() => {
                onElegir(una.id);
                setAbierto(false);
              }}
              style={({ pressed }) => [
                styles.option,
                index < iglesias.length - 1 && styles.optionDivider,
                pressed && styles.pressed,
              ]}
            >
              <AppText variant="cuerpoGrande" weight={una.id === elegida?.id ? 'bold' : undefined}>
                {una.nombre}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/** "Es secretaria de la iglesia", which only the pastor and the admin see. */
function CasillaDeSecretaria({
  marcada,
  onCambiar,
}: {
  marcada: boolean;
  onCambiar: (marcada: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
      onPress={() => onCambiar(!marcada)}
      style={({ pressed }) => [styles.check, pressed && styles.pressed]}
    >
      <View style={[styles.checkBox, marcada && styles.checkBoxMarcada]}>
        {marcada && (
          <Svg
            width={CHECK_ICON_SIZE}
            height={CHECK_ICON_SIZE}
            viewBox="0 0 24 24"
            fill="none"
            stroke={colors.textoSobreOscuro}
            strokeWidth={CHECK_ICON_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <Path d="M5 12.5l4.5 4.5L19 7.5" />
          </Svg>
        )}
      </View>
      <View style={styles.checkTexts}>
        <AppText weight="bold">Es secretaria de la iglesia</AppText>
        <AppText variant="secundario" color="textoSecundario" style={styles.paragraph}>
          Además puede agregar, editar y quitar encargados de esta iglesia.
        </AppText>
      </View>
    </Pressable>
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PICKER_GAP,
    minHeight: accesibilidad.alturaCampo,
    paddingLeft: PICKER_PADDING_LEFT,
    paddingRight: PICKER_PADDING_RIGHT,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  pickerText: {
    flexShrink: 1,
  },
  options: {
    overflow: 'hidden',
    borderRadius: radius.campo,
    borderWidth: 1,
    borderColor: colors.separador,
  },
  option: {
    justifyContent: 'center',
    minHeight: accesibilidad.alturaCampo,
    paddingHorizontal: OPTION_PADDING_HORIZONTAL,
  },
  optionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: CHECK_GAP,
    minHeight: accesibilidad.alturaMinTactil,
    paddingTop: CHECK_PADDING_TOP,
  },
  checkBox: {
    width: CHECK_BOX_SIZE,
    height: CHECK_BOX_SIZE,
    marginTop: CHECK_BOX_MARGIN_TOP,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: CHECK_BOX_RADIUS,
    borderWidth: CHECK_BOX_BORDER_WIDTH,
    borderColor: colors.radioInactivo,
    backgroundColor: colors.superficie,
  },
  checkBoxMarcada: {
    borderColor: colors.azulOscuro,
    backgroundColor: colors.azulOscuro,
  },
  checkTexts: {
    flexShrink: 1,
    gap: CHECK_TEXTS_GAP,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
