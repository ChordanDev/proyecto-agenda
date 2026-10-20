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
 * A phone that still looks online, such as one whose push token never came,
 * also tries again after each of the RETRY_DELAYS_MS, since its connection
 * may never change.
 * Any other failure (no EAS projectId, a policy that rejects the phone) is not
 * fixed by the connection: Ajustes shows it when it reads the registro again.
 */
export function actualizarRecordatorios(queryClient: QueryClient): Promise<void> {
  return actualizar(queryClient, 0);
}

/**
 * How long a phone that looks online waits before each new try, longer each
 * time. Once they are used up, only the connection coming back or another
 * change tries again.
 */
export const RETRY_DELAYS_MS: readonly number[] = [30_000, 60_000, 120_000, 240_000];

async function actualizar(queryClient: QueryClient, retries: number): Promise<void> {
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
      waitForConnection(queryClient, retries);
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

function waitForConnection(queryClient: QueryClient, retries: number) {
  // One wait at a time: trying again syncs whatever changed, so it covers the change that failed before this one.
  stopWaitingForConnection?.();

  const unsubscribe = onlineManager.subscribe((online) => {
    if (!online) return;
    stop();
    void actualizarRecordatorios(queryClient);
  });

  // The online event only comes when the connection changes.
  const delay = onlineManager.isOnline() ? RETRY_DELAYS_MS[retries] : undefined;
  const timer =
    delay === undefined
      ? undefined
      : setTimeout(() => {
          stop();
          void actualizar(queryClient, retries + 1);
        }, delay);

  function stop() {
    unsubscribe();
    clearTimeout(timer);
    stopWaitingForConnection = null;
  }
  stopWaitingForConnection = stop;
}
