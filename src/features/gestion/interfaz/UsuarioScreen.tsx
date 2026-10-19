import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fontSize, radius } from '@/shared/theme';
import { AppText, Button, Card, ConfirmDialog, DialogText, TextField } from '@/shared/ui';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import { useEstructuraDelAdmin } from '../datos/useGestionAdmin';
import {
  useCambiarCorreo,
  useGuardarFuncion,
  useGuardarNombre,
  useQuitarCargo,
  useUsuariosDelAdmin,
} from '../datos/useUsuariosDelAdmin';
import { getMensajeDeError, getTextosDeQuitar, validarEncargado } from '../dominio/encargados';
import {
  describirCargo,
  getAvisoDeCambioDeCorreo,
  getMensajeDeCambioDeCorreo,
  getMensajeDeEdicion,
  validarCorreoNuevo,
  validarFuncion,
  type CargoDelUsuario,
  type UsuarioDelAdmin,
} from '../dominio/usuariosDelAdmin';
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
const CARD_GAP = 16; // line 37
const FIXED_FIELD_GAP = 4; // line 42
const LINK_MIN_HEIGHT = 44; // line 45
const SECTION_TITLE_SIZE = 19; // line 48
const SECTION_TITLE_MARGIN = 4;
const ROW_GAP = 12; // line 51
const ROW_MIN_HEIGHT = 48;
const ROW_PADDING_VERTICAL = 12;
const ROW_PADDING_LEFT = 18;
const ROW_PADDING_RIGHT = 14;
const ROW_TEXTS_GAP = 1; // line 52
const ROW_TITLE_SIZE = 17;
const QUITAR_MIN_HEIGHT = 44; // line 53
const QUITAR_PADDING_HORIZONTAL = 14;
const QUITAR_RADIUS = 12;
const QUITAR_BORDER_WIDTH = 2;
const AVISO_BACKGROUND = '#FFF1CC'; // line 111
const AVISO_COLOR = '#6B4E00';
const AVISO_PADDING_VERTICAL = 12;
const AVISO_PADDING_HORIZONTAL = 14;
const PARAGRAPH_LINE_HEIGHT = 1.4;
const DISABLED_OPACITY = 0.45;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type Vista = { tipo: 'usuario' } | { tipo: 'correo' } | { tipo: 'funcion'; cargoId: string };

/**
 * A usuario of the asociacion, for the admin: their nombre, their correo and
 * each of their cargos, which the admin removes one by one or whose funcion
 * they edit. The correo changes in its own view, as does the funcion. The
 * cargo of admin never shows.
 */
export function UsuarioScreen({ usuarioId }: { usuarioId: string }) {
  const salir = useSalir();
  const estructura = useEstructuraDelAdmin();
  const consulta = useUsuariosDelAdmin(estructura.data?.asociacion.id);
  const usuario = consulta.data?.find((uno) => uno.usuarioId === usuarioId);
  const [vista, setVista] = useState<Vista>({ tipo: 'usuario' });
  const volver = () => setVista({ tipo: 'usuario' });

  if (usuario === undefined) {
    return (
      <PantallaDeFormulario titulo="Usuario" icono="back" onClose={salir}>
        <EstadoDelFormulario
          cargando={estructura.isPending || (estructura.data !== null && consulta.isPending)}
          error={estructura.isError || consulta.isError}
          onRetry={() => (estructura.isError ? estructura.refetch() : consulta.refetch())}
          onClose={salir}
          ausente="Este usuario ya no tiene cargos."
        />
      </PantallaDeFormulario>
    );
  }

  if (vista.tipo === 'correo') {
    return (
      <PantallaDeFormulario titulo="Cambiar correo" onClose={volver}>
        <VistaCorreo usuario={usuario} onListo={volver} />
      </PantallaDeFormulario>
    );
  }

  const cargoDeFuncion =
    vista.tipo === 'funcion'
      ? usuario.cargos.find((cargo) => cargo.cargoId === vista.cargoId)
      : undefined;
  if (cargoDeFuncion !== undefined) {
    return (
      <PantallaDeFormulario titulo="Editar función" onClose={volver}>
        <VistaFuncion usuario={usuario} cargo={cargoDeFuncion} onListo={volver} />
      </PantallaDeFormulario>
    );
  }

  return (
    <PantallaDeFormulario titulo={usuario.nombre} icono="back" onClose={salir}>
      <VistaUsuario
        usuario={usuario}
        onCambiarCorreo={() => setVista({ tipo: 'correo' })}
        onEditarFuncion={(cargoId) => setVista({ tipo: 'funcion', cargoId })}
        onSinCargos={salir}
      />
    </PantallaDeFormulario>
  );
}

type Mensaje = { titulo: string; texto: string };

type VistaUsuarioProps = {
  usuario: UsuarioDelAdmin;
  onCambiarCorreo: () => void;
  onEditarFuncion: (cargoId: string) => void;
  /** After removing their last cargo: they leave the list. */
  onSinCargos: () => void;
};

function VistaUsuario({
  usuario,
  onCambiarCorreo,
  onEditarFuncion,
  onSinCargos,
}: VistaUsuarioProps) {
  const router = useRouter();
  const conConexion = useOnlineStatus();
  const guardarNombre = useGuardarNombre();
  const quitar = useQuitarCargo();
  const ocupado = guardarNombre.isPending || quitar.isPending;
  const apagado = !conConexion || ocupado;

  const [nombreInicial] = useState(usuario.nombreDelPerfil ?? '');
  const [nombre, setNombre] = useState(nombreInicial);
  const [errorDeNombre, setErrorDeNombre] = useState<string | undefined>();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [confirmando, setConfirmando] = useState<CargoDelUsuario | null>(null);

  const onGuardarNombre = () => {
    const validado = validarEncargado({ nombre, correo: '', funcion: '' }, 'editar');
    if (!validado.ok) {
      setErrorDeNombre(validado.errores.nombre);
      return;
    }
    setErrorDeNombre(undefined);
    setMensaje(null);
    setGuardado(false);
    guardarNombre.mutate(
      { cargo: usuario.cargos[0], nombre: validado.valores.nombre },
      {
        onSuccess: (resultado) => {
          if (resultado.ok) {
            setGuardado(true);
            return;
          }
          setMensaje(getMensajeDeEdicion(resultado.falla));
          if (resultado.falla === 'nombre_compartido') {
            setNombre(nombreInicial);
          }
        },
      },
    );
  };

  const onQuitar = (cargo: CargoDelUsuario) => {
    setMensaje(null);
    quitar.mutate(cargo.cargoId, {
      onSuccess: (resultado) => {
        setConfirmando(null);
        if (!resultado.ok) {
          setMensaje(getMensajeDeError('quitar', 'error_servidor'));
        } else if (usuario.cargos.length === 1) {
          onSinCargos();
        }
      },
    });
  };

  const textosDeQuitar =
    confirmando === null ? null : getTextosDeQuitar(usuario.nombre, confirmando.lugar.nombre);

  return (
    <>
      {!conConexion && <AvisoSinConexion />}

      <Card style={styles.card}>
        <Campo error={errorDeNombre}>
          <TextField
            label="Nombre"
            value={nombre}
            onChangeText={(valor) => {
              setNombre(valor);
              setGuardado(false);
            }}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
        </Campo>
        <View style={styles.fixedField}>
          <AppText variant="label">Correo</AppText>
          <AppText variant="cuerpoGrande">{usuario.correo ?? '—'}</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: usuario.correo === null || ocupado }}
            // Leaving the view while saving would hide what the save answers.
            disabled={usuario.correo === null || ocupado}
            onPress={onCambiarCorreo}
            style={({ pressed }) => [
              styles.link,
              pressed && styles.pressed,
              (usuario.correo === null || ocupado) && styles.disabled,
            ]}
          >
            <AppText weight="bold" color="azulOscuro" style={styles.linkLabel}>
              Cambiar correo
            </AppText>
          </Pressable>
        </View>
      </Card>

      <AppText weight="bold" accessibilityRole="header" style={styles.sectionTitle}>
        Cargos
      </AppText>
      <View style={styles.list}>
        {usuario.cargos.map((cargo, index) => {
          const { cargo: titulo, donde } = describirCargo(cargo);
          return (
            <View
              key={cargo.cargoId}
              style={[styles.row, index < usuario.cargos.length - 1 && styles.rowDivider]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Abre la función de este cargo para editarla"
                accessibilityState={{ disabled: ocupado }}
                disabled={ocupado}
                onPress={() => onEditarFuncion(cargo.cargoId)}
                style={({ pressed }) => [
                  styles.rowTexts,
                  pressed && styles.pressed,
                  ocupado && styles.disabled,
                ]}
              >
                <AppText weight="bold" style={styles.rowTitle}>
                  {titulo}
                </AppText>
                <AppText variant="secundario" color="textoSecundario">
                  {donde}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar el cargo de ${titulo} en ${donde}`}
                accessibilityState={{ disabled: apagado }}
                disabled={apagado}
                onPress={() => setConfirmando(cargo)}
                style={({ pressed }) => [
                  styles.quitar,
                  pressed && styles.pressed,
                  apagado && styles.disabled,
                ]}
              >
                <AppText weight="bold" color="peligro">
                  Quitar
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>

      {mensaje !== null && <ErrorAlGuardar mensaje={mensaje} />}
      {guardado && (
        // A state the mockup does not draw.
        <AppText accessibilityRole="alert" color="textoSecundario">
          Se guardó el nombre.
        </AppText>
      )}

      <Button
        label="Darle otro cargo"
        disabled={apagado}
        onPress={() =>
          router.push({
            pathname: '/gestion/usuario/nuevo',
            params: { usuario: usuario.usuarioId },
          })
        }
      />
      <Button
        label="Guardar nombre"
        variant="secondary"
        disabled={apagado}
        onPress={onGuardarNombre}
      />

      {confirmando !== null && textosDeQuitar !== null && (
        <ConfirmDialog
          title={textosDeQuitar.titulo}
          confirmLabel="Quitar cargo"
          tone="danger"
          busy={quitar.isPending}
          onConfirm={() => onQuitar(confirmando)}
          onCancel={() => setConfirmando(null)}
        >
          <DialogText>{textosDeQuitar.texto}</DialogText>
        </ConfirmDialog>
      )}
    </>
  );
}

function VistaCorreo({ usuario, onListo }: { usuario: UsuarioDelAdmin; onListo: () => void }) {
  const conConexion = useOnlineStatus();
  const cambiar = useCambiarCorreo();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);

  const onCambiar = () => {
    const validado = validarCorreoNuevo(correo, usuario.correo);
    if (!validado.ok) {
      setError(validado.error);
      return;
    }
    setError(undefined);
    setMensaje(null);
    cambiar.mutate(
      { usuarioId: usuario.usuarioId, correo: validado.correo },
      {
        onSuccess: (resultado) => {
          if (resultado.ok) {
            onListo();
          } else {
            setMensaje(getMensajeDeCambioDeCorreo(resultado.falla));
          }
        },
      },
    );
  };

  return (
    <>
      {!conConexion && <AvisoSinConexion />}

      <Card style={styles.card}>
        <View style={styles.fixedField}>
          <AppText variant="label">Correo actual</AppText>
          <AppText variant="cuerpoGrande">{usuario.correo ?? '—'}</AppText>
        </View>
        <Campo error={error}>
          <TextField
            label="Correo nuevo"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </Campo>
        <View accessibilityRole="summary" style={styles.aviso}>
          <AppText variant="secundario" style={styles.avisoText}>
            {getAvisoDeCambioDeCorreo(usuario.nombre)}
          </AppText>
        </View>
      </Card>

      {mensaje !== null && <ErrorAlGuardar mensaje={mensaje} />}

      <Button
        label={mensaje === null ? 'Cambiar correo' : 'Probar de nuevo'}
        disabled={!conConexion || cambiar.isPending}
        onPress={onCambiar}
      />
    </>
  );
}

function VistaFuncion({
  usuario,
  cargo,
  onListo,
}: {
  usuario: UsuarioDelAdmin;
  cargo: CargoDelUsuario;
  onListo: () => void;
}) {
  const conConexion = useOnlineStatus();
  const guardar = useGuardarFuncion();
  const [funcion, setFuncion] = useState(cargo.funcion ?? '');
  const [error, setError] = useState<string | undefined>();
  const [mensaje, setMensaje] = useState<Mensaje | null>(null);
  const { cargo: titulo, donde } = describirCargo({ ...cargo, funcion: null });
  // Saving a funcion sends the nombre too: without a perfil there is none to keep.
  const nombre = usuario.nombreDelPerfil;

  const onGuardar = () => {
    const validado = validarFuncion(funcion);
    if (!validado.ok) {
      setError(validado.error);
      return;
    }
    if (nombre === null) {
      return;
    }
    setError(undefined);
    setMensaje(null);
    guardar.mutate(
      { cargoId: cargo.cargoId, nombre, funcion: validado.funcion },
      {
        onSuccess: (resultado) => {
          if (resultado.ok) {
            onListo();
          } else {
            setMensaje(getMensajeDeEdicion(resultado.falla));
          }
        },
      },
    );
  };

  return (
    <>
      {!conConexion && <AvisoSinConexion />}

      <Card style={styles.card}>
        <View style={styles.fixedField}>
          <AppText variant="label">Cargo</AppText>
          <AppText variant="cuerpoGrande">
            {titulo} · {donde}
          </AppText>
        </View>
        <Campo error={error}>
          <TextField
            label="Función"
            value={funcion}
            onChangeText={setFuncion}
            placeholder="Por ejemplo: Tesorero"
            autoCapitalize="sentences"
          />
        </Campo>
        {nombre === null && (
          // A state the mockup does not draw.
          <AppText variant="secundario" color="textoSecundario" style={styles.paragraph}>
            Primero guardale un nombre a esta persona desde su ficha.
          </AppText>
        )}
      </Card>

      {mensaje !== null && <ErrorAlGuardar mensaje={mensaje} />}

      <Button
        label={mensaje === null ? 'Guardar función' : 'Probar de nuevo'}
        disabled={!conConexion || guardar.isPending || nombre === null}
        onPress={onGuardar}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_GAP,
  },
  fixedField: {
    gap: FIXED_FIELD_GAP,
  },
  link: {
    alignSelf: 'flex-start',
    minHeight: LINK_MIN_HEIGHT,
    justifyContent: 'center',
  },
  linkLabel: {
    textDecorationLine: 'underline',
  },
  sectionTitle: {
    marginHorizontal: SECTION_TITLE_MARGIN,
    fontSize: SECTION_TITLE_SIZE,
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingLeft: ROW_PADDING_LEFT,
    paddingRight: ROW_PADDING_RIGHT,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  rowTexts: {
    flexShrink: 1,
    gap: ROW_TEXTS_GAP,
  },
  rowTitle: {
    fontSize: ROW_TITLE_SIZE,
  },
  quitar: {
    marginLeft: 'auto',
    flexShrink: 0,
    minHeight: QUITAR_MIN_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: QUITAR_PADDING_HORIZONTAL,
    borderRadius: QUITAR_RADIUS,
    borderWidth: QUITAR_BORDER_WIDTH,
    borderColor: colors.peligro,
    backgroundColor: colors.superficie,
  },
  aviso: {
    paddingVertical: AVISO_PADDING_VERTICAL,
    paddingHorizontal: AVISO_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: AVISO_BACKGROUND,
  },
  avisoText: {
    color: AVISO_COLOR,
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  paragraph: {
    lineHeight: fontSize.secundario * PARAGRAPH_LINE_HEIGHT,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
