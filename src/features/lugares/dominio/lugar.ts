import type { Duenio } from '@/features/eventos/dominio/evento';
import { getDuenioId } from '@/features/eventos/dominio/opcionesDeDuenio';

/** A lugar of the list of a duenio, where its eventos are held. */
export type Lugar = {
  id: string;
  nombre: string;
  duenio: Duenio;
};

/**
 * The lugar chosen for an evento: one of the list, or the text an evento saved
 * before the list keeps, written by hand.
 */
export type LugarElegido = { tipo: 'guardado'; lugar: Lugar } | { tipo: 'escrito'; nombre: string };

/** A row of the sheet of the lugar: choosing it gives `elegido` to the form. */
export type OpcionDeLugar = {
  key: string;
  nombre: string;
  /** The lugar of an old evento, written by hand. */
  aMano: boolean;
  /** Null is "Sin lugar". */
  elegido: LugarElegido | null;
  checked: boolean;
};

/** A nombre as it is saved: trimmed, with single spaces. Capitals and accents stay. */
export function limpiarNombreDeLugar(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ');
}

/**
 * The form two nombres are compared by: no capitals, no accents and single
 * spaces. The database compares them the same way (public.lugar_nombre_key).
 */
export function getNombreKey(nombre: string): string {
  return limpiarNombreDeLugar(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function isSameDuenio(a: Duenio, b: Duenio): boolean {
  return a.alcance === b.alcance && getDuenioId(a) === getDuenioId(b);
}

export type ResultadoDeLugarNuevo =
  { ok: true; nuevo: string } | { ok: true; existente: Lugar } | { ok: false; error: string };

/**
 * What "+ Agregar lugar" does with what was written: a nombre to save, or the
 * lugar of the list that already has it, which is chosen instead of repeating
 * it. `lugares` are those of the duenio of the evento.
 */
export function resolverLugarNuevo(
  lugares: readonly Lugar[],
  nombre: string,
): ResultadoDeLugarNuevo {
  const limpio = limpiarNombreDeLugar(nombre);

  if (limpio === '') {
    return { ok: false, error: 'Escribí el nombre del lugar.' };
  }

  const key = getNombreKey(limpio);
  const existente = lugares.find((lugar) => getNombreKey(lugar.nombre) === key);

  return existente ? { ok: true, existente } : { ok: true, nuevo: limpio };
}

function isSameElegido(a: LugarElegido | null, b: LugarElegido | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }

  if (a.tipo === 'guardado' && b.tipo === 'guardado') {
    return a.lugar.id === b.lugar.id;
  }

  return a.tipo === 'escrito' && b.tipo === 'escrito' && a.nombre === b.nombre;
}

/**
 * The rows of the sheet of the lugar: "Sin lugar", the lugar written by hand of
 * an old evento if it has one, and the lugares of the duenio by nombre. A lugar
 * chosen that the list does not have yet (just added) is offered too.
 */
export function getOpcionesDeLugar(
  lugares: readonly Lugar[],
  duenio: Duenio | null,
  elegido: LugarElegido | null,
): OpcionDeLugar[] {
  const delDuenio =
    duenio === null ? [] : lugares.filter((lugar) => isSameDuenio(lugar.duenio, duenio));

  if (elegido?.tipo === 'guardado' && !delDuenio.some((lugar) => lugar.id === elegido.lugar.id)) {
    delDuenio.push(elegido.lugar);
  }

  const candidatos: Omit<OpcionDeLugar, 'checked'>[] = [
    { key: 'sin-lugar', nombre: 'Sin lugar', aMano: false, elegido: null },
    ...(elegido?.tipo === 'escrito'
      ? [{ key: 'escrito', nombre: elegido.nombre, aMano: true, elegido }]
      : []),
    ...delDuenio
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((lugar) => ({
        key: lugar.id,
        nombre: lugar.nombre,
        aMano: false,
        elegido: { tipo: 'guardado', lugar } as const,
      })),
  ];

  return candidatos.map((opcion) => ({
    ...opcion,
    checked: isSameElegido(opcion.elegido, elegido),
  }));
}

/** Why saving a lugar failed, as far as the person can act on it. */
export type TipoDeErrorDeLugar = 'sin-conexion' | 'sin-permiso' | 'no-existe' | 'otro';

const MENSAJES: Record<TipoDeErrorDeLugar, string> = {
  'sin-conexion': 'Hace falta conexión a internet. Revisá la conexión y probá de nuevo.',
  'sin-permiso': 'Tus cargos no te permiten agregar lugares de este dueño.',
  // guardar_lugar never raises it; it shares the classifier of the eventos.
  'no-existe': 'No se pudo guardar el lugar. Probá de nuevo en un momento.',
  otro: 'No se pudo guardar el lugar. Probá de nuevo en un momento.',
};

/** What the sheet tells when "+ Agregar lugar" fails. */
export function getMensajeDeErrorDeLugar(tipo: TipoDeErrorDeLugar): string {
  return MENSAJES[tipo];
}

/** The saves of "+ Agregar lugar" of an open sheet: only the last one still counts. */
export type IntentosDeLugar = {
  /** A new save; its answer counts while it stays the last one. */
  empezar: () => number;
  /** Something else was chosen or the sheet was closed: no save counts any more. */
  cancelar: () => void;
  esVigente: (intento: number) => boolean;
};

/**
 * A save that answers late must not replace what the person did meanwhile:
 * choosing another lugar, "Sin lugar", closing the sheet or saving again.
 */
export function crearIntentosDeLugar(): IntentosDeLugar {
  let actual = 0;

  return {
    empezar: () => {
      actual += 1;
      return actual;
    },
    cancelar: () => {
      actual += 1;
    },
    esVigente: (intento) => intento === actual,
  };
}
