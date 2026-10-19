import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { HojaInferior } from '@/features/eventos/interfaz/HojaInferior';
import { getCiudadYProvincia } from '@/features/iglesias/dominio/ciudadYProvincia';
import { newId } from '@/shared/newId';
import { accesibilidad, colors, fontSize, radius } from '@/shared/theme';
import { AppText, Button, Card, SearchField, TextField } from '@/shared/ui';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import {
  useEstructuraDelAdmin,
  useGuardarDistrito,
  useMoverIglesia,
} from '../datos/useGestionAdmin';
import {
  getBloqueoDeBajaDeDistrito,
  getConfirmacionDeBajaDeDistrito,
} from '../dominio/bajaDeEstructura';
import type { DistritoDelAdmin } from '../dominio/distritosSinPastor';
import {
  buscarIglesiasDelAdmin,
  getAvisoDeCambioDeDistrito,
  getEtiquetaDePastores,
  validarDistrito,
  type ErroresDelDistrito,
  type IglesiaDelAdmin,
} from '../dominio/estructuraDelAdmin';
import { DarDeBaja } from './BajaDelAdmin';
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
// numbers are those of diseno/pantallas/09c-distrito.html.
const CARD_GAP = 16;
const CARD_PADDING_VERTICAL = 18;
const FIXED_FIELD_GAP = 4;
const SECTION_GAP = 10;
const SECTION_TITLE_SIZE = 19;
const SECTION_MARGIN_HORIZONTAL = 4;
const ROW_GAP = 12;
const ROW_PADDING_VERTICAL = 12;
const ROW_PADDING_LEFT = 18;
const ROW_PADDING_RIGHT = 14;
const ROW_TEXTS_GAP = 2;
const ROW_TITLE_SIZE = 17;
const SACAR_MIN_HEIGHT = 44;
const SACAR_PADDING_HORIZONTAL = 16;
const ADD_GAP = 10;
const ADD_ICON_SIZE = 22;
const ADD_ICON_STROKE_WIDTH = 2.6;
const SHEET_GAP = 12;
const SHEET_ROW_MIN_HEIGHT = 60;
const SHEET_ROW_PADDING_VERTICAL = 10;
const CHEVRON_SIZE = 20;
const CHEVRON_STROKE_WIDTH = 2.4;
const MOVIDA_PADDING_VERTICAL = 12;
const MOVIDA_PADDING_HORIZONTAL = 14;
const PARAGRAPH_LINE_HEIGHT = 1.4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

export type ModoDeDistrito = { tipo: 'nuevo' } | { tipo: 'editar'; distritoId: string };

/**
 * Nuevo or Editar distrito, for the admin. A new distrito is only its nombre;
 * editing one also shows its pastor and its iglesias, which "Sacar" moves to
 * another distrito and "Agregar iglesia" brings from another one or creates.
 */
export function DistritoFormScreen({ modo }: { modo: ModoDeDistrito }) {
  const salir = useSalir();
  const consulta = useEstructuraDelAdmin();
  const estructura = consulta.data;
  const distrito =
    modo.tipo === 'editar'
      ? estructura?.distritos.find((uno) => uno.id === modo.distritoId)
      : undefined;

  return (
    <PantallaDeFormulario
      titulo={modo.tipo === 'nuevo' ? 'Nuevo distrito' : 'Editar distrito'}
      onClose={salir}
    >
      {estructura && (modo.tipo === 'nuevo' || distrito) ? (
        <Formulario
          asociacionId={estructura.asociacion.id}
          distrito={distrito ?? null}
          distritos={estructura.distritos}
          iglesias={estructura.iglesias}
          onClose={salir}
        />
      ) : (
        <EstadoDelFormulario
          cargando={consulta.isPending}
          error={consulta.isError}
          onRetry={() => consulta.refetch()}
          onClose={salir}
          ausente="Este distrito ya no está en la lista."
        />
      )}
    </PantallaDeFormulario>
  );
}

type FormularioProps = {
  asociacionId: string;
  /** The distrito being edited; null when creating one. */
  distrito: DistritoDelAdmin | null;
  distritos: DistritoDelAdmin[];
  iglesias: IglesiaDelAdmin[];
  onClose: () => void;
};

function Formulario({ asociacionId, distrito, distritos, iglesias, onClose }: FormularioProps) {
  const router = useRouter();
  const conConexion = useOnlineStatus();
  // A new distrito gets its id here, once: every try sends the same one.
  const [nuevoId] = useState(newId);
  const guardar = useGuardarDistrito(
    asociacionId,
    distrito === null ? { crear: nuevoId } : { editar: distrito.id },
  );
  const [nombre, setNombre] = useState(distrito?.nombre ?? '');
  // The field only shows what is wrong after a first attempt to save.
  const [errores, setErrores] = useState<ErroresDelDistrito>({});
  const [fallo, setFallo] = useState(false);
  const [sacando, setSacando] = useState<IglesiaDelAdmin | null>(null);
  const [agregando, setAgregando] = useState(false);

  const onGuardar = () => {
    const validado = validarDistrito({ nombre });
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

  const boton = fallo
    ? 'Probar de nuevo'
    : distrito === null
      ? 'Crear distrito'
      : 'Guardar cambios';
  const propias = distrito === null ? [] : iglesias.filter((una) => una.distritoId === distrito.id);
  const pastores = distrito === null ? null : getEtiquetaDePastores(distrito.pastores);

  return (
    <>
      {!conConexion && <AvisoSinConexion />}

      <Card style={styles.card}>
        <Campo error={errores.nombre}>
          <TextField
            label="Nombre"
            value={nombre}
            onChangeText={setNombre}
            autoCapitalize="words"
          />
        </Campo>

        {distrito !== null && (
          // "Nombrar pastor" comes with the gestion of the usuarios.
          <View style={styles.fixedField}>
            <AppText variant="label">Pastor</AppText>
            <AppText variant="cuerpoGrande">{pastores ?? 'Sin pastor'}</AppText>
          </View>
        )}
      </Card>

      {distrito !== null && (
        <>
          <View style={styles.section}>
            <AppText weight="bold" accessibilityRole="header" style={styles.sectionTitle}>
              Iglesias ({propias.length})
            </AppText>
            {propias.length > 0 && (
              <View style={styles.list}>
                {propias.map((iglesia, index) => (
                  <View
                    key={iglesia.id}
                    style={[styles.row, index < propias.length - 1 && styles.rowDivider]}
                  >
                    <View style={styles.rowTexts}>
                      <AppText weight="bold" style={styles.rowTitle}>
                        {iglesia.nombre}
                      </AppText>
                      <AppText variant="secundario" color="textoSecundario">
                        {getCiudadYProvincia(iglesia)}
                      </AppText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Sacar ${iglesia.nombre}`}
                      accessibilityHint="Elegí a qué distrito pasa"
                      disabled={!conConexion}
                      onPress={() => setSacando(iglesia)}
                      style={({ pressed }) => [
                        styles.sacar,
                        pressed && styles.pressed,
                        !conConexion && styles.disabled,
                      ]}
                    >
                      <AppText weight="bold" color="azulOscuro">
                        Sacar
                      </AppText>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setAgregando(true)}
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Svg
              width={ADD_ICON_SIZE}
              height={ADD_ICON_SIZE}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.azulOscuro}
              strokeWidth={ADD_ICON_STROKE_WIDTH}
              strokeLinecap="round"
            >
              <Path d="M12 5v14M5 12h14" />
            </Svg>
            <AppText variant="cuerpoGrande" weight="bold" color="azulOscuro">
              Agregar iglesia
            </AppText>
          </Pressable>
        </>
      )}

      {fallo && <ErrorAlGuardar />}

      <Button label={boton} disabled={!conConexion || guardar.isPending} onPress={onGuardar} />

      {distrito !== null && (
        // Only without active iglesias: the admin moves them first (09c).
        <DarDeBaja
          baja={{ distritoId: distrito.id }}
          confirmacion={getConfirmacionDeBajaDeDistrito(distrito.nombre, distrito.pastores.length)}
          bloqueo={getBloqueoDeBajaDeDistrito(propias.length)}
          onHecho={onClose}
        />
      )}

      {distrito !== null && sacando !== null && (
        <HojaSacar
          iglesia={sacando}
          distritos={distritos.filter((uno) => uno.id !== distrito.id)}
          onClose={() => setSacando(null)}
        />
      )}

      {distrito !== null && (
        <HojaInferior
          visible={agregando}
          title={`Agregar iglesia al ${distrito.nombre}`}
          onClose={() => setAgregando(false)}
        >
          <AgregarIglesia
            iglesias={iglesias.filter((una) => una.distritoId !== distrito.id)}
            onElegir={(iglesia) => {
              setAgregando(false);
              // Editar iglesia, with this distrito chosen: it shows what the
              // move does before saving it.
              router.push({
                pathname: '/gestion/iglesia/[id]',
                params: { id: iglesia.id, distrito: distrito.id },
              });
            }}
            onCrear={() => {
              setAgregando(false);
              router.push({
                pathname: '/gestion/iglesia/nueva',
                params: { distrito: distrito.id },
              });
            }}
          />
        </HojaInferior>
      )}
    </>
  );
}

type HojaSacarProps = {
  iglesia: IglesiaDelAdmin;
  /** The other distritos: every iglesia belongs to one, so "Sacar" always moves it. */
  distritos: DistritoDelAdmin[];
  onClose: () => void;
};

/** "¿A qué distrito pasa…?": moves the iglesia to the distrito chosen (capture 9h). */
function HojaSacar({ iglesia, distritos, onClose }: HojaSacarProps) {
  const conConexion = useOnlineStatus();
  const mover = useMoverIglesia();
  const [destino, setDestino] = useState<string | null>(distritos[0]?.id ?? null);
  const [fallo, setFallo] = useState(false);
  const nombreDelDestino = distritos.find((uno) => uno.id === destino)?.nombre ?? null;

  const onMover = () => {
    if (destino === null) return;
    setFallo(false);
    mover.mutate(
      { iglesiaId: iglesia.id, distritoId: destino },
      { onSuccess: (resultado) => (resultado.ok ? onClose() : setFallo(true)) },
    );
  };

  return (
    <HojaDeDistrito
      visible
      title={`¿A qué distrito pasa ${iglesia.nombre}?`}
      distritos={distritos}
      selected={destino}
      onSelect={setDestino}
      onClose={onClose}
    >
      <View style={styles.sheetEnd}>
        {nombreDelDestino !== null && (
          <View accessibilityRole="text" style={styles.movida}>
            <AppText variant="secundario" style={styles.movidaText}>
              {getAvisoDeCambioDeDistrito(iglesia.distritoNombre, nombreDelDestino)}
            </AppText>
          </View>
        )}
        {fallo && <ErrorAlGuardar />}
        {!conConexion && <AvisoSinConexion />}
        <Button
          label={
            fallo
              ? 'Probar de nuevo'
              : nombreDelDestino === null
                ? 'No hay otro distrito'
                : `Pasar al ${nombreDelDestino}`
          }
          disabled={destino === null || !conConexion || mover.isPending}
          onPress={onMover}
        />
        <Button label="Cancelar" variant="text" onPress={onClose} />
      </View>
    </HojaDeDistrito>
  );
}

type AgregarIglesiaProps = {
  /** The iglesias of the other distritos. */
  iglesias: IglesiaDelAdmin[];
  onElegir: (iglesia: IglesiaDelAdmin) => void;
  onCrear: () => void;
};

/** "Agregar iglesia": one from another distrito, or a new one (capture 9i). */
function AgregarIglesia({ iglesias, onElegir, onCrear }: AgregarIglesiaProps) {
  const [texto, setTexto] = useState('');
  const encontradas = buscarIglesiasDelAdmin(iglesias, texto);

  return (
    <View style={styles.sheetEnd}>
      <SearchField
        value={texto}
        onChangeText={setTexto}
        placeholder="Buscar iglesia"
        accessibilityLabel="Buscar iglesia"
      />
      <View>
        {encontradas.map((iglesia) => (
          <Pressable
            key={iglesia.id}
            accessibilityRole="button"
            accessibilityHint="Abre la iglesia para pasarla a este distrito"
            onPress={() => onElegir(iglesia)}
            style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
          >
            <View style={styles.rowTexts}>
              <AppText variant="cuerpoGrande" weight="bold">
                {iglesia.nombre}
              </AppText>
              <AppText color="textoSecundario">Hoy en {iglesia.distritoNombre}</AppText>
            </View>
            <Svg
              width={CHEVRON_SIZE}
              height={CHEVRON_SIZE}
              viewBox="0 0 24 24"
              fill="none"
              stroke={colors.textoTenue}
              strokeWidth={CHEVRON_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={styles.chevron}
            >
              <Path d="M9 6l6 6-6 6" />
            </Svg>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onCrear}
        style={({ pressed }) => [styles.add, pressed && styles.pressed]}
      >
        <Svg
          width={ADD_ICON_SIZE}
          height={ADD_ICON_SIZE}
          viewBox="0 0 24 24"
          fill="none"
          stroke={colors.azulOscuro}
          strokeWidth={ADD_ICON_STROKE_WIDTH}
          strokeLinecap="round"
        >
          <Path d="M12 5v14M5 12h14" />
        </Svg>
        <AppText variant="cuerpoGrande" weight="bold" color="azulOscuro">
          Crear una iglesia nueva
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_GAP,
    paddingVertical: CARD_PADDING_VERTICAL,
  },
  fixedField: {
    gap: FIXED_FIELD_GAP,
  },
  section: {
    gap: SECTION_GAP,
  },
  sectionTitle: {
    marginHorizontal: SECTION_MARGIN_HORIZONTAL,
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
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingLeft: ROW_PADDING_LEFT,
    paddingRight: ROW_PADDING_RIGHT,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  rowTexts: {
    flex: 1,
    gap: ROW_TEXTS_GAP,
  },
  rowTitle: {
    fontSize: ROW_TITLE_SIZE,
  },
  sacar: {
    minHeight: SACAR_MIN_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: SACAR_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: colors.azulSuave,
  },
  disabled: {
    opacity: 0.45,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ADD_GAP,
    minHeight: accesibilidad.alturaBotonPrincipal,
    borderRadius: radius.boton,
    backgroundColor: colors.azulSuave,
  },
  sheetEnd: {
    gap: SHEET_GAP,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: SHEET_ROW_MIN_HEIGHT,
    paddingVertical: SHEET_ROW_PADDING_VERTICAL,
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  chevron: {
    flexShrink: 0,
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
