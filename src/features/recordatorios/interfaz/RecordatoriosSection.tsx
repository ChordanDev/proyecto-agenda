import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/shared/theme';
import { AppText, Button, FormaDeEnfasis } from '@/shared/ui';

import { useRecordatorios } from '../datos/useRecordatorios';
import type { EstadoDeRecordatorios } from '../datos/sincronizarRecordatorios';
import { elegirIglesias } from '../dominio/recordatorios';
import { cuantasIglesias, listaDeNombres, textoDeRecordatorios } from '../dominio/textos';
import { HojaDeIglesias } from './HojaDeIglesias';
import { Interruptor } from './Interruptor';

// Layout of the Recordatorios card of 10-ajustes.html (lines 52-111), which the
// theme has no tokens for.
const CARD_PADDING_VERTICAL = 16;
const CARD_PADDING_HORIZONTAL = 18;
const CARD_GAP = 12;
const ROW_GAP = 12;
const TITLE_SIZE = 18;
const TEXT_SIZE = 15;
const TEXT_LINE_HEIGHT = 1.4;
const BOX_PADDING_VERTICAL = 12;
const BOX_PADDING_HORIZONTAL = 14;
const BOX_GAP = 12;
const BOX_TEXTS_GAP = 1;
const EXAMPLE_LABEL_SIZE = 13;
const EXAMPLE_TITLE_SIZE = 16;
const EXAMPLE_SHAPE_SIZE = 20;
const ALERT_PADDING = 14;
const ALERT_ICON_SIZE = 40;
const ALERT_ICON_GLYPH = 22;
const ALERT_ICON_STROKE = 2.2;
const ALERT_COLOR = '#FFF8E1';
const ALERT_TITLE_SIZE = 16;
const CHANGE_HEIGHT = 46;
const CHANGE_LABEL_SIZE = 16;
const CHANGE_PADDING_HORIZONTAL = 16;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/**
 * Recordatorios: the switch of this phone and, for a pastor or an admin, the
 * iglesias they choose. A hermano, an encargado and a secretaria receive those
 * of their iglesia (capture 10f); a pastor and an admin start with none (10g)
 * and choose them (10i). Without the permiso, it says how to give it (10k).
 */
export function RecordatoriosSection() {
  const { permiso, registro, guardar, activar, abrirConfiguracion } = useRecordatorios();
  const [eligiendo, setEligiendo] = useState(false);

  if (permiso === undefined) {
    return null;
  }

  if (permiso === 'denegado') {
    return (
      <Card>
        <Encabezado titulo="Recordatorios de eventos" tenue>
          <Interruptor
            on={false}
            disabled
            accessibilityLabel="Recordatorios de eventos"
            onPress={() => undefined}
          />
        </Encabezado>
        <SinPermiso />
        <Button label="Abrir la configuración" onPress={abrirConfiguracion} />
      </Card>
    );
  }

  // Until the phone is asked, the switch is off: turning it on asks.
  if (permiso === 'sin-preguntar') {
    return (
      <Card>
        <Encabezado titulo="Recordatorios de eventos">
          <Interruptor
            on={false}
            accessibilityLabel="Recordatorios de eventos"
            onPress={() => activar.mutate()}
          />
        </Encabezado>
        {/* A state the mockup does not draw. */}
        <AppText color="textoSecundario" style={styles.text}>
          Activalos para que te avisemos a las 20 h del día anterior a cada evento.
        </AppText>
      </Card>
    );
  }

  // States the mockup does not draw.
  if (registro.isPending) {
    return (
      <Card>
        <AppText color="textoSecundario" style={styles.text}>
          Cargando los recordatorios…
        </AppText>
      </Card>
    );
  }
  if (registro.isError) {
    return (
      <Card>
        <AppText color="textoSecundario" style={styles.text}>
          No se pudieron cargar los recordatorios. Revisá la conexión y probá de nuevo.
        </AppText>
        <Button label="Reintentar" variant="secondary" onPress={() => void registro.refetch()} />
      </Card>
    );
  }

  const estado = registro.data;
  const nombres = nombresDe(estado, estado.registro.iglesiaIds);
  const sinElegir = estado.modo === 'eligiendo' && estado.registro.iglesiaIds.length === 0;

  const tocarInterruptor = () => {
    // A pastor or an admin with no iglesia chosen turns on by choosing them.
    if (sinElegir) {
      setEligiendo(true);
      return;
    }
    guardar.mutate((actual) => ({ ...actual, encendido: !actual.encendido }));
  };

  return (
    <Card>
      <Encabezado titulo="Recordatorios de eventos">
        <Interruptor
          on={estado.registro.encendido}
          disabled={guardar.isPending}
          accessibilityLabel="Recordatorios de eventos"
          onPress={tocarInterruptor}
        />
      </Encabezado>
      <AppText color="textoSecundario" style={styles.text}>
        {textoDeRecordatorios({ modo: estado.modo, nombres })}
      </AppText>

      {estado.modo !== 'eligiendo' && <Ejemplo />}
      {sinElegir && <Button label="Elegir iglesias" onPress={() => setEligiendo(true)} />}
      {!sinElegir && estado.modo === 'eligiendo' && (
        <View style={[styles.box, styles.row]}>
          <View style={styles.boxTexts}>
            <AppText weight="bold" style={styles.exampleTitle}>
              {cuantasIglesias(nombres.length)}
            </AppText>
            <AppText variant="secundario">{listaDeNombres(nombres)}</AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar las iglesias de los recordatorios"
            onPress={() => setEligiendo(true)}
            style={({ pressed }) => [styles.change, pressed && styles.pressed]}
          >
            <AppText weight="bold" color="azulOscuro" style={styles.changeLabel}>
              Cambiar
            </AppText>
          </Pressable>
        </View>
      )}

      {/* A state the mockup does not draw. */}
      {guardar.isError && (
        <AppText color="peligro" accessibilityRole="alert" style={styles.text}>
          No se pudieron guardar los recordatorios. Revisá la conexión y probá de nuevo.
        </AppText>
      )}

      <HojaDeIglesias
        visible={eligiendo}
        opciones={estado.iglesias.filter((iglesia) => estado.opciones.includes(iglesia.id))}
        elegidas={estado.registro.iglesiaIds}
        conBuscador={estado.conBuscador}
        guardando={guardar.isPending}
        onGuardar={(iglesiaIds) =>
          guardar.mutate(() => elegirIglesias(iglesiaIds), {
            onSuccess: () => setEligiendo(false),
          })
        }
        onClose={() => setEligiendo(false)}
      />
    </Card>
  );
}

function nombresDe(estado: EstadoDeRecordatorios, ids: readonly string[]): string[] {
  return estado.iglesias.filter((iglesia) => ids.includes(iglesia.id)).map((i) => i.nombre);
}

function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Encabezado({
  titulo,
  tenue = false,
  children,
}: {
  titulo: string;
  tenue?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <AppText weight="bold" color={tenue ? 'textoTenue' : 'texto'} style={styles.title}>
        {titulo}
      </AppText>
      {children}
    </View>
  );
}

/** The example of the aviso: only eventos with an énfasis avisan (#163). */
function Ejemplo() {
  return (
    <View style={[styles.box, styles.row]}>
      <FormaDeEnfasis categoria="I" size={EXAMPLE_SHAPE_SIZE} outlined />
      <View style={styles.boxTexts}>
        <AppText color="textoSecundario" style={styles.exampleLabel}>
          Ejemplo
        </AppText>
        <AppText weight="bold" style={styles.exampleTitle}>
          Mañana: Congreso de Jóvenes
        </AppText>
      </View>
    </View>
  );
}

function SinPermiso() {
  return (
    <View accessibilityRole="alert" style={styles.alert}>
      <View style={styles.alertIcon}>
        <Svg width={ALERT_ICON_GLYPH} height={ALERT_ICON_GLYPH} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l9.5 17h-19L12 3zM12 10v4.5M12 17.5v.5"
            stroke={colors.aviso}
            strokeWidth={ALERT_ICON_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={styles.boxTexts}>
        <AppText weight="bold" style={styles.alertTitle}>
          El teléfono no deja que la app te avise
        </AppText>
        <AppText color="textoSecundario" style={styles.text}>
          Entrá a la configuración del teléfono, tocá{' '}
          <AppText weight="bold">Notificaciones</AppText> y activalas para Agenda de iglesia.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: CARD_GAP,
    paddingVertical: CARD_PADDING_VERTICAL,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
  },
  title: {
    flex: 1,
    fontSize: TITLE_SIZE,
  },
  text: {
    fontSize: TEXT_SIZE,
    lineHeight: TEXT_SIZE * TEXT_LINE_HEIGHT,
  },
  box: {
    gap: BOX_GAP,
    paddingVertical: BOX_PADDING_VERTICAL,
    paddingHorizontal: BOX_PADDING_HORIZONTAL,
    borderRadius: radius.boton,
    backgroundColor: colors.campo,
  },
  boxTexts: {
    flex: 1,
    gap: BOX_TEXTS_GAP,
  },
  exampleLabel: {
    fontSize: EXAMPLE_LABEL_SIZE,
  },
  exampleTitle: {
    fontSize: EXAMPLE_TITLE_SIZE,
  },
  change: {
    minHeight: CHANGE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: CHANGE_PADDING_HORIZONTAL,
    borderRadius: radius.campo,
    backgroundColor: colors.superficie,
  },
  changeLabel: {
    fontSize: CHANGE_LABEL_SIZE,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: BOX_GAP,
    padding: ALERT_PADDING,
    borderRadius: radius.boton,
    backgroundColor: ALERT_COLOR,
  },
  alertIcon: {
    width: ALERT_ICON_SIZE,
    height: ALERT_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ALERT_ICON_SIZE / 2,
    backgroundColor: colors.avisoSuave,
  },
  alertTitle: {
    fontSize: ALERT_TITLE_SIZE,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
