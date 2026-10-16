import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { accesibilidad, colors, fontSize, radius, spacing } from '@/shared/theme';
import { useToday } from '@/features/calendario/interfaz/useToday';
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

import { useEvento } from '../datos/useEvento';
import { getTipoDeError, hasConexion, useGuardarEvento } from '../datos/useEscribirEvento';
import { useOpcionesDeDuenio } from '../datos/useOpcionesDeDuenio';
import { getDuenioDelDetalle } from '../dominio/detalleDeEvento';
import { getMensajeDeError } from '../dominio/errorDeEscritura';
import {
  cambiarDuenio,
  elegirLugar,
  formatFechaDelCampo,
  formatHoraAlEscribir,
  formularioDesdeEvento,
  getNombreDelLugar,
  getPreguntaDeHoraPocoComun,
  formularioVacio,
  isHoraImposible,
  isHoraPocoComun,
  parseHora,
  validarFormulario,
  type FormularioDeEvento,
} from '../dominio/formularioDeEvento';
import {
  countOpciones,
  getDuenioInicial,
  getOpcionDeDuenio,
  type OpcionesDeDuenio,
} from '../dominio/opcionesDeDuenio';
import { HojaDeDuenio } from './HojaDeDuenio';
import { getHastaSugerido } from '../dominio/repeticion';
import { HojaDeFecha } from './HojaDeFecha';
import { HojaDeLugar } from './HojaDeLugar';
import { SelectorDeEnfasis } from './SelectorDeEnfasis';
import { SelectorDeRepeticion } from './SelectorDeRepeticion';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/06-crear-evento.html.
const HEADER_PADDING_TOP = 22; // line 19
const HEADER_GAP = 12;
const CONTENT_PADDING_TOP = 30; // line 26
const CONTENT_PADDING_BOTTOM = 36;
const FIELDS_GAP = 16; // line 28
const FIELDS_PADDING_VERTICAL = 18;
const FIELD_GAP = 8; // line 29
const PICKER_PADDING_LEFT = 16; // line 36
const PICKER_PADDING_RIGHT = 12;
const PICKER_PADDING_VERTICAL = 6;
const PICKER_GAP = 10;
const PICKER_TEXTS_LINE_HEIGHT = 1.2; // line 37
const CHEVRON_SIZE = 22; // line 42
const CHEVRON_STROKE_WIDTH = 2.4;
const DATE_TIME_GAP = 12; // line 47
const DATE_FLEX = 3;
const TIME_FLEX = 2;
const DATE_PADDING_HORIZONTAL = 14; // line 50
const HINT_LINE_HEIGHT = 1.4; // line 45
const BANNER_PADDING = 14;
// The field of the fecha de fin while it cannot be used (line 264).
const DISABLED_FIELD_COLOR = '#F5F6F8';
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;

const SAFE_AREA_EDGES = ['top', 'left', 'right', 'bottom'] as const;

export type ModoDelFormulario =
  /** `fecha` is the day selected in the calendario, if any. */
  { tipo: 'nuevo'; fecha: string | undefined } | { tipo: 'editar'; id: string };

/**
 * Creates an evento, or edits one with the same form loaded with its data. It
 * waits for the duenios the cargos cover, and for the evento when editing.
 */
export function FormularioDeEventoScreen({ modo }: { modo: ModoDelFormulario }) {
  const router = useRouter();
  const opciones = useOpcionesDeDuenio();
  const evento = useEvento(modo.tipo === 'editar' ? modo.id : '', modo.tipo === 'editar');
  const title = modo.tipo === 'nuevo' ? 'Nuevo evento' : 'Editar evento';

  const leave = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/calendario');
    }
  };

  const renderContent = () => {
    if (opciones.data && (modo.tipo === 'nuevo' || evento.data)) {
      const initial =
        modo.tipo === 'nuevo' || !evento.data
          ? formularioVacio(
              getDuenioInicial(opciones.data),
              modo.tipo === 'nuevo' ? (modo.fecha ?? null) : null,
            )
          : formularioDesdeEvento(evento.data.evento, evento.data.fechas);

      return (
        <Formulario
          opciones={opciones.data}
          initial={initial}
          id={modo.tipo === 'editar' ? modo.id : undefined}
          onClose={leave}
        />
      );
    }

    // States the mockup does not draw.
    if (modo.tipo === 'editar' && evento.data === null) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            Este evento ya no existe.
          </AppText>
          <Button label="Volver al calendario" variant="secondary" onPress={leave} />
        </Card>
      );
    }

    if (opciones.isError || evento.isError) {
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            No se pudo preparar el formulario. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button
            label="Reintentar"
            variant="secondary"
            onPress={() => {
              opciones.refetch();
              if (evento.isError) void evento.refetch();
            }}
          />
        </Card>
      );
    }

    return (
      <Card>
        <AppText color="textoSecundario" style={styles.paragraph}>
          Cargando…
        </AppText>
      </Card>
    );
  };

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <BackButton icon="close" onPress={leave} />
        <AppText variant="tituloEncabezado" accessibilityRole="header">
          {title}
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
  opciones: OpcionesDeDuenio;
  initial: FormularioDeEvento;
  /** The evento being edited; undefined for a new one. */
  id: string | undefined;
  /** Leaves the form, after saving or when the evento no longer exists. */
  onClose: () => void;
};

function Formulario({ opciones, initial, id, onClose }: FormularioProps) {
  const [formulario, setFormulario] = useState(initial);
  // The fields only show what is missing after a first attempt to save.
  const [triedToSave, setTriedToSave] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [openSheet, setOpenSheet] = useState<
    'duenio' | 'fecha' | 'fechaFin' | 'finDeSerie' | 'lugar' | null
  >(null);
  // A hora of the madrugada is asked about once; the one of an evento loaded to
  // be edited was already accepted when it was created.
  const [horaConfirmada, setHoraConfirmada] = useState(() => parseHora(initial.hora));
  // Who asked about the hora: leaving its field, or "Guardar", which goes on after "Sí".
  const [preguntaDeHora, setPreguntaDeHora] = useState<'campo' | 'guardar' | null>(null);
  // Counts the times "Cambiar" was tapped: each one moves the focus to the hora.
  const [focusHoraRequests, setFocusHoraRequests] = useState(0);
  const horaInput = useRef<TextInput>(null);
  const guardar = useGuardarEvento(id);
  const hoy = useToday();
  const editando = id !== undefined;
  const seRepite = formulario.repeticion !== 'ninguna';

  const result = validarFormulario(formulario, { hoy, editando });
  const errores = triedToSave && !result.ok ? result.errores : {};
  const opcionDeDuenio = getOpcionDeDuenio(opciones, formulario.duenio);
  const severalDuenios = countOpciones(opciones) > 1;
  const nombreDelLugar = getNombreDelLugar(formulario.lugar);
  const hora = parseHora(formulario.hora);
  const horaSinConfirmar = hora !== null && isHoraPocoComun(hora) && hora !== horaConfirmada;
  // An impossible hora is told as soon as it is written, not when saving.
  const errorDeHora =
    errores.hora ??
    (isHoraImposible(formulario.hora)
      ? 'Esa hora no existe. Escribila, por ejemplo, 19:00.'
      : undefined);

  // "Cambiar" leaves the person back in the field of the hora, once the dialog is closed.
  useEffect(() => {
    if (focusHoraRequests > 0) {
      horaInput.current?.focus();
    }
  }, [focusHoraRequests]);

  const update = (changes: Partial<FormularioDeEvento>) => {
    setFormulario((current) => ({ ...current, ...changes }));
  };

  const save = () => {
    setTriedToSave(true);
    setSaveError(null);

    if (!result.ok) {
      return;
    }

    if (horaSinConfirmar) {
      setPreguntaDeHora('guardar');
      return;
    }

    persist();
  };

  const persist = () => {
    if (!result.ok) {
      return;
    }

    // What was written stays in the form whatever happens.
    if (!hasConexion()) {
      setSaveError(getMensajeDeError('sin-conexion'));
      return;
    }

    guardar.mutate(result.evento, {
      onSuccess: onClose,
      onError: (error) => {
        const tipo = getTipoDeError(error);

        // Saving again would fail the same way: there is nothing left to edit.
        if (tipo === 'no-existe') {
          Alert.alert('No se pudo guardar', getMensajeDeError(tipo));
          onClose();
          return;
        }

        setSaveError(getMensajeDeError(tipo));
      },
    });
  };

  return (
    <>
      <View style={styles.fields}>
        <Field error={errores.titulo}>
          <TextField
            label="Título"
            value={formulario.titulo}
            onChangeText={(titulo) => update({ titulo })}
            returnKeyType="next"
          />
        </Field>

        <Field error={errores.duenio}>
          <AppText variant="label" nativeID="duenio">
            Dueño
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Dueño: ${opcionDeDuenio?.nombre ?? 'sin elegir'}`}
            // With a single possible duenio there is nothing to choose.
            disabled={!severalDuenios}
            onPress={() => setOpenSheet('duenio')}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          >
            <View style={styles.pickerTexts}>
              {opcionDeDuenio ? (
                <>
                  <AppText variant="cuerpoGrande" style={styles.pickerLine}>
                    {opcionDeDuenio.nombre}
                  </AppText>
                  <AppText variant="chico">{opcionDeDuenio.detalle}</AppText>
                </>
              ) : (
                <AppText variant="cuerpoGrande" color="textoTenue">
                  Elegir
                </AppText>
              )}
            </View>
            {severalDuenios && <Chevron />}
          </Pressable>
          {opcionDeDuenio && (
            <AppText variant="chico" style={styles.hint}>
              {getDuenioDelDetalle(opcionDeDuenio.duenio, opcionDeDuenio.nombre).seVe}.
            </AppText>
          )}
        </Field>

        <View style={styles.dateTime}>
          <View style={styles.date}>
            <Field error={errores.fecha}>
              <AppText variant="label">Fecha</AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Fecha: ${
                  formulario.fecha ? formatFechaDelCampo(formulario.fecha) : 'sin elegir'
                }`}
                onPress={() => setOpenSheet('fecha')}
                style={({ pressed }) => [styles.dateBox, pressed && styles.pressed]}
              >
                <AppText
                  variant="cuerpoGrande"
                  color={formulario.fecha ? 'texto' : 'textoTenue'}
                  numberOfLines={1}
                >
                  {formulario.fecha ? formatFechaDelCampo(formulario.fecha) : 'Elegir'}
                </AppText>
              </Pressable>
            </Field>
          </View>
          <View style={styles.time}>
            <Field error={errorDeHora}>
              <TextField
                ref={horaInput}
                label="Hora"
                value={formulario.hora}
                onChangeText={(texto) =>
                  update({ hora: formatHoraAlEscribir(formulario.hora, texto) })
                }
                onEndEditing={() => {
                  if (horaSinConfirmar) {
                    setPreguntaDeHora('campo');
                  }
                }}
                placeholder="19:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </Field>
          </View>
        </View>

        <Field error={errores.fechaFin}>
          <AppText variant="label" color={seRepite ? 'textoTenue' : 'texto'}>
            Fecha de fin{' '}
            <AppText variant="label" weight="regular" color="textoTenue">
              (opcional)
            </AppText>
          </AppText>
          <View style={styles.endDateRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Fecha de fin: ${
                formulario.fechaFin ? formatFechaDelCampo(formulario.fechaFin) : 'sin fecha de fin'
              }`}
              accessibilityState={{ disabled: seRepite }}
              // A series cannot last several days: one excludes the other.
              disabled={seRepite}
              onPress={() => setOpenSheet('fechaFin')}
              style={({ pressed }) => [
                styles.dateBox,
                styles.endDateBox,
                seRepite && styles.disabledBox,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant={formulario.fechaFin ? 'cuerpoGrande' : 'cuerpo'}
                color={formulario.fechaFin ? 'texto' : 'textoTenue'}
                numberOfLines={1}
              >
                {formulario.fechaFin
                  ? formatFechaDelCampo(formulario.fechaFin)
                  : 'Solo si dura varios días'}
              </AppText>
            </Pressable>
            {formulario.fechaFin !== null && (
              <Button
                label="Quitar"
                variant="secondary"
                onPress={() => update({ fechaFin: null })}
                style={styles.clearButton}
              />
            )}
          </View>
          {seRepite && (
            <AppText variant="chico" style={styles.hint}>
              Un evento que se repite no puede durar varios días.
            </AppText>
          )}
        </Field>

        <View style={styles.field}>
          <AppText variant="label">
            Lugar{' '}
            <AppText variant="label" weight="regular" color="textoTenue">
              (opcional)
            </AppText>
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Lugar: ${nombreDelLugar ?? 'sin lugar'}`}
            accessibilityState={{ disabled: opcionDeDuenio === undefined }}
            // The list is the one of the duenio: without one there is nothing to list.
            disabled={opcionDeDuenio === undefined}
            onPress={() => setOpenSheet('lugar')}
            style={({ pressed }) => [styles.picker, pressed && styles.pressed]}
          >
            <AppText
              variant="cuerpoGrande"
              color={nombreDelLugar === null ? 'textoTenue' : 'texto'}
              style={styles.pickerTexts}
            >
              {nombreDelLugar ?? 'Elegir lugar'}
            </AppText>
            <Chevron />
          </Pressable>
          {opcionDeDuenio === undefined && (
            <AppText variant="chico" style={styles.hint}>
              Primero elegí de quién es el evento.
            </AppText>
          )}
        </View>

        <TextField
          label="Descripción"
          optional
          value={formulario.descripcion}
          onChangeText={(descripcion) => update({ descripcion })}
          placeholder="Algo que los hermanos deban saber"
          multiline
          textAlignVertical="top"
        />
      </View>

      <SelectorDeEnfasis
        selected={formulario.categoria}
        onChange={(categoria) => update({ categoria })}
        error={errores.enfasis}
      />

      <SelectorDeRepeticion
        fecha={formulario.fecha ?? hoy}
        hoy={hoy}
        repeticion={formulario.repeticion}
        finDeSerie={formulario.finDeSerie}
        tieneFechaFin={formulario.fechaFin !== null && formulario.fechaFin !== formulario.fecha}
        editando={editando}
        errorDeRepeticion={errores.repeticion}
        errorDeHasta={errores.finDeSerie}
        onChangeRepeticion={(repeticion) =>
          update({
            repeticion,
            // "Hasta" is suggested a year after the first date, and can be shortened.
            finDeSerie:
              repeticion === 'ninguna' ||
              formulario.finDeSerie !== null ||
              formulario.fecha === null
                ? formulario.finDeSerie
                : getHastaSugerido(formulario.fecha),
          })
        }
        onOpenHasta={() => setOpenSheet('finDeSerie')}
      />

      {(saveError !== null || (triedToSave && !result.ok)) && (
        <View accessibilityRole="alert" style={styles.banner}>
          <AppText weight="semibold" color="peligro">
            {saveError ?? 'Falta completar lo que está marcado.'}
          </AppText>
        </View>
      )}

      <Button
        label={
          guardar.isPending ? 'Guardando…' : id === undefined ? 'Crear evento' : 'Guardar cambios'
        }
        disabled={guardar.isPending}
        onPress={save}
      />

      {preguntaDeHora !== null && hora !== null && (
        <ConfirmDialog
          title={getPreguntaDeHoraPocoComun(hora)}
          confirmLabel="Sí"
          cancelLabel="Cambiar"
          tone="primary"
          busy={false}
          onConfirm={() => {
            setHoraConfirmada(hora);
            setPreguntaDeHora(null);
            if (preguntaDeHora === 'guardar') {
              persist();
            }
          }}
          onCancel={() => {
            setPreguntaDeHora(null);
            setFocusHoraRequests((count) => count + 1);
          }}
        >
          <DialogText>
            Es una hora poco común. Si querías una hora de la tarde, tocá Cambiar.
          </DialogText>
        </ConfirmDialog>
      )}

      <HojaDeDuenio
        visible={openSheet === 'duenio'}
        opciones={opciones}
        selected={formulario.duenio}
        onSelect={(duenio) => {
          // The lugar chosen is emptied when it is not one of the new duenio.
          setFormulario((current) => cambiarDuenio(current, duenio));
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />
      {opcionDeDuenio && (
        <HojaDeLugar
          visible={openSheet === 'lugar'}
          duenio={opcionDeDuenio.duenio}
          nombreDelDuenio={opcionDeDuenio.nombre}
          selected={formulario.lugar}
          onSelect={(lugar) => {
            // A late "Guardar lugar" of a duenio no longer chosen is ignored.
            setFormulario((current) => elegirLugar(current, lugar));
            setOpenSheet(null);
          }}
          onClose={() => setOpenSheet(null)}
        />
      )}
      <HojaDeFecha
        visible={openSheet === 'finDeSerie'}
        title="Hasta"
        selected={formulario.finDeSerie ?? formulario.fecha}
        onSelect={(finDeSerie) => {
          update({ finDeSerie });
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />
      <HojaDeFecha
        visible={openSheet === 'fechaFin'}
        title="Fecha de fin"
        // Without an end yet, the sheet opens on the month of the start.
        selected={formulario.fechaFin ?? formulario.fecha}
        onSelect={(fechaFin) => {
          update({ fechaFin });
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />
      <HojaDeFecha
        visible={openSheet === 'fecha'}
        title="Fecha del evento"
        selected={formulario.fecha}
        onSelect={(fecha) => {
          update({ fecha });
          setOpenSheet(null);
        }}
        onClose={() => setOpenSheet(null)}
      />
    </>
  );
}

/** A field with what is missing in it, said under it. */
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

function Chevron() {
  return (
    <Svg width={CHEVRON_SIZE} height={CHEVRON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={colors.azulOscuro}
        strokeWidth={CHEVRON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  content: {
    gap: spacing.entreTarjetas,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
  fields: {
    gap: FIELDS_GAP,
    paddingVertical: FIELDS_PADDING_VERTICAL,
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  field: {
    gap: FIELD_GAP,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: PICKER_GAP,
    minHeight: accesibilidad.alturaCampo,
    paddingVertical: PICKER_PADDING_VERTICAL,
    paddingLeft: PICKER_PADDING_LEFT,
    paddingRight: PICKER_PADDING_RIGHT,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  pickerTexts: {
    flexShrink: 1,
  },
  pickerLine: {
    lineHeight: fontSize.cuerpoGrande * PICKER_TEXTS_LINE_HEIGHT,
  },
  hint: {
    lineHeight: fontSize.chico * HINT_LINE_HEIGHT,
  },
  dateTime: {
    flexDirection: 'row',
    gap: DATE_TIME_GAP,
  },
  date: {
    flex: DATE_FLEX,
    minWidth: 0,
  },
  time: {
    flex: TIME_FLEX,
    minWidth: 0,
  },
  dateBox: {
    justifyContent: 'center',
    minHeight: accesibilidad.alturaCampo,
    paddingHorizontal: DATE_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  endDateRow: {
    flexDirection: 'row',
    gap: DATE_TIME_GAP,
  },
  endDateBox: {
    flex: 1,
  },
  disabledBox: {
    backgroundColor: DISABLED_FIELD_COLOR,
  },
  clearButton: {
    minHeight: accesibilidad.alturaCampo,
  },
  banner: {
    padding: BANNER_PADDING,
    borderRadius: radius.campo,
    backgroundColor: colors.peligroSuave,
  },
});
