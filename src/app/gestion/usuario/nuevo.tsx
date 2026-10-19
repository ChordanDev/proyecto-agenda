import { useLocalSearchParams } from 'expo-router';

import { AgregarUsuarioScreen } from '@/features/gestion/interfaz/AgregarUsuarioScreen';

export default function AgregarUsuarioRoute() {
  const { usuario } = useLocalSearchParams<{ usuario?: string }>();

  return <AgregarUsuarioScreen usuarioId={usuario} />;
}
