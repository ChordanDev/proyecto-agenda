import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/shared/theme';
import { AppText, Button } from '@/shared/ui';

import { useCargos } from '../datos/useCargos';
import { useSesion } from '../datos/useSesion';
import { ConfirmSignOut } from './ConfirmSignOut';

// A notice the mockups do not draw: the colors of the warnings of the theme, and
// the text of "Elegir iglesia" (03-elegir-iglesia.html, line 28).
const PARAGRAPH_SIZE = 16;
const PARAGRAPH_LINE_HEIGHT = 1.45;

/**
 * A usuario signed in without cargos sees the calendario as a hermano. This
 * notice tells them why, and lets them sign out. Nothing shows otherwise.
 */
export function AvisoSinCargos() {
  const hasSesion = useSesion() === true;
  const { data: cargos } = useCargos();
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  if (!hasSesion || cargos?.length !== 0) {
    return null;
  }

  return (
    <View style={styles.aviso} accessibilityRole="summary">
      <AppText color="avisoTexto" style={styles.paragraph}>
        Todavía no tenés cargos asignados, así que ves el calendario como cualquier hermano.
        Consultá con la asociación.
      </AppText>
      <Button
        label="Cerrar sesión"
        variant="secondary"
        onPress={() => setConfirmingSignOut(true)}
      />
      {confirmingSignOut && <ConfirmSignOut onClose={() => setConfirmingSignOut(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    gap: spacing.entreTarjetas,
    padding: spacing.tarjetaPadding,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.avisoSuave,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
});
