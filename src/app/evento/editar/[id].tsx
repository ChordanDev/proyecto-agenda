import { useLocalSearchParams } from 'expo-router';

import { FormularioDeEventoScreen } from '@/features/eventos/interfaz/FormularioDeEventoScreen';

export default function EditarEventoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <FormularioDeEventoScreen modo={{ tipo: 'editar', id }} />;
}
