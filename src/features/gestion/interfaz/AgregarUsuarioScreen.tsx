import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HojaInferior } from '@/features/eventos/interfaz/HojaInferior';
import { RadioMark } from '@/features/eventos/interfaz/RadioMark';
import { colors, radius } from '@/shared/theme';
import { AppText, Button, Card, SearchField, TextField } from '@/shared/ui';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import { useEstructuraDelAdmin } from '../datos/useGestionAdmin';
import { useDarCargo, useUsuariosDelAdmin } from '../datos/useUsuariosDelAdmin';
import type { DatosDelEncargado } from '../dominio/encargados';
import { buscarIglesiasDelAdmin, type IglesiaDelAdmin } from '../dominio/estructuraDelAdmin';
import {
  getMensajeDeAlta,
  OPCIONES_DE_CARGO,
  prepararOtroCargo,
  validarAlta,
  type ErroresDeAlta,
  type TipoDeCargo,
  type UsuarioDelAdmin,
} from '../dominio/usuariosDelAdmin';
import { HojaDeDistrito } from './HojaDeDistrito';
import {
  AvisoSinConexion,
  Campo,
  ErrorAlGuardar,
  EstadoDelFormulario,
  PantallaDeFormulario,
  useSalir,
} from './FormularioDelAdmin';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/09d-usuario.html.
const CARD_GAP = 12; // line 64
const FIXED_FIELD_GAP = 4;
const FIELD_GAP = 6; // line 74
const OPTION_MIN_HEIGHT = 56; // line 72
const OPTION_GAP = 14;
const PICKER_MIN_HEIGHT = 56; // line 76
const PICKER_PADDING_LEFT = 16;
const PICKER_PADDING_RIGHT = 12;
const PICKER_GAP = 10;
const PICKER_ICON_SIZE = 22;
const PICKER_ICON_STROKE_WIDTH = 2.4;
const PICKER_BACKGROUND = '#EEF1F5';
const SHEET_ROW_MIN_HEIGHT = 60;
const SHEET_ROW_GAP = 14;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/**
 * Agregar usuario: gives one cargo, as encargado or secretaria of an iglesia or
 * as pastor of a distrito, to the usuario of a correo, who is created when the
 * correo has no account. From Usuario ("Darle otro cargo"), the nombre and the
 * correo are theirs and do not change. The cargo of admin is never offered.
 */
export function AgregarUsuarioScreen({ usuarioId }: { usuarioId: string | undefined }) {
  const salir = useSalir();
  const estructura = useEstructuraDelAdmin();
  const usuarios = useUsuariosDelAdmin(
    usuarioId === undefined ? undefined : estructura.data?.asociacion.id,
  );
  const usuario =
    usuarioId === undefined ? null : usuarios.data?.find((uno) => uno.usuarioId === usuarioId);
  const delAdmin = estructura.data;
  const listo = delAdmin && usuario !== undefined;

  return (
    <PantallaDeFormulario titulo="Agregar usuario" onClose={salir}>
      {listo ? (
        <Formulario
          usuario={usuario}
          distritos={delAdmin.distritos}
          iglesias={delAdmin.iglesias}
          onClose={salir}
        />
      ) : (
        <EstadoDelFormulario
          cargando={estructura.isPending || usuarios.isFetching}
          error={estructura.isError || usuarios.isError}
          onRetry={() => (estructura.isError ? estructura.refetch() : usuarios.refetch())}
          onClose={salir}
          ausente={
            estructura.data === null
              ? 'No tenés una asociación a cargo.'
              : 'Este usuario ya no tiene cargos.'
          }
        />
      )}
    </PantallaDeFormulario>
  );
}

type FormularioProps = {
  /** Who gets another cargo; null for someone new. */
  usuario: UsuarioDelAdmin | null;
  distritos: readonly { id: string; nombre: string }[];
  iglesias: IglesiaDelAdmin[];
  onClose: () => void;
};

function Formulario({ usuario, distritos, iglesias, onClose }: FormularioProps) {
  const conConexion = useOnlineStatus();
  const dar = useDarCargo();
  // Someone who already has an account keeps their correo; without a perfil, their nombre is asked.
  const [preparado] = useState(() => (usuario === null ? null : prepararOtroCargo(usuario)));
  const [datos, setDatos] = useState<DatosDelEncargado>(() =>
    preparado?.ok ? preparado.datos : { nombre: '', correo: '', funcion: '' },
  );
  const pideNombre = preparado === null || (preparado.ok && preparado.pideNombre);
  const sinCorreo = preparado !== null && !preparado.ok ? preparado.error : undefined;
  const [tipo, setTipo] = useState<TipoDeCargo | null>(null);
  const [lugarId, setLugarId] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  // The fields only show what is wrong after a first attempt to save.
  const [errores, setErrores] = useState<ErroresDeAlta>({});
  const [mensaje, setMensaje] = useState<{ titulo: string; texto: string } | null>(null);

  const esPastor = tipo === 'pastor';
  const lugares = esPastor ? distritos : iglesias;
  const lugar = lugares.find((uno) => uno.id === lugarId) ?? null;

  const cambiar = (campo: keyof DatosDelEncargado) => (valor: string) =>
    setDatos((anteriores) => ({ ...anteriores, [campo]: valor }));

  const onElegirTipo = (nuevo: TipoDeCargo) => {
    // An iglesia stays chosen between encargado and secretaria; a distrito is another kind of place.
    if ((nuevo === 'pastor') !== esPastor) {
      setLugarId(null);
    }
    setTipo(nuevo);
    setErrores(({ cargo: _cargo, lugar: _lugar, ...resto }) => resto);
  };

  const onAgregar = () => {
    const validado = validarAlta(datos, tipo, lugarId);
    if (!validado.ok) {
      setErrores(validado.errores);
      return;
    }
    setErrores({});
    setMensaje(null);
    dar.mutate(validado.invitacion, {
      onSuccess: (resultado) => {
        if (resultado.ok) {
          onClose();
        } else {
          setMensaje(getMensajeDeAlta(resultado.falla));
        }
      },
    });
  };

  return (
    <>
      {!conConexion && <AvisoSinConexion />}

      <Card style={styles.card}>
        {usuario === null ? (
          <>
            <Campo error={errores.nombre}>
              <TextField
                label="Nombre"
                value={datos.nombre}
                onChangeText={cambiar('nombre')}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
              />
            </Campo>
            <Campo error={errores.correo}>
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
            </Campo>
          </>
        ) : (
          <>
            {pideNombre ? (
              <Campo error={errores.nombre}>
                <TextField
                  label="Nombre"
                  value={datos.nombre}
                  onChangeText={cambiar('nombre')}
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                />
              </Campo>
            ) : (
              <View style={styles.fixedField}>
                <AppText variant="label">Nombre</AppText>
                <AppText variant="cuerpoGrande">{usuario.nombre}</AppText>
              </View>
            )}
            <Campo error={sinCorreo}>
              <View style={styles.fixedField}>
                <AppText variant="label">Correo</AppText>
                <AppText variant="cuerpoGrande">{usuario.correo ?? '—'}</AppText>
              </View>
            </Campo>
          </>
        )}

        <Campo error={errores.cargo}>
          <AppText variant="label" nativeID="tituloCargo">
            Cargo
          </AppText>
          <View accessibilityRole="radiogroup" accessibilityLabelledBy="tituloCargo">
            {OPCIONES_DE_CARGO.map(({ valor, label }, index) => {
              const checked = valor === tipo;
              return (
                <Pressable
                  key={valor}
                  accessibilityRole="radio"
                  accessibilityState={{ checked }}
                  onPress={() => onElegirTipo(valor)}
                  style={({ pressed }) => [
                    styles.option,
                    index < OPCIONES_DE_CARGO.length - 1 && styles.optionDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <RadioMark checked={checked} />
                  <AppText weight="semibold">{label}</AppText>
                </Pressable>
              );
            })}
          </View>
        </Campo>

        {tipo !== null && (
          <Campo error={errores.lugar}>
            <View style={styles.field}>
              <AppText variant="label">{esPastor ? 'Distrito' : 'Iglesia'}</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${esPastor ? 'Distrito' : 'Iglesia'}: ${
                  lugar?.nombre ?? 'sin elegir'
                }`}
                onPress={() => setEligiendo(true)}
                style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
              >
                <AppText
                  variant="cuerpoGrande"
                  color={lugar === null ? 'textoSecundario' : 'texto'}
                >
                  {lugar?.nombre ?? (esPastor ? 'Elegí el distrito' : 'Elegí la iglesia')}
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
                  <Path d="M6 9l6 6 6-6" />
                </Svg>
              </Pressable>
            </View>
          </Campo>
        )}
      </Card>

      {mensaje !== null && <ErrorAlGuardar mensaje={mensaje} />}

      <Button
        label={mensaje === null ? 'Agregar usuario' : 'Probar de nuevo'}
        disabled={!conConexion || dar.isPending || sinCorreo !== undefined}
        onPress={onAgregar}
      />

      {esPastor ? (
        <HojaDeDistrito
          visible={eligiendo}
          title="Elegí el distrito"
          distritos={distritos}
          selected={lugarId}
          onSelect={(id) => {
            setLugarId(id);
            setEligiendo(false);
          }}
          onClose={() => setEligiendo(false)}
        />
      ) : (
        <HojaDeIglesia
          visible={eligiendo}
          iglesias={iglesias}
          selected={lugarId}
          onSelect={(id) => {
            setLugarId(id);
            setEligiendo(false);
          }}
          onClose={() => setEligiendo(false)}
        />
      )}
    </>
  );
}

type HojaDeIglesiaProps = {
  visible: boolean;
  iglesias: IglesiaDelAdmin[];
  selected: string | null;
  onSelect: (iglesiaId: string) => void;
  onClose: () => void;
};

/** The iglesias of the asociacion, with a search: there can be many. */
function HojaDeIglesia({ visible, iglesias, selected, onSelect, onClose }: HojaDeIglesiaProps) {
  const [texto, setTexto] = useState('');
  const encontradas = buscarIglesiasDelAdmin(iglesias, texto);

  return (
    <HojaInferior visible={visible} title="Elegí la iglesia" onClose={onClose}>
      <SearchField
        value={texto}
        onChangeText={setTexto}
        placeholder="Buscar iglesia"
        accessibilityLabel="Buscar iglesia"
      />
      <View accessibilityRole="radiogroup">
        {encontradas.map((iglesia) => {
          const checked = iglesia.id === selected;
          return (
            <Pressable
              key={iglesia.id}
              accessibilityRole="radio"
              accessibilityState={{ checked }}
              accessibilityLabel={`${iglesia.nombre}, ${iglesia.distritoNombre}`}
              onPress={() => onSelect(iglesia.id)}
              style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
            >
              <RadioMark checked={checked} />
              <View style={styles.sheetRowTexts}>
                <AppText variant="cuerpoGrande" weight={checked ? 'bold' : 'regular'}>
                  {iglesia.nombre}
                </AppText>
                <AppText variant="secundario" color="textoSecundario">
                  {iglesia.distritoNombre} · {iglesia.localidad}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </HojaInferior>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_GAP,
  },
  fixedField: {
    gap: FIXED_FIELD_GAP,
  },
  field: {
    gap: FIELD_GAP,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: OPTION_GAP,
    minHeight: OPTION_MIN_HEIGHT,
  },
  optionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PICKER_GAP,
    minHeight: PICKER_MIN_HEIGHT,
    paddingLeft: PICKER_PADDING_LEFT,
    paddingRight: PICKER_PADDING_RIGHT,
    borderRadius: radius.campo,
    backgroundColor: PICKER_BACKGROUND,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SHEET_ROW_GAP,
    minHeight: SHEET_ROW_MIN_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  sheetRowTexts: {
    flexShrink: 1,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
