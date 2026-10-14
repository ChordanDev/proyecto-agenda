import { Alert } from 'react-native';

import { hasConexion } from '../datos/useEscribirEvento';
import { getMensajeDeError } from '../dominio/errorDeEscritura';

/**
 * Creating, editing and deleting need a connection. Their buttons stay visible
 * without one, and say so when tapped. Returns whether there is a connection.
 */
export function avisarSinConexion(): boolean {
  if (hasConexion()) {
    return true;
  }

  Alert.alert('Sin conexión', getMensajeDeError('sin-conexion'));

  return false;
}
