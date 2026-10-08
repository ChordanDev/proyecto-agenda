import { Tabs } from 'expo-router/js-tabs';

import { AjustesIcon, BottomBar, CalendarioIcon } from '@/shared/ui';

// The bottom navigation of the v1, the same for everyone: Calendario and
// Ajustes. The group does not show in the URL: the routes stay `/calendario`
// and `/ajustes`.
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <BottomBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="calendario"
        options={{ title: 'Calendario', tabBarIcon: CalendarioIcon }}
      />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: AjustesIcon }} />
    </Tabs>
  );
}
