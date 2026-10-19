/**
 * A cargo of the usuario signed in, with the mark of secretaria de iglesia on
 * a cargo on an iglesia: the vista of the gestion depends on it.
 */
export type CargoDelGestor =
  | { nivel: 'iglesia'; iglesiaId: string; esSecretaria: boolean }
  | { nivel: 'distrito'; distritoId: string }
  | { nivel: 'asociacion'; asociacionId: string };

/**
 * What the tab Gestión shows: the vista of the admin, of the pastor with their
 * distritos, or of the secretaria de iglesia with the iglesias she is
 * secretaria of.
 */
export type VistaDeGestion =
  | { tipo: 'admin' }
  | { tipo: 'pastor'; distritoIds: string[] }
  | { tipo: 'secretaria'; iglesiaIds: string[] };

/**
 * The vista of the gestion for a usuario with these cargos, or null when they
 * have none: a common encargado manages nobody, and does not see the tab.
 *
 * A usuario with several cargos sees the vista of the highest one: admin, then
 * pastor, then secretaria de iglesia.
 */
export function getVistaDeGestion(cargos: readonly CargoDelGestor[]): VistaDeGestion | null {
  if (cargos.some((cargo) => cargo.nivel === 'asociacion')) {
    return { tipo: 'admin' };
  }

  const distritoIds = [
    ...new Set(cargos.flatMap((cargo) => (cargo.nivel === 'distrito' ? [cargo.distritoId] : []))),
  ];
  if (distritoIds.length > 0) {
    return { tipo: 'pastor', distritoIds };
  }

  const iglesiaIds = [
    ...new Set(
      cargos.flatMap((cargo) =>
        cargo.nivel === 'iglesia' && cargo.esSecretaria ? [cargo.iglesiaId] : [],
      ),
    ),
  ];

  return iglesiaIds.length > 0 ? { tipo: 'secretaria', iglesiaIds } : null;
}
