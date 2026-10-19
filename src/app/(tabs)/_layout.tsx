import { Tabs } from 'expo-router/js-tabs';

import { useSesion } from '@/features/sesion/datos/useSesion';
import { AjustesIcon, BottomBar, CalendarioIcon, ChatIcon } from '@/shared/ui';

// The bottom navigation: Calendario and Ajustes for everyone, and Chat in
// between only with a session; the hermano has no chat. The group does not
// show in the URL: the routes stay `/calendario`, `/chat` and `/ajustes`.
export default function TabsLayout() {
  const hasSesion = useSesion() === true;

  return (
    <Tabs tabBar={(props) => <BottomBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="calendario"
        options={{ title: 'Calendario', tabBarIcon: CalendarioIcon }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarIcon: ChatIcon, ...(hasSesion ? {} : { href: null }) }}
      />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: AjustesIcon }} />
    </Tabs>
  );
}
