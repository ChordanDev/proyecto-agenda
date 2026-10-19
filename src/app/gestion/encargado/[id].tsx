import { useLocalSearchParams } from 'expo-router';

import { EncargadoScreen } from '@/features/gestion/interfaz/EncargadoScreen';

export default function EditarEncargadoRoute() {
  const { id, iglesia } = useLocalSearchParams<{ id: string; iglesia: string }>();

  return <EncargadoScreen iglesiaId={iglesia} modo={{ tipo: 'editar', cargoId: id }} />;
}
