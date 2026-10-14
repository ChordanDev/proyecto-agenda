import type { Cargo } from '@/features/sesion/dominio/cargo';
import { cargosAbarcanDuenio } from '@/features/sesion/dominio/cargosAbarcanDuenio';

import { getDuenioDelDetalle } from './detalleDeEvento';
import type { Duenio } from './evento';

/** Every level of the structure with its nombre, as the form needs it. */
export type EstructuraConNombres = {
  asociaciones: readonly { id: string; nombre: string }[];
  distritos: readonly { id: string; nombre: string; asociacionId: string }[];
  iglesias: readonly { id: string; nombre: string; distritoId: string }[];
};

/** A duenio the form offers: who it is, and a line under its nombre. */
export type OpcionDeDuenio = {
  duenio: Duenio;
  /** "Iglesia Córdoba Central", "Distrito Centro" or the nombre of the asociacion. */
  nombre: string;
  detalle: string;
};

/** The duenios the form offers, grouped by level as the design lists them. */
export type OpcionesDeDuenio = {
  asociaciones: OpcionDeDuenio[];
  distritos: OpcionDeDuenio[];
  iglesias: OpcionDeDuenio[];
};

function byNombre(a: OpcionDeDuenio, b: OpcionDeDuenio): number {
  return a.nombre.localeCompare(b.nombre, 'es');
}

function describeIglesias(count: number): string {
  return count === 1 ? 'Se ve en su única iglesia' : `Se ve en sus ${count} iglesias`;
}

/**
 * The duenios a usuario can give an evento: every level one of their cargos
 * covers, with the same rule the database applies when saving. An encargado
 * gets their iglesia, a pastor their distrito and its iglesias, and an admin
 * their asociacion with all its distritos and iglesias.
 */
export function getOpcionesDeDuenio(
  cargos: readonly Cargo[],
  estructura: EstructuraConNombres,
): OpcionesDeDuenio {
  const distritosById = new Map(estructura.distritos.map((distrito) => [distrito.id, distrito]));

  const asociaciones = estructura.asociaciones
    .filter((asociacion) =>
      cargosAbarcanDuenio(cargos, { alcance: 'asociacion', asociacionId: asociacion.id }),
    )
    .map((asociacion): OpcionDeDuenio => ({
      duenio: { alcance: 'asociacion', asociacionId: asociacion.id },
      nombre: getDuenioDelDetalle(
        { alcance: 'asociacion', asociacionId: asociacion.id },
        asociacion.nombre,
      ).nombre,
      detalle: 'Se ve en todas sus iglesias',
    }));

  const distritos = estructura.distritos
    .filter((distrito) =>
      cargosAbarcanDuenio(cargos, {
        alcance: 'distrito',
        distritoId: distrito.id,
        asociacionId: distrito.asociacionId,
      }),
    )
    .map((distrito): OpcionDeDuenio => {
      const duenio: Duenio = { alcance: 'distrito', distritoId: distrito.id };

      return {
        duenio,
        nombre: getDuenioDelDetalle(duenio, distrito.nombre).nombre,
        detalle: describeIglesias(
          estructura.iglesias.filter((iglesia) => iglesia.distritoId === distrito.id).length,
        ),
      };
    });

  const iglesias = estructura.iglesias.flatMap((iglesia): OpcionDeDuenio[] => {
    const distrito = distritosById.get(iglesia.distritoId);

    if (
      distrito === undefined ||
      !cargosAbarcanDuenio(cargos, {
        alcance: 'iglesia',
        iglesiaId: iglesia.id,
        distritoId: distrito.id,
        asociacionId: distrito.asociacionId,
      })
    ) {
      return [];
    }

    const duenio: Duenio = { alcance: 'iglesia', iglesiaId: iglesia.id };

    return [
      {
        duenio,
        nombre: getDuenioDelDetalle(duenio, iglesia.nombre).nombre,
        detalle: getDuenioDelDetalle(
          { alcance: 'distrito', distritoId: distrito.id },
          distrito.nombre,
        ).nombre,
      },
    ];
  });

  return {
    asociaciones: asociaciones.sort(byNombre),
    distritos: distritos.sort(byNombre),
    iglesias: iglesias.sort(byNombre),
  };
}

function allOpciones(opciones: OpcionesDeDuenio): OpcionDeDuenio[] {
  return [...opciones.asociaciones, ...opciones.distritos, ...opciones.iglesias];
}

/** The duenio a new evento starts with: the only possible one, or none to choose. */
export function getDuenioInicial(opciones: OpcionesDeDuenio): Duenio | null {
  const all = allOpciones(opciones);

  return all.length === 1 ? all[0].duenio : null;
}

function sameDuenio(a: Duenio, b: Duenio): boolean {
  switch (a.alcance) {
    case 'iglesia':
      return b.alcance === 'iglesia' && a.iglesiaId === b.iglesiaId;
    case 'distrito':
      return b.alcance === 'distrito' && a.distritoId === b.distritoId;
    case 'asociacion':
      return b.alcance === 'asociacion' && a.asociacionId === b.asociacionId;
  }
}

/** The option of a duenio; undefined when none is chosen or the cargos do not cover it. */
export function getOpcionDeDuenio(
  opciones: OpcionesDeDuenio,
  duenio: Duenio | null,
): OpcionDeDuenio | undefined {
  return duenio === null
    ? undefined
    : allOpciones(opciones).find((opcion) => sameDuenio(opcion.duenio, duenio));
}

/** How many duenios the form offers: with one, there is nothing to choose. */
export function countOpciones(opciones: OpcionesDeDuenio): number {
  return allOpciones(opciones).length;
}
