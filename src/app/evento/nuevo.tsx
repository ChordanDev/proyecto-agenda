import { useLocalSearchParams } from 'expo-router';

import { FormularioDeEventoScreen } from '@/features/eventos/interfaz/FormularioDeEventoScreen';

export default function NuevoEventoRoute() {
  const { fecha } = useLocalSearchParams<{ fecha?: string }>();

  return <FormularioDeEventoScreen modo={{ tipo: 'nuevo', fecha }} />;
}
