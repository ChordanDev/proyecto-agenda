import { useLocalSearchParams } from 'expo-router';

import { UsuarioScreen } from '@/features/gestion/interfaz/UsuarioScreen';

export default function UsuarioRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <UsuarioScreen usuarioId={id} />;
}
