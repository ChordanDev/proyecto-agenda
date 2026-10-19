import { formatLongDate } from '@/features/calendario/dominio/calendarioTexts';

import type { FallaDeConsulta } from './consulta';
import { getPeriodo } from './periodo';

/**
 * Why a consulta got no respuesta, as the app sees it: the fallas of the
 * server function, plus `sin_conexion` when the call did not reach it.
 */
export type Falla = FallaDeConsulta | 'sin_conexion';

/**
 * What the chat shows for a falla (diseno/README.md, estados `7e` to `7h`).
 * - `sin-conexion`: the mensaje was not sent; only "Reintentar", since the
 *   formulario cannot save without a conexion either.
 * - `caido`: the asistente is not working; "Reintentar" and "Ir al formulario".
 * - `limite-diario`: the cuadro de texto gives way to the aviso of the limite.
 * - `presupuesto-agotado`: the chat is closed until the next mes.
 */
export type EstadoDeFalla = 'sin-conexion' | 'caido' | 'limite-diario' | 'presupuesto-agotado';

const FALLAS: readonly FallaDeConsulta[] = [
  'sin_sesion',
  'pedido_invalido',
  'mensaje_largo',
  'sin_consentimiento',
  'limite_diario',
  'presupuesto_agotado',
  'proveedor_caido',
  'error_servidor',
];

/**
 * The estado of a falla. The fallas the usuario cannot fix by waiting (a
 * sesion that expired, a pedido the app built wrong, the database) show as
 * the asistente caído, which offers to retry and the formulario.
 */
export function getEstadoDeFalla(falla: Falla): EstadoDeFalla {
  switch (falla) {
    case 'sin_conexion':
      return 'sin-conexion';
    case 'limite_diario':
      return 'limite-diario';
    case 'presupuesto_agotado':
      return 'presupuesto-agotado';
    default:
      return 'caido';
  }
}

/** The falla in the body the server function answers with, `{ falla }`; any other is an error of the server. */
export function leerFalla(body: unknown): FallaDeConsulta {
  const falla =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>).falla : null;

  return FALLAS.find((conocida) => conocida === falla) ?? 'error_servidor';
}

/** The dia of the asociacion at this moment, `YYYY-MM-DD`. */
export function getHoy(ahora: Date, zonaHoraria: string): string {
  return getPeriodo(ahora, zonaHoraria).dia;
}

/**
 * The dia the chat works again after the presupuesto ran out: the first day
 * of the next mes of the asociacion, `YYYY-MM-DD`.
 */
export function getDiaDeVuelta(ahora: Date, zonaHoraria: string): string {
  const { mes } = getPeriodo(ahora, zonaHoraria);
  const [year, month] = mes.split('-').map(Number);

  return month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/** The dia of vuelta as the chat says it: "1 de noviembre". */
export function formatVuelta(dia: string): string {
  // "1 de noviembre de 2026" without its year: it is always the next mes.
  return formatLongDate(dia).replace(/ de \d{4}$/, '');
}
