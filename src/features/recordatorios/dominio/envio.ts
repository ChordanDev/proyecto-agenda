import type {
  FechaDeEvento,
  IglesiaEnEstructura,
} from '../../calendario/dominio/armarCalendario.ts';

import { armarAvisoDeManiana, esHoraDelAviso, getManiana } from './avisoDeManiana.ts';

/** An asociacion and the zona horaria its 20 h is counted in. */
export type AsociacionDelEnvio = { id: string; zonaHoraria: string };

/** A phone with its recordatorios on and the iglesias it follows, as they are placed now. */
export type DispositivoDelEnvio = { token: string; iglesias: IglesiaEnEstructura[] };

/** One push notification: the Expo push token of the phone and its text. */
export type Aviso = { token: string; texto: string };

/**
 * What the push service did with an aviso: took it, with the ticket whose
 * receipt says later whether it reached the phone; rejected its token as no
 * longer valid (the app was uninstalled); or failed for another reason.
 */
export type ResultadoDeAviso =
  { estado: 'enviado'; ticket?: string } | { estado: 'invalido' } | { estado: 'fallido' };

/** A ticket of the push service and the token of the aviso it belongs to. */
export type ReciboPendiente = { ticket: string; token: string };

export type PuertosDeEnvio = {
  ahora(): Date;
  leerAsociaciones(): Promise<AsociacionDelEnvio[]>;
  /** The phones with their recordatorios on that follow an iglesia of the asociacion. */
  leerDispositivos(asociacionId: string): Promise<DispositivoDelEnvio[]>;
  /** Every date of an evento on `maniana`, and those of eventos of several days that cover it. */
  leerFechas(maniana: string): Promise<FechaDeEvento[]>;
  /** Sends the avisos; one result per aviso, in the same order. */
  enviar(avisos: Aviso[]): Promise<ResultadoDeAviso[]>;
  /** Turns off the phones of these tokens. */
  desactivar(tokens: string[]): Promise<void>;
  /** Keeps the tickets until their receipt is read (`revisarRecibos`). */
  guardarRecibos(recibos: ReciboPendiente[]): Promise<void>;
};

export type ResultadoDelEnvio = { enviados: number; desactivados: number; fallidos: number };

/**
 * The daily sending of recordatorios. It runs every hour; each asociacion whose
 * hour is 20 h now sends every phone that follows its iglesias one aviso of the
 * eventos of tomorrow (`armarAvisoDeManiana`). The tokens the push service
 * reports as invalid are turned off; the tickets of the avisos it took are
 * kept for `revisarRecibos`.
 */
export async function enviarRecordatorios(puertos: PuertosDeEnvio): Promise<ResultadoDelEnvio> {
  const ahora = puertos.ahora();
  const asociaciones = (await puertos.leerAsociaciones()).filter((asociacion) =>
    esHoraDelAviso(ahora, asociacion.zonaHoraria),
  );

  const resultado: ResultadoDelEnvio = { enviados: 0, desactivados: 0, fallidos: 0 };

  for (const asociacion of asociaciones) {
    const maniana = getManiana(ahora, asociacion.zonaHoraria);
    const dispositivos = await puertos.leerDispositivos(asociacion.id);

    if (dispositivos.length === 0) {
      continue;
    }

    const fechas = await puertos.leerFechas(maniana);
    const avisos = dispositivos.flatMap(({ token, iglesias }): Aviso[] => {
      const texto = armarAvisoDeManiana(iglesias, fechas, maniana);

      return texto === null ? [] : [{ token, texto }];
    });

    if (avisos.length === 0) {
      continue;
    }

    const resultados = await puertos.enviar(avisos);
    const invalidos = avisos
      .filter((_, indice) => resultados[indice]?.estado === 'invalido')
      .map(({ token }) => token);

    if (invalidos.length > 0) {
      await puertos.desactivar(invalidos);
    }

    const recibos = avisos.flatMap(({ token }, indice): ReciboPendiente[] => {
      const enviado = resultados[indice];

      return enviado?.estado === 'enviado' && enviado.ticket
        ? [{ ticket: enviado.ticket, token }]
        : [];
    });

    if (recibos.length > 0) {
      await puertos.guardarRecibos(recibos);
    }

    resultado.enviados += resultados.filter((r) => r.estado === 'enviado').length;
    resultado.desactivados += invalidos.length;
    resultado.fallidos += resultados.filter((r) => r.estado === 'fallido').length;
  }

  return resultado;
}

/** How long Expo asks to wait before reading the receipt of a ticket. */
export const ESPERA_DEL_RECIBO_MS = 15 * 60 * 1000;

/** How long a ticket is kept waiting for its receipt: Expo keeps receipts for about a day. */
export const VIDA_DEL_RECIBO_MS = 24 * 60 * 60 * 1000;

/** A kept ticket, with when its aviso was sent. */
export type ReciboGuardado = ReciboPendiente & { enviadoAt: Date };

/**
 * What the receipt of a ticket says: the aviso reached the phone; the token is
 * no longer valid (DeviceNotRegistered); or it failed for another reason.
 */
export type EstadoDeRecibo = 'ok' | 'invalido' | 'fallido';

export type PuertosDeRecibos = {
  ahora(): Date;
  /** The tickets kept up to `hasta`. */
  leerRecibos(hasta: Date): Promise<ReciboGuardado[]>;
  /** The receipts the push service has of these tickets; a ticket without one yet is missing. */
  consultarRecibos(tickets: string[]): Promise<Map<string, EstadoDeRecibo>>;
  /** Turns off the phones of these tokens. */
  desactivar(tokens: string[]): Promise<void>;
  /** Forgets these tickets. */
  borrarRecibos(tickets: string[]): Promise<void>;
};

export type ResultadoDeRecibos = { revisados: number; desactivados: number };

/**
 * Reads the receipts of the tickets kept at least 15 minutes ago. Apple and
 * Google report many uninstalls only there, so a DeviceNotRegistered receipt
 * turns its phone off. A ticket is forgotten once its receipt is read, or a
 * day after it was kept if the receipt never came; until then each hourly run
 * asks again.
 */
export async function revisarRecibos(puertos: PuertosDeRecibos): Promise<ResultadoDeRecibos> {
  const ahora = puertos.ahora().getTime();
  const guardados = await puertos.leerRecibos(new Date(ahora - ESPERA_DEL_RECIBO_MS));

  if (guardados.length === 0) {
    return { revisados: 0, desactivados: 0 };
  }

  const estados = await puertos.consultarRecibos(guardados.map(({ ticket }) => ticket));
  const invalidos = [
    ...new Set(
      guardados
        .filter(({ ticket }) => estados.get(ticket) === 'invalido')
        .map(({ token }) => token),
    ),
  ];

  if (invalidos.length > 0) {
    await puertos.desactivar(invalidos);
  }

  const vencidoHasta = ahora - VIDA_DEL_RECIBO_MS;
  const olvidados = guardados
    .filter(({ ticket, enviadoAt }) => estados.has(ticket) || enviadoAt.getTime() <= vencidoHasta)
    .map(({ ticket }) => ticket);

  if (olvidados.length > 0) {
    await puertos.borrarRecibos(olvidados);
  }

  return {
    revisados: guardados.filter(({ ticket }) => estados.has(ticket)).length,
    desactivados: invalidos.length,
  };
}
