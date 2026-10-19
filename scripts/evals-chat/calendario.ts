// The calendario de prueba of the evals, from calendario-de-prueba.json to the
// rows the script writes. Pure, so Jest covers it.

import type { Enfasis } from '../../src/features/eventos/dominio/evento.ts';
import { sumarDias } from './evaluar.ts';

export type EventoDePrueba = {
  titulo: string;
  /** Nombre of the asociacion, the distrito or one of the iglesias. */
  duenio: string;
  /** First day, counted from the anclaje. */
  dia: number;
  /** `HH:MM`. */
  hora: string;
  lugar: string | null;
  descripcion: string | null;
  enfasis: Enfasis | null;
  /** Last day of an evento of several days. */
  diaFin?: number;
  /** Repeats every week until this dia, included. */
  semanalHasta?: number;
  /** Nombres of the iglesias the evento is shared with. */
  sumadas?: string[];
};

export type CalendarioDePrueba = {
  asociacion: string;
  zonaHoraria: string;
  distrito: string;
  iglesias: { nombre: string; direccion: string; ciudad: string; provincia: string }[];
  /** The iglesia of the cargo of the person who asks. */
  encargadoDe: string;
  eventos: EventoDePrueba[];
};

/**
 * Fixed ids, so a run cleans what an earlier one left behind. The `e7a1`
 * prefix keeps them apart from the ids of the seed and of the tests.
 */
export const IDS = {
  asociacion: 'e7a10000-0000-4000-8000-000000000001',
  distrito: 'e7a10000-0000-4000-8000-000000000002',
  iglesia: (posicion: number) =>
    `e7a10000-0000-4000-8000-${String(100 + posicion).padStart(12, '0')}`,
};

export type FilaDeEvento = {
  titulo: string;
  lugar: string | null;
  descripcion: string | null;
  enfasis: Enfasis | null;
  alcance: 'iglesia' | 'distrito' | 'asociacion';
  duenio_iglesia_id: string | null;
  duenio_distrito_id: string | null;
  duenio_asociacion_id: string | null;
  hora: string;
  fecha_fin: string | null;
  repeticion: 'ninguna' | 'semanal';
  fin_de_serie: string | null;
};

/** `sumadas` are the ids of the iglesias the evento is shared with. */
export type EventoParaCargar = { fila: FilaDeEvento; fechas: string[]; sumadas: string[] };

function getDuenio(
  calendario: CalendarioDePrueba,
  nombre: string,
): Pick<
  FilaDeEvento,
  'alcance' | 'duenio_iglesia_id' | 'duenio_distrito_id' | 'duenio_asociacion_id'
> {
  const ninguno = { duenio_iglesia_id: null, duenio_distrito_id: null, duenio_asociacion_id: null };
  if (nombre === calendario.asociacion) {
    return { ...ninguno, alcance: 'asociacion', duenio_asociacion_id: IDS.asociacion };
  }
  if (nombre === calendario.distrito) {
    return { ...ninguno, alcance: 'distrito', duenio_distrito_id: IDS.distrito };
  }
  const posicion = calendario.iglesias.findIndex((iglesia) => iglesia.nombre === nombre);
  if (posicion === -1) {
    throw new Error(`Unknown duenio in the calendario de prueba: ${nombre}`);
  }
  return { ...ninguno, alcance: 'iglesia', duenio_iglesia_id: IDS.iglesia(posicion) };
}

/**
 * The fechas of an evento as eventos_fechas keeps them: one for an evento
 * (even one of several days, whose range is its fecha_fin), one per week for a
 * series.
 */
function getFechas(evento: EventoDePrueba, anclaje: string): string[] {
  const hasta = evento.semanalHasta ?? evento.dia;
  const fechas: string[] = [];
  for (let dia = evento.dia; dia <= hasta; dia += 7) {
    fechas.push(sumarDias(anclaje, dia));
  }
  return fechas;
}

/** The eventos of the calendario de prueba, with their dates from the anclaje. */
export function getEventosParaCargar(
  calendario: CalendarioDePrueba,
  anclaje: string,
): EventoParaCargar[] {
  return calendario.eventos.map((evento) => ({
    fila: {
      titulo: evento.titulo,
      lugar: evento.lugar,
      descripcion: evento.descripcion,
      enfasis: evento.enfasis,
      ...getDuenio(calendario, evento.duenio),
      hora: evento.hora,
      fecha_fin: evento.diaFin === undefined ? null : sumarDias(anclaje, evento.diaFin),
      repeticion: evento.semanalHasta === undefined ? 'ninguna' : 'semanal',
      fin_de_serie:
        evento.semanalHasta === undefined ? null : sumarDias(anclaje, evento.semanalHasta),
    },
    fechas: getFechas(evento, anclaje),
    sumadas: (evento.sumadas ?? []).map((nombre) => {
      const posicion = calendario.iglesias.findIndex((iglesia) => iglesia.nombre === nombre);
      if (posicion === -1) {
        throw new Error(`Unknown iglesia in the calendario de prueba: ${nombre}`);
      }
      return IDS.iglesia(posicion);
    }),
  }));
}
