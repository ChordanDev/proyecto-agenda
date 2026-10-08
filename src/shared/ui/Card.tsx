import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/shared/theme';

/** The white rounded surface that holds the content of a screen. Flat: no shadow, no border. */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.tarjetaPadding,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
});
