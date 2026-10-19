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
 * What the push service did with an aviso: took it, rejected its token as no
 * longer valid (the app was uninstalled), or failed for another reason.
 */
export type ResultadoDeAviso = 'enviado' | 'invalido' | 'fallido';

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
};

export type ResultadoDelEnvio = { enviados: number; desactivados: number; fallidos: number };

/**
 * The daily sending of recordatorios. It runs every hour; each asociacion whose
 * hour is 20 h now sends every phone that follows its iglesias one aviso of the
 * eventos of tomorrow (`armarAvisoDeManiana`). The tokens the push service
 * reports as invalid are turned off.
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
      .filter((_, indice) => resultados[indice] === 'invalido')
      .map(({ token }) => token);

    if (invalidos.length > 0) {
      await puertos.desactivar(invalidos);
    }

    resultado.enviados += resultados.filter((r) => r === 'enviado').length;
    resultado.desactivados += invalidos.length;
    resultado.fallidos += resultados.filter((r) => r === 'fallido').length;
  }

  return resultado;
}
