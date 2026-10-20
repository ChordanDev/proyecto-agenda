// One hourly run of enviar-recordatorios: the sending, then the reading of
// the receipts. Kept apart from index.ts, which starts the server, so it can
// be tested.

import type {
  ResultadoDeRecibos,
  ResultadoDelEnvio,
} from '../../../src/features/recordatorios/dominio/envio.ts';

export type PasosDeLaRonda = {
  enviar(): Promise<ResultadoDelEnvio>;
  revisarRecibos(): Promise<ResultadoDeRecibos>;
};

export type RespuestaDeLaRonda = {
  estado: number;
  body: ResultadoDelEnvio & { recibos: ResultadoDeRecibos | { falla: 'error_servidor' } };
};

/**
 * Runs the sending and then the receipts. A failure in the sending is thrown.
 * A failure in the receipts does not undo a sending already done: the answer
 * keeps its status (502 if an aviso failed, 200 if not) and its counts. Only
 * counts and error messages reach the logs, never a token or a ticket.
 */
export async function correrRonda(
  pasos: PasosDeLaRonda,
  registro: Pick<Console, 'log' | 'error'> = console,
): Promise<RespuestaDeLaRonda> {
  const resultado = await pasos.enviar();
  const estado = resultado.fallidos > 0 ? 502 : 200;

  // Logged before the receipts are read, so a failure there does not hide it.
  registro.log('enviar-recordatorios', resultado);

  try {
    const recibos = await pasos.revisarRecibos();
    registro.log('enviar-recordatorios recibos', recibos);
    return { estado, body: { ...resultado, recibos } };
  } catch (error) {
    registro.error(
      'enviar-recordatorios recibos failed',
      error instanceof Error ? error.message : 'unknown error',
    );
    return { estado, body: { ...resultado, recibos: { falla: 'error_servidor' } } };
  }
}
