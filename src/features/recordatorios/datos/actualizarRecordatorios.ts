import { onlineManager, type QueryClient } from '@tanstack/react-query';

import { esFallaDeConexion } from '../dominio/recordatorios';
import { registroQueryKey } from './registroQueryKey';
import type * as Sincronizacion from './sincronizarRecordatorios';
import type * as Telefono from './telefono';

/**
 * Lets the phone follow whatever changed (the iglesia elegida, the session),
 * when it already has the permiso. Never asks for it. A failure of the
 * connection, such as signing out offline, tries again once the connection
 * comes back: until then the phone would keep the iglesias of whoever used it.
 * Any other failure (no EAS projectId, a policy that rejects the phone) is not
 * fixed by the connection: Ajustes shows it when it reads the registro again.
 */
export async function actualizarRecordatorios(queryClient: QueryClient): Promise<void> {
  // Only the latest change is worth trying again.
  stopWaitingForConnection?.();
  stopWaitingForConnection = null;

  try {
    const { getPermiso, sincronizarRecordatorios } = loadSincronizacion();
    if ((await getPermiso()) === 'concedido') {
      await sincronizarRecordatorios(queryClient);
    }
  } catch (error) {
    if (esFallaDeConexion(error)) {
      waitForConnection(queryClient);
    }
  }
  await queryClient.invalidateQueries({ queryKey: registroQueryKey });
}

/**
 * Loads what talks to the phone the first time a change asks for it, and not
 * on import: whoever triggers it, such as choosing an iglesia or signing out,
 * does not load the native modules of the notifications. An inline require,
 * because Jest does not run `import()`.
 */
function loadSincronizacion() {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const telefono = require('./telefono') as typeof Telefono;
  const sincronizacion = require('./sincronizarRecordatorios') as typeof Sincronizacion;
  /* eslint-enable @typescript-eslint/no-require-imports */
  return {
    getPermiso: telefono.getPermiso,
    sincronizarRecordatorios: sincronizacion.sincronizarRecordatorios,
  };
}

let stopWaitingForConnection: (() => void) | null = null;

function waitForConnection(queryClient: QueryClient) {
  const unsubscribe = onlineManager.subscribe((online) => {
    if (!online) return;
    unsubscribe();
    stopWaitingForConnection = null;
    void actualizarRecordatorios(queryClient);
  });
  stopWaitingForConnection = unsubscribe;
}
