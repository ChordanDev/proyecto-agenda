import { onlineManager, type QueryClient } from '@tanstack/react-query';

import {
  getIglesiasEnEstructura,
  type IglesiaConEstructura,
} from '@/features/calendario/datos/getIglesiasEnEstructura';
import { clearIglesiaElegida, getIglesiaElegida } from '@/features/iglesias/datos/iglesiaElegida';
import { getCargosDelUsuario } from '@/features/sesion/datos/getCargosDelUsuario';
import { sesionQueryOptions } from '@/features/sesion/datos/sesionQuery';

import {
  cambioQuienLoUsa,
  esFallaDeConexion,
  iglesiaElegidaVigente,
  iglesiasQuePuedeSeguir,
  mismoRegistro,
  modoDeRecordatorios,
  registroDeseado,
  type ModoDeRecordatorios,
  type Registro,
} from '../dominio/recordatorios';
import { getDispositivo, guardarDispositivo } from './dispositivo';
import { getPermiso, getTokenDelTelefono } from './telefono';

/** The recordatorios of this phone as Ajustes shows them. */
export type EstadoDeRecordatorios = {
  modo: ModoDeRecordatorios;
  registro: Registro;
  /** Every iglesia with its nombre and distrito, to name the ones followed. */
  iglesias: IglesiaConEstructura[];
  /** For a pastor or an admin, the ids of the iglesias they can choose. */
  opciones: string[];
  /** An admin chooses among every iglesia of the asociacion, with a buscador. */
  conBuscador: boolean;
};

/** A change the person makes in Ajustes, applied to the registro the phone should have. */
export type CambioDeRegistro = (actual: Registro) => Registro;

export const registroQueryKey = ['recordatorios', 'registro'] as const;

/**
 * Brings the registro of this phone up to date with whoever uses it and their
 * iglesia elegida, applies `cambio` if given, and saves it when it changed.
 * It reads the session, the cargos and the structure through the same queries
 * as the rest of the app.
 *
 * One runs at a time, in the order they were asked for, so the latest wins: a
 * sync started with a session cannot save after the one of signing out.
 */
export function sincronizarRecordatorios(
  queryClient: QueryClient,
  cambio?: CambioDeRegistro,
): Promise<EstadoDeRecordatorios> {
  const sincronizacion = ultimaSincronizacion.then(() => sincronizar(queryClient, cambio));
  // A failed sync does not stop the next one.
  ultimaSincronizacion = sincronizacion.catch(() => undefined);
  return sincronizacion;
}

let ultimaSincronizacion: Promise<unknown> = Promise.resolve();

async function sincronizar(
  queryClient: QueryClient,
  cambio?: CambioDeRegistro,
): Promise<EstadoDeRecordatorios> {
  const token = await getTokenDelTelefono();
  const hasSesion = await queryClient.fetchQuery(sesionQueryOptions);
  const [cargos, iglesiaGuardadaId, iglesias, guardado] = await Promise.all([
    hasSesion
      ? queryClient.fetchQuery({ queryKey: ['cargos'], queryFn: getCargosDelUsuario })
      : null,
    getIglesiaElegida(),
    queryClient.fetchQuery({ queryKey: ['iglesias-estructura'], queryFn: getIglesiasEnEstructura }),
    getDispositivo(token),
  ]);

  // An iglesia elegida dada de baja is forgotten: the hermano chooses again.
  const iglesiaElegidaId = iglesiaElegidaVigente(iglesiaGuardadaId, iglesias);
  if (iglesiaElegidaId !== iglesiaGuardadaId) {
    await clearIglesiaElegida();
    await queryClient.invalidateQueries({ queryKey: ['iglesiaElegida'] });
  }

  const deseado = registroDeseado({ cargos, iglesiaElegidaId, guardado, iglesias });
  const registro = cambio === undefined ? deseado : cambio(deseado);

  if (
    guardado === null ||
    cambioQuienLoUsa(cargos, guardado) ||
    !mismoRegistro(registro, guardado)
  ) {
    await guardarDispositivo(token, registro);
  }

  return {
    modo: modoDeRecordatorios(cargos),
    registro,
    iglesias,
    opciones: cargos === null ? [] : iglesiasQuePuedeSeguir(cargos, iglesias),
    conBuscador: cargos?.some((cargo) => cargo.nivel === 'asociacion') ?? false,
  };
}

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
