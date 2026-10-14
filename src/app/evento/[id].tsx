import { useLocalSearchParams } from 'expo-router';

import { DetalleDeEventoScreen } from '@/features/eventos/interfaz/DetalleDeEventoScreen';

export default function EventoRoute() {
  const { id, fecha } = useLocalSearchParams<{ id: string; fecha?: string }>();

  return <DetalleDeEventoScreen id={id} fecha={fecha} />;
}
