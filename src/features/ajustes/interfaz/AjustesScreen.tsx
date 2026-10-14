import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useDeleteOwnUsuario, useSignOut } from '@/features/sesion/datos/useLeaveSesion';
import { useLeaveToFirstScreen } from '@/features/sesion/interfaz/useLeaveToFirstScreen';
import { colors, fontSize, radius, spacing } from '@/shared/theme';
import { AppText, Button, Logo, ScreenBackground } from '@/shared/ui';

import { useMiIglesia, type EstadoDeMiIglesia } from '../datos/useMiIglesia';
import { useUsuario } from '../datos/useUsuario';
import type { DescripcionDeUsuario } from '../dominio/usuario';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/10-ajustes.html.
const HEADER_PADDING_TOP = 22; // line 19
const HEADER_PADDING_HORIZONTAL = 20;
const HEADER_GAP = 14;
const LOGO_BOX_SIZE = 52; // line 20
const HEADER_TEXTS_GAP = 1; // line 21
const CONTENT_PADDING_TOP = 26; // line 27
const CONTENT_PADDING_BOTTOM = 24;
const CONTENT_GAP = 22;
const SECTION_GAP = 10; // line 29
const SECTION_TITLE_SIZE = 17; // line 30
const SECTION_TITLE_MARGIN_HORIZONTAL = 4;
const CARD_PADDING_VERTICAL = 16; // line 31
const CARD_PADDING_HORIZONTAL = 18;
const CARD_ROW_GAP = 12;
const CARD_TEXTS_GAP = 2; // line 32
const CHANGE_HEIGHT = 46; // line 36
const CHANGE_LABEL_SIZE = 16;
const USUARIO_CARD_GAP = 14; // line 66
const AVATAR_SIZE = 44; // line 68
const AVATAR_LABEL_SIZE = 15;
const DELETE_HEIGHT = 52; // line 76
const DELETE_LABEL_SIZE = 16;
// The confirmation of "Eliminar mi cuenta" (lines 89-99).
const OVERLAY_COLOR = 'rgba(16,35,58,0.55)';
const OVERLAY_PADDING_HORIZONTAL = 20;
const DIALOG_RADIUS = 22;
const DIALOG_PADDING_TOP = 24;
const DIALOG_PADDING_HORIZONTAL = 20;
const DIALOG_PADDING_BOTTOM = 20;
const DIALOG_GAP = 12;
const DIALOG_TITLE_SIZE = 21;
const DIALOG_TEXT_COLOR = '#333333';
const DIALOG_BUTTON_HEIGHT = 54;
const DIALOG_BUTTONS_MARGIN_TOP = 8;
// The text of the states the mockup does not draw, as in "Elegir iglesia"
// (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

/**
 * Ajustes: the iglesia elegida of this phone, which can be changed from here,
 * and, with a session, signing out and "Eliminar mi cuenta".
 */
export function AjustesScreen() {
  const router = useRouter();
  const miIglesia = useMiIglesia();
  const usuario = useUsuario();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // The same buscador as the first time; once another iglesia is stored, it
  // goes to the calendario, which shows the new one.
  const changeIglesia = () =>
    router.push({ pathname: '/choose-iglesia', params: { desde: 'ajustes' } });

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Logo />
        </View>
        <View style={styles.headerTexts}>
          <AppText variant="tituloEncabezado" accessibilityRole="header">
            Ajustes
          </AppText>
          {miIglesia.estado === 'lista' && (
            <AppText variant="subtitulo">{miIglesia.iglesia.nombre}</AppText>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Mi iglesia">
          <MiIglesiaCard miIglesia={miIglesia} onChange={changeIglesia} />
        </Section>

        {/* Only with a session: the hermano sees Mi iglesia alone. */}
        {usuario && (
          <>
            <Section title="Cuenta">
              <UsuarioCard usuario={usuario} />
            </Section>
            {/* Outside the card, as a link, so it is not tapped by mistake. */}
            <Pressable
              accessibilityRole="button"
              onPress={() => setConfirmingDelete(true)}
              style={({ pressed }) => [styles.deleteLink, pressed && styles.pressed]}
            >
              <AppText weight="bold" color="peligro" style={styles.deleteLinkLabel}>
                Eliminar mi cuenta
              </AppText>
            </Pressable>
          </>
        )}
      </ScrollView>

      {confirmingDelete && <ConfirmDelete onClose={() => setConfirmingDelete(false)} />}
    </ScreenBackground>
  );
}

function UsuarioCard({ usuario }: { usuario: DescripcionDeUsuario }) {
  const signOut = useSignOut();
  const leaveToFirstScreen = useLeaveToFirstScreen();

  return (
    <View style={[styles.card, styles.usuarioCard]}>
      <View style={styles.cardRow}>
        <View style={styles.avatar} importantForAccessibility="no-hide-descendants">
          <AppText weight="bold" color="azulOscuro" style={styles.avatarLabel}>
            {usuario.iniciales}
          </AppText>
        </View>
        <View style={styles.cardTexts}>
          <AppText variant="cuerpoGrande" weight="bold">
            {usuario.titulo}
          </AppText>
          {usuario.detalle !== undefined && (
            <AppText variant="secundario">{usuario.detalle}</AppText>
          )}
        </View>
      </View>
      {/* A state the mockup does not draw. */}
      {signOut.isError && (
        <AppText color="peligro" accessibilityRole="alert">
          No se pudo cerrar la sesión. Probá de nuevo.
        </AppText>
      )}
      <Button
        label="Cerrar sesión"
        variant="secondary"
        disabled={signOut.isPending || signOut.isSuccess}
        onPress={() => signOut.mutate(undefined, { onSuccess: leaveToFirstScreen })}
      />
    </View>
  );
}

/** Asks before deleting the usuario: it cannot be undone. */
function ConfirmDelete({ onClose }: { onClose: () => void }) {
  const deleteOwnUsuario = useDeleteOwnUsuario();
  const leaveToFirstScreen = useLeaveToFirstScreen();
  // Once it is being deleted, there is nothing left to cancel.
  const busy = deleteOwnUsuario.isPending || deleteOwnUsuario.isSuccess;
  const cancel = () => {
    if (!busy) {
      onClose();
    }
  };

  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={cancel}>
      <View style={styles.overlay}>
        <View style={styles.dialog} accessibilityViewIsModal accessibilityRole="alert">
          <AppText weight="bold" accessibilityRole="header" style={styles.dialogTitle}>
            ¿Eliminar tu cuenta?
          </AppText>
          <AppText style={styles.dialogText}>
            Se borran tu usuario y tus cargos. Los eventos que cargaste siguen en el calendario.
          </AppText>
          <AppText weight="semibold" style={styles.dialogText}>
            No se puede deshacer.
          </AppText>
          {/* A state the mockup does not draw. */}
          {deleteOwnUsuario.isError && (
            <AppText color="peligro" accessibilityRole="alert" style={styles.dialogText}>
              No se pudo eliminar tu cuenta. Revisá la conexión y probá de nuevo.
            </AppText>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() =>
              deleteOwnUsuario.mutate(undefined, {
                // Ajustes stays mounted under the calendario: the dialog closes
                // before leaving, or it would stay on top.
                onSuccess: () => {
                  onClose();
                  leaveToFirstScreen();
                },
              })
            }
            style={({ pressed }) => [
              styles.dialogButton,
              styles.deleteButton,
              pressed && styles.pressed,
            ]}
          >
            <AppText weight="bold" color="textoSobreOscuro" style={styles.dialogButtonLabel}>
              {deleteOwnUsuario.isPending ? 'Eliminando…' : 'Eliminar mi cuenta'}
            </AppText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={cancel}
            style={({ pressed }) => [
              styles.dialogButton,
              styles.cancelButton,
              pressed && styles.pressed,
            ]}
          >
            <AppText weight="bold" color="azulOscuro" style={styles.dialogButtonLabel}>
              Cancelar
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

type MiIglesiaCardProps = {
  miIglesia: EstadoDeMiIglesia;
  onChange: () => void;
};

function MiIglesiaCard({ miIglesia, onChange }: MiIglesiaCardProps) {
  switch (miIglesia.estado) {
    case 'lista':
      return (
        <View style={[styles.card, styles.cardRow]}>
          <View style={styles.cardTexts}>
            <AppText variant="cuerpoGrande" weight="bold">
              {miIglesia.iglesia.nombre}
            </AppText>
            <AppText variant="secundario">{miIglesia.iglesia.distrito}</AppText>
          </View>
          <ChangeButton
            label="Cambiar"
            accessibilityLabel="Cambiar de iglesia"
            onPress={onChange}
          />
        </View>
      );
    // States the mockup does not draw.
    case 'sin-iglesia':
      return (
        <View style={[styles.card, styles.cardRow]}>
          <AppText color="textoSecundario" style={[styles.paragraph, styles.cardTexts]}>
            Todavía no elegiste tu iglesia.
          </AppText>
          <ChangeButton label="Elegir" accessibilityLabel="Elegir mi iglesia" onPress={onChange} />
        </View>
      );
    case 'error':
      return (
        <View style={[styles.card, styles.cardColumn]}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            No se pudo cargar tu iglesia. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button label="Reintentar" variant="secondary" onPress={miIglesia.refetch} />
        </View>
      );
    case 'cargando':
      return (
        <View style={styles.card}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            Cargando tu iglesia…
          </AppText>
        </View>
      );
  }
}

type ChangeButtonProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

/** The small button at the right of the card ("Cambiar"), smaller than `Button`. */
function ChangeButton({ label, accessibilityLabel, onPress }: ChangeButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
    >
      <AppText weight="bold" color="azulOscuro" style={styles.changeLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: HEADER_PADDING_HORIZONTAL,
  },
  logoBox: {
    width: LOGO_BOX_SIZE,
    height: LOGO_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flex: 1,
    gap: HEADER_TEXTS_GAP,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  section: {
    gap: SECTION_GAP,
  },
  sectionTitle: {
    fontSize: SECTION_TITLE_SIZE,
    marginHorizontal: SECTION_TITLE_MARGIN_HORIZONTAL,
  },
  card: {
    paddingVertical: CARD_PADDING_VERTICAL,
    paddingHorizontal: CARD_PADDING_HORIZONTAL,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: CARD_ROW_GAP,
  },
  cardColumn: {
    gap: spacing.entreTarjetas,
  },
  cardTexts: {
    flex: 1,
    gap: CARD_TEXTS_GAP,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
  changeButton: {
    minHeight: CHANGE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: radius.campo,
    backgroundColor: colors.azulSuave,
  },
  changeLabel: {
    fontSize: CHANGE_LABEL_SIZE,
  },
  usuarioCard: {
    gap: USUARIO_CARD_GAP,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.azulSuave,
  },
  avatarLabel: {
    fontSize: AVATAR_LABEL_SIZE,
  },
  deleteLink: {
    alignSelf: 'center',
    minHeight: DELETE_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: spacing.tarjetaPadding,
  },
  deleteLinkLabel: {
    fontSize: DELETE_LABEL_SIZE,
    textDecorationLine: 'underline',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: OVERLAY_PADDING_HORIZONTAL,
    backgroundColor: OVERLAY_COLOR,
  },
  dialog: {
    gap: DIALOG_GAP,
    paddingTop: DIALOG_PADDING_TOP,
    paddingHorizontal: DIALOG_PADDING_HORIZONTAL,
    paddingBottom: DIALOG_PADDING_BOTTOM,
    borderRadius: DIALOG_RADIUS,
    backgroundColor: colors.superficie,
  },
  dialogTitle: {
    fontSize: DIALOG_TITLE_SIZE,
  },
  dialogText: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
    color: DIALOG_TEXT_COLOR,
  },
  dialogButton: {
    minHeight: DIALOG_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.boton,
  },
  deleteButton: {
    marginTop: DIALOG_BUTTONS_MARGIN_TOP,
    backgroundColor: colors.peligro,
  },
  cancelButton: {
    backgroundColor: colors.azulSuave,
  },
  dialogButtonLabel: {
    fontSize: fontSize.cuerpo,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
