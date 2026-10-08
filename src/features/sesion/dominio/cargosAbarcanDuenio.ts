import type { Cargo } from './cargo';

/**
 * A duenio together with the place it has in the structure right now: the
 * levels it depends on. Whether a cargo covers a duenio cannot be decided
 * without them.
 */
export type DuenioEnEstructura =
  | { alcance: 'iglesia'; iglesiaId: string; distritoId: string; asociacionId: string }
  | { alcance: 'distrito'; distritoId: string; asociacionId: string }
  | { alcance: 'asociacion'; asociacionId: string };

/**
 * A cargo covers its level and everything that depends on it, never what is
 * above it or beside it.
 */
function cargoAbarcaDuenio(cargo: Cargo, duenio: DuenioEnEstructura): boolean {
  switch (cargo.nivel) {
    case 'iglesia':
      return duenio.alcance === 'iglesia' && duenio.iglesiaId === cargo.iglesiaId;
    case 'distrito':
      return duenio.alcance !== 'asociacion' && duenio.distritoId === cargo.distritoId;
    case 'asociacion':
      return duenio.asociacionId === cargo.asociacionId;
  }
}

/**
 * Whether a usuario with these cargos can write the eventos of a duenio: one
 * cargo that covers it is enough.
 *
 * It only decides which actions the app shows. The database decides again on
 * every write, with the same rule (`public.cargos_abarcan_duenio`).
 */
export function cargosAbarcanDuenio(cargos: readonly Cargo[], duenio: DuenioEnEstructura): boolean {
  return cargos.some((cargo) => cargoAbarcaDuenio(cargo, duenio));
}
