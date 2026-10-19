import { useLocalSearchParams } from 'expo-router';

import { FormularioDeEventoScreen } from '@/features/eventos/interfaz/FormularioDeEventoScreen';

export default function EditarEventoRoute() {
  // `fecha`: a date of a series to change on its own; without it, the whole evento.
  const { id, fecha } = useLocalSearchParams<{ id: string; fecha?: string }>();

  return <FormularioDeEventoScreen modo={{ tipo: 'editar', id, fecha }} />;
}
