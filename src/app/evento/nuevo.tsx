import { useLocalSearchParams } from 'expo-router';

import { FormularioDeEventoScreen } from '@/features/eventos/interfaz/FormularioDeEventoScreen';

export default function NuevoEventoRoute() {
  const { fecha, precargado } = useLocalSearchParams<{ fecha?: string; precargado?: string }>();

  return <FormularioDeEventoScreen modo={{ tipo: 'nuevo', fecha, precargado }} />;
}
