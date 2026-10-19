import { useLocalSearchParams } from 'expo-router';

import { IglesiaFormScreen } from '@/features/gestion/interfaz/IglesiaFormScreen';

export default function EditarIglesiaRoute() {
  const { id, distrito } = useLocalSearchParams<{ id: string; distrito?: string }>();

  return (
    <IglesiaFormScreen modo={{ tipo: 'editar', iglesiaId: id, distritoId: distrito ?? null }} />
  );
}
