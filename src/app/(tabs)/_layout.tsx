import { Tabs } from 'expo-router/js-tabs';

import { useGestor } from '@/features/gestion/datos/useGestor';
import { useSesion } from '@/features/sesion/datos/useSesion';
import { AjustesIcon, BottomBar, CalendarioIcon, ChatIcon, GestionIcon } from '@/shared/ui';

// The bottom navigation: Calendario and Ajustes for everyone, Chat only with a
// session (the hermano has no chat) and Gestión only for a secretaria de
// iglesia, a pastor or an admin. The group does not show in the URL: the routes
// stay `/calendario`, `/chat`, `/gestion` and `/ajustes`.
export default function TabsLayout() {
  const hasSesion = useSesion() === true;
  const hasGestion = useGestor()?.vista != null;

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
      <Tabs.Screen
        name="gestion"
        options={{
          title: 'Gestión',
          tabBarIcon: GestionIcon,
          ...(hasGestion ? {} : { href: null }),
        }}
      />
      <Tabs.Screen name="ajustes" options={{ title: 'Ajustes', tabBarIcon: AjustesIcon }} />
    </Tabs>
  );
}
