import type { ModoDeRecordatorios } from './recordatorios';

/** Joins nombres as a sentence: "A", "A y B", "A, B y C". */
export function listaDeNombres(nombres: readonly string[]): string {
  if (nombres.length <= 1) {
    return nombres.join('');
  }
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/** "1 iglesia", "2 iglesias". */
export function cuantasIglesias(cantidad: number): string {
  return cantidad === 1 ? '1 iglesia' : `${cantidad} iglesias`;
}

const AVISO = 'Te avisamos a las 20 h del día anterior a cada evento de';
const SIN_REGULARES = 'Las actividades regulares no avisan.';

/**
 * The text under the switch of Recordatorios (10-ajustes.html): which eventos
 * avisan and when. `nombres` are the iglesias the phone follows.
 */
export function textoDeRecordatorios({
  modo,
  nombres,
}: {
  modo: ModoDeRecordatorios;
  nombres: readonly string[];
}): string {
  if (modo === 'eligiendo') {
    return nombres.length === 0
      ? 'Elegí de qué iglesias querés que te avisemos, a las 20 h del día anterior a cada evento.'
      : `${AVISO} estas iglesias. ${SIN_REGULARES}`;
  }
  const de = nombres.length === 0 ? 'tu iglesia' : listaDeNombres(nombres);
  return `${AVISO} ${de}. ${SIN_REGULARES}`;
}
