import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/shared/theme';
import { AppText, ConfirmDialog, DialogText } from '@/shared/ui';
import { useOnlineStatus } from '@/shared/useOnlineStatus';

import type { Baja } from '../datos/darDeBaja';
import { useDarDeBaja, useReactivar } from '../datos/useDarDeBaja';
import type { Confirmacion } from '../dominio/bajaDeEstructura';

// Dar de baja and reactivar in the gestion of the admin. The line numbers are
// those of diseno/pantallas/09b-iglesia.html (the button) and
// 09-gestion-admin.html (the section "Dadas de baja").
const BAJA_HEIGHT = 54; // 09b, line 55
const BAJA_BORDER_WIDTH = 2;
const DISABLED_OPACITY = 0.45; // 09c, line 60
const SECTION_GAP = 10;
const SECTION_TITLE_SIZE = 17; // 09, line 94
const SECTION_MARGIN_HORIZONTAL = 4;
const ROW_GAP = 12; // 09, line 97
const ROW_MIN_HEIGHT = 48;
const ROW_PADDING_VERTICAL = 12;
const ROW_PADDING_LEFT = 18;
const ROW_PADDING_RIGHT = 14;
const ROW_TEXTS_GAP = 1; // line 98
const ROW_TITLE_SIZE = 17;
const REACTIVAR_MIN_HEIGHT = 44; // line 99
const REACTIVAR_PADDING_HORIZONTAL = 16;
const REACTIVAR_RADIUS = 12;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/** A change of baja that failed: the dialog stays open to try again. */
const FALLO = 'No se pudo hacer. Revisá la conexión y probá de nuevo.';

type ConfirmarCambioProps = {
  confirmacion: Confirmacion;
  confirmLabel: string;
  tone: 'primary' | 'danger';
  busy: boolean;
  fallo: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** The dialog that asks before dar de baja or reactivar. */
function ConfirmarCambio({ confirmacion, fallo, ...dialog }: ConfirmarCambioProps) {
  return (
    <ConfirmDialog title={confirmacion.titulo} {...dialog}>
      {confirmacion.textos.map((texto) => (
        <DialogText key={texto}>{texto}</DialogText>
      ))}
      {fallo && <DialogText color="peligro">{FALLO}</DialogText>}
    </ConfirmDialog>
  );
}

type DarDeBajaProps = {
  baja: Baja;
  confirmacion: Confirmacion;
  /** Why it cannot be given de baja yet; null when it can. */
  bloqueo?: string | null;
  /** Once it is de baja: the form it was opened from closes. */
  onHecho: () => void;
};

/** The red "Dar de baja" of Editar iglesia and Editar distrito, with its confirmation. */
export function DarDeBaja({ baja, confirmacion, bloqueo = null, onHecho }: DarDeBajaProps) {
  const conConexion = useOnlineStatus();
  const darDeBaja = useDarDeBaja();
  const [confirmando, setConfirmando] = useState(false);
  const [fallo, setFallo] = useState(false);
  const disabled = !conConexion || bloqueo !== null;

  const onConfirm = () => {
    setFallo(false);
    darDeBaja.mutate(baja, {
      onSuccess: (hecho) => (hecho ? onHecho() : setFallo(true)),
    });
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setConfirmando(true)}
        style={({ pressed }) => [
          styles.baja,
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        <AppText weight="bold" color="peligro">
          Dar de baja
        </AppText>
      </Pressable>
      {bloqueo !== null && (
        <AppText variant="secundario" color="textoSecundario" style={styles.bloqueo}>
          {bloqueo}
        </AppText>
      )}

      {confirmando && (
        <ConfirmarCambio
          confirmacion={confirmacion}
          confirmLabel="Dar de baja"
          tone="danger"
          busy={darDeBaja.isPending}
          fallo={fallo}
          onConfirm={onConfirm}
          onCancel={() => {
            setConfirmando(false);
            setFallo(false);
          }}
        />
      )}
    </>
  );
}

/** An iglesia or a distrito dado de baja, as the section lists it. */
export type FilaDeBaja = {
  id: string;
  nombre: string;
  subtitulo?: string;
  /** False when something must be reactivado before it. */
  puedeReactivar: boolean;
  baja: Baja;
  confirmacion: Confirmacion;
};

/** "Dadas de baja" under a tab of the admin: each one with its "Reactivar". */
export function DadasDeBaja({ titulo, filas }: { titulo: string; filas: FilaDeBaja[] }) {
  const conConexion = useOnlineStatus();
  const reactivar = useReactivar();
  const [confirmando, setConfirmando] = useState<FilaDeBaja | null>(null);
  const [fallo, setFallo] = useState(false);

  if (filas.length === 0) {
    return null;
  }

  const cerrar = () => {
    setConfirmando(null);
    setFallo(false);
  };

  const onConfirm = () => {
    if (confirmando === null) return;
    setFallo(false);
    reactivar.mutate(confirmando.baja, {
      onSuccess: (hecho) => (hecho ? cerrar() : setFallo(true)),
    });
  };

  return (
    <View style={styles.section}>
      <AppText
        weight="bold"
        color="textoSecundario"
        accessibilityRole="header"
        style={styles.sectionTitle}
      >
        {titulo}
      </AppText>
      <View style={styles.list}>
        {filas.map((fila, index) => {
          const disabled = !conConexion || !fila.puedeReactivar;
          return (
            <View key={fila.id} style={[styles.row, index < filas.length - 1 && styles.rowDivider]}>
              <View style={styles.rowTexts}>
                <AppText weight="bold" color="textoSecundario" style={styles.rowTitle}>
                  {fila.nombre}
                </AppText>
                {fila.subtitulo !== undefined && (
                  <AppText variant="secundario" color="textoSecundario">
                    {fila.subtitulo}
                  </AppText>
                )}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reactivar ${fila.nombre}`}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => setConfirmando(fila)}
                style={({ pressed }) => [
                  styles.reactivar,
                  pressed && styles.pressed,
                  disabled && styles.disabled,
                ]}
              >
                <AppText weight="bold" color="azulOscuro">
                  Reactivar
                </AppText>
              </Pressable>
            </View>
          );
        })}
      </View>

      {confirmando !== null && (
        <ConfirmarCambio
          confirmacion={confirmando.confirmacion}
          confirmLabel="Reactivar"
          tone="primary"
          busy={reactivar.isPending}
          fallo={fallo}
          onConfirm={onConfirm}
          onCancel={cerrar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  baja: {
    minHeight: BAJA_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BAJA_BORDER_WIDTH,
    borderColor: colors.peligro,
    borderRadius: radius.boton,
    backgroundColor: colors.superficie,
  },
  bloqueo: {
    marginHorizontal: SECTION_MARGIN_HORIZONTAL,
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
  reactivar: {
    marginLeft: 'auto',
    flexShrink: 0,
    minHeight: REACTIVAR_MIN_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: REACTIVAR_PADDING_HORIZONTAL,
    borderRadius: REACTIVAR_RADIUS,
    backgroundColor: colors.azulSuave,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
