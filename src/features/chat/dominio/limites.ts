import { getPeriodo } from './periodo.ts';

/** Consultas a usuario can make in a dia of the asociacion. */
export const LIMITE_DIARIO = 50;

/** USD the chat can spend in a mes of the asociacion, for the whole account. */
export const PRESUPUESTO_MENSUAL_USD = 20;

/** From how many consultas left the chat warns about them. */
const AVISO_DESDE_RESTANTES = 5;

/** The consultas of a usuario in a dia, as the database counts them. */
export type ContadorDeConsultas = { dia: string; cantidad: number };

/** The gasto of the chat in a mes, as the database counts it. */
export type GastoDelMes = { mes: string; usd: number };

export type DecisionDeConsulta =
  'sin-consentimiento' | 'limite-diario' | 'presupuesto-agotado' | 'permitida';

/**
 * Whether a usuario can make a consulta now. The counters are the last ones
 * saved: one of another dia or mes no longer counts, so the count starts again
 * at 00:00 of the asociacion. Without consentimiento nothing else is looked at.
 */
export function decidirConsulta({
  ahora,
  zonaHoraria,
  consentimiento,
  consultas,
  gasto,
}: {
  ahora: Date;
  zonaHoraria: string;
  consentimiento: boolean;
  /** Null when the usuario never made a consulta. */
  consultas: ContadorDeConsultas | null;
  /** Null when the chat never spent anything. */
  gasto: GastoDelMes | null;
}): DecisionDeConsulta {
  if (!consentimiento) {
    return 'sin-consentimiento';
  }

  const { dia, mes } = getPeriodo(ahora, zonaHoraria);
  const consultasDeHoy = consultas?.dia === dia ? consultas.cantidad : 0;
  const gastoDelMes = gasto?.mes === mes ? gasto.usd : 0;

  if (consultasDeHoy >= LIMITE_DIARIO) {
    return 'limite-diario';
  }
  if (gastoDelMes >= PRESUPUESTO_MENSUAL_USD) {
    return 'presupuesto-agotado';
  }
  return 'permitida';
}

/**
 * The warning about the consultas left today: "Te quedan 5 consultas por hoy".
 * Null while there is margin, and once none is left, since the limit has its
 * own message.
 */
export function getAvisoDeConsultasRestantes(consultasDeHoy: number): string | null {
  const restantes = LIMITE_DIARIO - consultasDeHoy;

  if (restantes <= 0 || restantes > AVISO_DESDE_RESTANTES) {
    return null;
  }
  return restantes === 1
    ? 'Te queda 1 consulta por hoy'
    : `Te quedan ${restantes} consultas por hoy`;
}
