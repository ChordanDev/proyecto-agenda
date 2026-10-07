import { Text, View } from 'react-native';

import { colors, fontSize } from '@/shared/theme';

// Placeholder until the first real screen is wired.
export default function IndexRoute() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.fondoClaro,
      }}
    >
      <Text style={{ fontSize: fontSize.cuerpo, color: colors.texto }}>Agenda de iglesia</Text>
    </View>
  );
}
