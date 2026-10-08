import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';

import { degradadoFondo } from '@/shared/theme';

/**
 * The blue gradient behind every screen but the chat. The gradient fills the
 * whole window; the content stays inside the safe area.
 */
export function ScreenBackground({ style, ...rest }: SafeAreaViewProps) {
  const { height } = useWindowDimensions();
  // The middle color sits at a fixed distance from the top, and `locations` is
  // proportional to the height.
  const middle = Math.min(degradadoFondo.cortePx / height, 1);

  return (
    <LinearGradient colors={degradadoFondo.colors} locations={[0, middle, 1]} style={styles.fill}>
      <SafeAreaView style={[styles.fill, style]} {...rest} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
