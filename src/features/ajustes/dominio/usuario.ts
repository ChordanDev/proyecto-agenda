import type { Cargo } from '@/features/sesion/dominio/cargo';

/** What the card of the usuario needs to know about an iglesia. */
type IglesiaDeUsuario = {
  id: string;
  nombre: string;
  distritoId: string;
  /** Nombre of its distrito. */
  distrito: string;
};

type UsuarioInput = {
  /** The email of the session, the only name the app knows of a usuario. */
  email: string | null;
  /** Undefined while they are being read. */
  cargos: readonly Cargo[] | undefined;
  /** Undefined while they are being read. */
  iglesias: readonly IglesiaDeUsuario[] | undefined;
};

export type DescripcionDeUsuario = {
  iniciales: string;
  titulo: string;
  /** Undefined while the cargos are being read. */
  detalle: string | undefined;
};

/**
 * The texts of the card of the usuario in Ajustes: who they are and which cargo
 * they hold. The app cannot read the names of the usuarios, so the email names
 * them.
 */
export function describeUsuario({ email, cargos, iglesias }: UsuarioInput): DescripcionDeUsuario {
  return {
    iniciales: email?.match(/[\p{L}\p{N}]/u)?.[0].toUpperCase() ?? '',
    titulo: email ?? 'Tu usuario',
    detalle: cargos && describeCargos(cargos, iglesias ?? []),
  };
}

function describeCargos(cargos: readonly Cargo[], iglesias: readonly IglesiaDeUsuario[]): string {
  if (cargos.length === 0) {
    return 'Sin cargos asignados';
  }

  if (cargos.length > 1) {
    return `${cargos.length} cargos`;
  }

  const [cargo] = cargos;

  switch (cargo.nivel) {
    case 'iglesia':
      return withPlace(
        'Encargado de calendario',
        iglesias.find(({ id }) => id === cargo.iglesiaId)?.nombre,
      );
    case 'distrito':
      return withPlace(
        'Pastor',
        iglesias.find(({ distritoId }) => distritoId === cargo.distritoId)?.distrito,
      );
    case 'asociacion':
      return 'Admin de la asociación';
  }
}

function withPlace(cargo: string, place: string | undefined): string {
  return place === undefined ? cargo : `${cargo} · ${place}`;
}
