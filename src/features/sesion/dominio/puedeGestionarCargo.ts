/**
 * A cargo together with the place its level has in the structure right now,
 * and, for a cargo on an iglesia, whether it is a secretaria de iglesia. Who
 * manages a cargo cannot be decided without them.
 */
export type CargoEnEstructura =
  | {
      nivel: 'iglesia';
      iglesiaId: string;
      distritoId: string;
      asociacionId: string;
      esSecretaria: boolean;
    }
  | { nivel: 'distrito'; distritoId: string; asociacionId: string }
  | { nivel: 'asociacion'; asociacionId: string };

/**
 * Whether one cargo of the gestor manages another cargo:
 *
 * - an encargado of an iglesia: a secretaria of that iglesia, the pastor of its
 *   distrito or the admin of its asociacion;
 * - a secretaria de iglesia: the pastor of its distrito or the admin of its
 *   asociacion, never another secretaria;
 * - a pastor: the admin of its asociacion;
 * - an admin: nobody, only the developers.
 */
function cargoGestionaCargo(gestor: CargoEnEstructura, cargo: CargoEnEstructura): boolean {
  if (cargo.nivel === 'asociacion') return false;

  switch (gestor.nivel) {
    case 'iglesia':
      return (
        gestor.esSecretaria &&
        cargo.nivel === 'iglesia' &&
        !cargo.esSecretaria &&
        cargo.iglesiaId === gestor.iglesiaId
      );
    case 'distrito':
      return cargo.nivel === 'iglesia' && cargo.distritoId === gestor.distritoId;
    case 'asociacion':
      return cargo.asociacionId === gestor.asociacionId;
  }
}

/**
 * Whether a usuario with these cargos can give, edit (the nombre and the
 * funcion of whoever holds it) or remove a cargo: one cargo that manages it is
 * enough.
 *
 * It decides which actions the gestion shows, and the server function that
 * writes the cargos decides again with the same rule.
 */
export function puedeGestionarCargo(
  cargosDelGestor: readonly CargoEnEstructura[],
  cargo: CargoEnEstructura,
): boolean {
  return cargosDelGestor.some((gestor) => cargoGestionaCargo(gestor, cargo));
}

/**
 * Whether a usuario with these cargos can change the correo of whoever holds a
 * cargo: only an admin, and only of a cargo they manage.
 */
export function puedeCambiarCorreo(
  cargosDelGestor: readonly CargoEnEstructura[],
  cargo: CargoEnEstructura,
): boolean {
  return cargosDelGestor.some(
    (gestor) => gestor.nivel === 'asociacion' && cargoGestionaCargo(gestor, cargo),
  );
}
