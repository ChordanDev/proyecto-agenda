import type { QueryClient } from '@tanstack/react-query';

import {
  getIglesiasEnEstructura,
  type IglesiaConEstructura,
} from '@/features/calendario/datos/getIglesiasEnEstructura';
import { getIglesiaElegida } from '@/features/iglesias/datos/iglesiaElegida';
import { getCargosDelUsuario } from '@/features/sesion/datos/getCargosDelUsuario';
import { sesionQueryOptions } from '@/features/sesion/datos/sesionQuery';

import {
  cambioQuienLoUsa,
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
 */
export async function sincronizarRecordatorios(
  queryClient: QueryClient,
  cambio?: CambioDeRegistro,
): Promise<EstadoDeRecordatorios> {
  const token = await getTokenDelTelefono();
  const hasSesion = await queryClient.fetchQuery(sesionQueryOptions);
  const [cargos, iglesiaElegidaId, iglesias, guardado] = await Promise.all([
    hasSesion
      ? queryClient.fetchQuery({ queryKey: ['cargos'], queryFn: getCargosDelUsuario })
      : null,
    getIglesiaElegida(),
    queryClient.fetchQuery({ queryKey: ['iglesias-estructura'], queryFn: getIglesiasEnEstructura }),
    getDispositivo(token),
  ]);

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
 * when it already has the permiso. Never asks for it, and a failure (such as no
 * connection) only waits for the next time Ajustes reads it.
 */
export async function actualizarRecordatorios(queryClient: QueryClient): Promise<void> {
  try {
    if ((await getPermiso()) !== 'concedido') return;
    await sincronizarRecordatorios(queryClient);
  } catch {
    // Nothing to tell: Ajustes tries again when it reads the registro.
  }
  await queryClient.invalidateQueries({ queryKey: registroQueryKey });
}
