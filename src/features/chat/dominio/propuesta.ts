// The vista previa of a borrador (issue #149): the card the chat draws, and
// the evento Confirmar saves. Confirmar saves the borrador through the same
// rules as the form; Editar opens the form loaded with it.

import { getCategoria, type Categoria } from '@/features/eventos/dominio/categoria';
import {
  formatFechaFin,
  formatFechaYHora,
  getDuenioDelDetalle,
  getEnfasisDelDetalle,
} from '@/features/eventos/dominio/detalleDeEvento';
import {
  validarFormulario,
  type EventoAGuardar,
  type FormularioDeEvento,
} from '@/features/eventos/dominio/formularioDeEvento';
import { formatHasta, formatRepeticionDelDetalle } from '@/features/eventos/dominio/repeticion';

import type { BorradorDeEvento } from './borrador';

/**
 * The form of a new evento loaded with the borrador. Its lugar is the one the
 * person wrote, not one of the list, and it shares with no iglesia: both are
 * chosen in the form.
 */
export function formularioDesdeBorrador(borrador: BorradorDeEvento): FormularioDeEvento {
  return {
    titulo: borrador.titulo,
    duenio: borrador.duenio,
    fecha: borrador.fecha,
    // The field of the hora shows "19:00", not the "19:00:00" of the database.
    hora: borrador.hora.slice(0, 5),
    fechaFin: borrador.fechaFin,
    repeticion: borrador.repeticion,
    finDeSerie: borrador.finDeSerie,
    lugar: borrador.lugar === null ? null : { tipo: 'escrito', nombre: borrador.lugar },
    descripcion: borrador.descripcion ?? '',
    categoria: getCategoria(borrador.enfasis),
    iglesiasSumadas: [],
  };
}

/**
 * The evento Confirmar saves, checked again with the rules of the form: the
 * card can stay open until a dato is no longer valid. The error is the one
 * the form would show; every problem, at once.
 */
export function getEventoDelBorrador(
  borrador: BorradorDeEvento,
  hoy: string,
): { ok: true; evento: EventoAGuardar } | { ok: false; error: string } {
  const resultado = validarFormulario(formularioDesdeBorrador(borrador), { hoy, editando: false });

  return resultado.ok
    ? resultado
    : { ok: false, error: Object.values(resultado.errores).join(' ') };
}

/** The card of a propuesta (diseno/capturas/7 · Chat IA.png), with the words of the detail. */
export type TarjetaDePropuesta = {
  categoria: Categoria;
  /** "Integramos". */
  lema: string;
  /** "Nuevas Generaciones"; null for the actividad regular, which is named by its lema alone. */
  enfasis: string | null;
  titulo: string;
  /** "Sábado 17 de octubre · 19:00". */
  cuando: string;
  /** "No se repite", or until when an evento of several days lasts; null for a series. */
  cuandoDetalle: string | null;
  /** How a series repeats and its "Hasta"; null when it does not repeat. */
  repeticion: { como: string; hasta: string } | null;
  lugar: string | null;
  /** "Iglesia Central". */
  duenio: string;
  /** "Se ve en todas las iglesias del distrito". */
  seVe: string;
};

export function getTarjetaDePropuesta(borrador: BorradorDeEvento): TarjetaDePropuesta {
  const { fecha, fechaFin, repeticion, finDeSerie } = borrador;
  const { lema, nombre } = getEnfasisDelDetalle(borrador.enfasis);
  const duenio = getDuenioDelDetalle(borrador.duenio, borrador.duenioNombre);
  const seRepite = repeticion !== 'ninguna' && finDeSerie !== null;

  return {
    categoria: getCategoria(borrador.enfasis),
    lema,
    enfasis: nombre,
    titulo: borrador.titulo,
    cuando: formatFechaYHora(fecha, borrador.hora),
    cuandoDetalle: seRepite
      ? null
      : fechaFin === null
        ? 'No se repite'
        : formatFechaFin(fecha, fechaFin),
    repeticion: seRepite
      ? { como: formatRepeticionDelDetalle(repeticion, fecha), hasta: formatHasta(finDeSerie) }
      : null,
    lugar: borrador.lugar,
    duenio: duenio.nombre,
    seVe: duenio.seVe,
  };
}
