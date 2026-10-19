import { PlaceholderScreen } from '@/shared/ui/PlaceholderScreen';

import { useGestor } from '../datos/useGestor';
import { GestionAdminScreen } from './GestionAdminScreen';
import { GestionPastorScreen } from './GestionPastorScreen';
import { GestionSecretariaScreen } from './GestionSecretariaScreen';

/**
 * The tab Gestión: each usuario enters the vista of their highest cargo. The
 * vistas of the pastor and the admin take this place in their own tickets.
 */
export function GestionScreen() {
  const gestor = useGestor();

  switch (gestor?.vista?.tipo) {
    case 'secretaria':
      return (
        <GestionSecretariaScreen
          iglesiaIds={gestor.vista.iglesiaIds}
          usuarioId={gestor.usuarioId}
        />
      );
    case 'pastor':
      return <GestionPastorScreen distritoIds={gestor.vista.distritoIds} />;
    case 'admin':
      return <GestionAdminScreen />;
    default:
      // While the cargos are read; the tab does not show without a vista.
      return null;
  }
}
