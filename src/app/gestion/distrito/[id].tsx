import { useLocalSearchParams } from 'expo-router';

import { DistritoFormScreen } from '@/features/gestion/interfaz/DistritoFormScreen';

export default function EditarDistritoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <DistritoFormScreen modo={{ tipo: 'editar', distritoId: id }} />;
}
