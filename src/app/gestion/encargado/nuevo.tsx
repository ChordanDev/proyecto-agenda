import { useLocalSearchParams } from 'expo-router';

import { EncargadoScreen } from '@/features/gestion/interfaz/EncargadoScreen';

export default function NuevoEncargadoRoute() {
  const { iglesia } = useLocalSearchParams<{ iglesia?: string }>();

  return <EncargadoScreen iglesiaId={iglesia} modo={{ tipo: 'agregar' }} />;
}
