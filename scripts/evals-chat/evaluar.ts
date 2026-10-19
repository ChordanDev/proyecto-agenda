// What an eval of the chat expects and how a respuesta is graded against it.
// Pure, so Jest covers it; the run against the server function is in
// scripts/evals-chat.ts.
//
// The calendario de prueba and the casos count their dates in dias from an
// anclaje (the next sabado), so "el sábado que viene" means the same evento on
// any day the evals run.

import type {
  MensajeDelTramo,
  RespuestaDeConsulta,
} from '../../src/features/chat/dominio/consulta.ts';
import type { Enfasis } from '../../src/features/eventos/dominio/evento.ts';

/** What the respuesta to a caso must hold. A missing field is not checked. */
export type Esperado = {
  tipo?: RespuestaDeConsulta['tipo'];
  /** Titulos of the eventos the respuesta draws, each once, in any order. `[]` expects none. */
  eventos?: readonly string[];
  /** Fragments the texto says, every one. Capitals and accents do not matter. */
  contiene?: readonly string[];
  /** Fragments of which the texto says at least one. */
  contieneAlguno?: readonly string[];
  /** Fragments the texto must not say. */
  noContiene?: readonly string[];
  /**
   * The evento the asistente proposes (proponer evento). `null` expects none;
   * each field named is checked, `dia` counted from the anclaje.
   */
  borrador?: null | {
    /** A fragment of the titulo. */
    titulo?: string;
    dia?: number;
    /** `HH:MM:SS`. */
    hora?: string;
    enfasis?: Enfasis | null;
  };
};

export type Categoria =
  | 'simple'
  | 'ambigua'
  | 'demasiadas'
  | 'fuera_de_tema'
  | 'falta_info'
  | 'sin_coincidencias'
  | 'carga';

export type Caso = {
  id: string;
  categoria: Categoria;
  mensaje: string;
  /** The mensajes before this one, for a caso that continues a conversation. */
  tramo?: readonly MensajeDelTramo[];
  esperado: Esperado;
};

export type Evaluacion = { acierto: boolean; fallos: string[] };

const UN_DIA_MS = 24 * 60 * 60 * 1000;
const SABADO = 6;

/** `YYYY-MM-DD` plus `dias`, which can be negative. */
export function sumarDias(fecha: string, dias: number): string {
  const fechaUtc = new Date(`${fecha}T00:00:00Z`);
  return new Date(fechaUtc.getTime() + dias * UN_DIA_MS).toISOString().slice(0, 10);
}

/** The next sabado after `hoy`: on a sabado, the one of next week. */
export function getAnclaje(hoy: string): string {
  const diaDeLaSemana = new Date(`${hoy}T00:00:00Z`).getUTCDay();
  return sumarDias(hoy, (SABADO - diaDeLaSemana + 7) % 7 || 7);
}

/** The `YYYY-MM-DD` of `ahora` in the zona horaria, the one the chat counts from. */
export function getHoy(ahora: Date, zonaHoraria: string): string {
  // en-CA writes dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: zonaHoraria }).format(ahora);
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function citar(fragmentos: readonly string[]): string {
  return fragmentos.map((fragmento) => `"${fragmento}"`).join(', ');
}

function getFallosDeBorrador(
  esperado: NonNullable<Esperado['borrador']>,
  borrador: RespuestaDeConsulta['borrador'],
  anclaje: string,
): string[] {
  if (borrador === null) {
    return ['borrador: se esperaba uno y no llegó'];
  }

  const fallos: string[] = [];
  if (
    esperado.titulo !== undefined &&
    !normalizar(borrador.titulo).includes(normalizar(esperado.titulo))
  ) {
    fallos.push(`borrador: el titulo "${borrador.titulo}" no dice "${esperado.titulo}"`);
  }
  if (esperado.dia !== undefined) {
    const fecha = sumarDias(anclaje, esperado.dia);
    if (borrador.fecha !== fecha) {
      fallos.push(`borrador: fecha ${borrador.fecha} en vez de ${fecha}`);
    }
  }
  if (esperado.hora !== undefined && borrador.hora !== esperado.hora) {
    fallos.push(`borrador: hora ${borrador.hora} en vez de ${esperado.hora}`);
  }
  if (esperado.enfasis !== undefined && borrador.enfasis !== esperado.enfasis) {
    fallos.push(`borrador: enfasis ${borrador.enfasis} en vez de ${esperado.enfasis}`);
  }
  return fallos;
}

/** Grades a respuesta: every expectation that fails, in the order of `Esperado`. */
export function evaluarCaso(
  esperado: Esperado,
  respuesta: RespuestaDeConsulta,
  anclaje: string,
): Evaluacion {
  const fallos: string[] = [];
  const texto = normalizar(respuesta.texto);
  const dice = (fragmento: string) => texto.includes(normalizar(fragmento));

  if (esperado.tipo !== undefined && respuesta.tipo !== esperado.tipo) {
    fallos.push(`tipo: se esperaba ${esperado.tipo} y llegó ${respuesta.tipo}`);
  }

  if (esperado.eventos !== undefined) {
    const llegados = [...new Set(respuesta.eventos.map((evento) => evento.titulo))].sort();
    const esperados = [...new Set(esperado.eventos)].sort();
    if (llegados.join('\n') !== esperados.join('\n')) {
      fallos.push(
        `eventos: se esperaba [${esperados.join(', ')}] y llegó [${llegados.join(', ')}]`,
      );
    }
  }

  for (const fragmento of esperado.contiene ?? []) {
    if (!dice(fragmento)) {
      fallos.push(`texto: falta "${fragmento}"`);
    }
  }
  if (esperado.contieneAlguno !== undefined && !esperado.contieneAlguno.some(dice)) {
    fallos.push(`texto: falta alguno de ${citar(esperado.contieneAlguno)}`);
  }
  for (const fragmento of esperado.noContiene ?? []) {
    if (dice(fragmento)) {
      fallos.push(`texto: no debía decir "${fragmento}"`);
    }
  }

  if (esperado.borrador === null && respuesta.borrador !== null) {
    fallos.push('borrador: no se esperaba uno');
  }
  if (esperado.borrador) {
    fallos.push(...getFallosDeBorrador(esperado.borrador, respuesta.borrador, anclaje));
  }

  return { acierto: fallos.length === 0, fallos };
}

export function resumir(evaluaciones: readonly Evaluacion[]): { aciertos: number; total: number } {
  return {
    aciertos: evaluaciones.filter((evaluacion) => evaluacion.acierto).length,
    total: evaluaciones.length,
  };
}
