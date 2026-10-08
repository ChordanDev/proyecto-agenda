import { StyleSheet } from 'react-native';

import { spacing } from '@/shared/theme';

import { AppText } from './AppText';
import { ScreenBackground } from './ScreenBackground';

type PlaceholderScreenProps = {
  /** Name of the screen that will take this place. */
  title: string;
};

/**
 * Temporary screen for a route whose real screen belongs to another ticket. It
 * is not one of the approved designs.
 */
export function PlaceholderScreen({ title }: PlaceholderScreenProps) {
  return (
    <ScreenBackground style={styles.screen}>
      <AppText variant="tituloPantalla" accessibilityRole="header">
        {title}
      </AppText>
      <AppText color="textoSecundario" style={styles.message}>
        Esta pantalla todavía no está disponible.
      </AppText>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.entreTarjetas,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  message: {
    textAlign: 'center',
  },
});
