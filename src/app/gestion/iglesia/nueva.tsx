import { useLocalSearchParams } from 'expo-router';

import { IglesiaFormScreen } from '@/features/gestion/interfaz/IglesiaFormScreen';

export default function NuevaIglesiaRoute() {
  const { distrito } = useLocalSearchParams<{ distrito?: string }>();

  return <IglesiaFormScreen modo={{ tipo: 'nueva', distritoId: distrito ?? null }} />;
}
