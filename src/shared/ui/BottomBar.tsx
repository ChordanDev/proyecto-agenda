import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { colors, radius } from '@/shared/theme';

import { AppText } from './AppText';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/04a-calendario.html.
const BORDER_TOP_COLOR = '#E6E6E6'; // line 171
const PADDING_TOP = 6;
const PADDING_HORIZONTAL = 8;
const PADDING_BOTTOM = 18;
const TAB_MIN_HEIGHT = 58; // line 172
const TAB_GAP = 3;
const ICON_SIZE = 24; // line 173
const PILL_PADDING_VERTICAL = 3;
const PILL_PADDING_HORIZONTAL = 18;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/**
 * The bottom navigation of the approved design, as the tab bar of a tab layout
 * of Expo Router. Each tab takes its label from the `title` of its screen and
 * its icon from `tabBarIcon`.
 */
export function BottomBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      // The mockup has no system bar under it: on a phone that has one, the bar
      // reaches the edge and keeps its tabs above it.
      style={[styles.bar, { paddingBottom: Math.max(PADDING_BOTTOM, insets.bottom) }]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const label = options.title ?? route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            // iOS has no trait for a single tab: as a button, it still says
            // which one is selected.
            accessibilityRole={Platform.OS === 'ios' ? 'button' : 'tab'}
            accessibilityState={{ selected: focused }}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            onPress={onPress}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            {/* The key draws the pill again when the tab changes: on Android a
                view that gets its background after being drawn without one
                loses its radius, and the active pill came out as a rectangle. */}
            <View
              key={focused ? 'active' : 'inactive'}
              style={[styles.pill, focused && styles.pillActive]}
            >
              {options.tabBarIcon?.({
                focused,
                color: colors.textoSobreOscuro,
                size: ICON_SIZE,
              })}
            </View>
            <AppText variant="nav" weight={focused ? 'bold' : 'semibold'}>
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    paddingTop: PADDING_TOP,
    paddingHorizontal: PADDING_HORIZONTAL,
    borderTopWidth: 1,
    borderTopColor: BORDER_TOP_COLOR,
    backgroundColor: colors.azulOscuro,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: TAB_GAP,
    minHeight: TAB_MIN_HEIGHT,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  pill: {
    paddingVertical: PILL_PADDING_VERTICAL,
    paddingHorizontal: PILL_PADDING_HORIZONTAL,
    borderRadius: radius.pastilla,
  },
  pillActive: {
    backgroundColor: colors.azulNavActivo,
  },
});
