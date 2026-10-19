import type { IglesiaEnEstructura } from '@/features/calendario/dominio/armarCalendario';
import type { Cargo } from '@/features/sesion/dominio/cargo';
import { cargosAbarcanDuenio } from '@/features/sesion/dominio/cargosAbarcanDuenio';

/** What a phone saves to receive recordatorios: its switch and the iglesias it follows. */
export type Registro = {
  encendido: boolean;
  iglesiaIds: readonly string[];
};

/**
 * A registro as the database keeps it: `conUsuario` says whether it was saved
 * with a session, and `delUsuario` whether by the usuario of this session.
 */
export type RegistroGuardado = Registro & {
  conUsuario: boolean;
  delUsuario: boolean;
};

/**
 * Which iglesias a phone follows, decided by the cargos of whoever uses it:
 *
 * - `iglesia-elegida`: a hermano (no session, or a usuario without cargos).
 * - `sus-iglesias`: an encargado or a secretaria de iglesia, the iglesias of
 *   their cargos.
 * - `eligiendo`: a pastor or an admin, who choose among the iglesias their
 *   cargos cover.
 */
export type ModoDeRecordatorios = 'iglesia-elegida' | 'sus-iglesias' | 'eligiendo';

/** The cargos of the usuario signed in, or `null` without a session. */
type Cargos = readonly Cargo[] | null;

export function modoDeRecordatorios(cargos: Cargos): ModoDeRecordatorios {
  if (cargos === null || cargos.length === 0) {
    return 'iglesia-elegida';
  }
  return cargos.every((cargo) => cargo.nivel === 'iglesia') ? 'sus-iglesias' : 'eligiendo';
}

type Contexto = {
  cargos: Cargos;
  iglesiaElegidaId: string | null;
};

/**
 * The registro of a phone that starts: a hermano, an encargado and a
 * secretaria start on, with their iglesia; a pastor and an admin start off,
 * with none chosen.
 */
export function registroInicial({ cargos, iglesiaElegidaId }: Contexto): Registro {
  switch (modoDeRecordatorios(cargos)) {
    case 'iglesia-elegida':
      return { encendido: true, iglesiaIds: siguiendoIglesiaElegida(iglesiaElegidaId) };
    case 'sus-iglesias':
      return { encendido: true, iglesiaIds: iglesiasDeSusCargos(cargos ?? []) };
    case 'eligiendo':
      return { encendido: false, iglesiaIds: [] };
  }
}

/** The iglesias a pastor or an admin can choose: those their cargos cover, in the given order. */
export function iglesiasQuePuedeSeguir(
  cargos: readonly Cargo[],
  iglesias: readonly IglesiaEnEstructura[],
): string[] {
  return iglesias
    .filter((iglesia) =>
      cargosAbarcanDuenio(cargos, {
        alcance: 'iglesia',
        iglesiaId: iglesia.id,
        distritoId: iglesia.distritoId,
        asociacionId: iglesia.asociacionId,
      }),
    )
    .map((iglesia) => iglesia.id);
}

type ContextoGuardado = Contexto & {
  guardado: RegistroGuardado | null;
  /** Every iglesia with its place in the structure, to know which ones the cargos cover. */
  iglesias: readonly IglesiaEnEstructura[];
};

/**
 * The registro a phone should have now, given what it has saved.
 *
 * It starts from the initial value when it was never saved, or when whoever
 * uses the phone changed: the session was closed (so it follows the iglesia
 * elegida again) or another usuario signed in. Otherwise it keeps the switch,
 * and the iglesias follow the rule of the cargos: a hermano the iglesia
 * elegida, an encargado their iglesias, and a pastor or an admin what they
 * chose that their cargos still cover.
 */
export function registroDeseado({
  cargos,
  iglesiaElegidaId,
  guardado,
  iglesias,
}: ContextoGuardado): Registro {
  if (guardado === null || cambioQuienLoUsa(cargos, guardado)) {
    return registroInicial({ cargos, iglesiaElegidaId });
  }

  switch (modoDeRecordatorios(cargos)) {
    case 'iglesia-elegida':
      return {
        encendido: guardado.encendido,
        iglesiaIds: siguiendoIglesiaElegida(iglesiaElegidaId),
      };
    case 'sus-iglesias':
      return { encendido: guardado.encendido, iglesiaIds: iglesiasDeSusCargos(cargos ?? []) };
    case 'eligiendo': {
      const cubiertas = new Set(iglesiasQuePuedeSeguir(cargos ?? [], iglesias));
      const iglesiaIds = guardado.iglesiaIds.filter((id) => cubiertas.has(id));
      return { encendido: guardado.encendido && iglesiaIds.length > 0, iglesiaIds };
    }
  }
}

/**
 * Whether the phone was saved by someone other than whoever uses it now: with a
 * session, by another usuario or without one; without a session, by a usuario.
 * Then it must be saved again, even with the same values, so it becomes theirs.
 */
export function cambioQuienLoUsa(cargos: Cargos, guardado: RegistroGuardado): boolean {
  return cargos === null ? guardado.conUsuario : !guardado.delUsuario;
}

/** What a pastor or an admin saves from the choice of iglesias: on while one is chosen. */
export function elegirIglesias(iglesiaIds: readonly string[]): Registro {
  return { encendido: iglesiaIds.length > 0, iglesiaIds };
}

/** Whether two registros say the same, whatever the order of their iglesias. */
export function mismoRegistro(a: Registro, b: Registro): boolean {
  const iglesiasDeB = new Set(b.iglesiaIds);
  return (
    a.encendido === b.encendido &&
    new Set(a.iglesiaIds).size === iglesiasDeB.size &&
    a.iglesiaIds.every((id) => iglesiasDeB.has(id))
  );
}

function siguiendoIglesiaElegida(iglesiaElegidaId: string | null): string[] {
  return iglesiaElegidaId === null ? [] : [iglesiaElegidaId];
}

function iglesiasDeSusCargos(cargos: readonly Cargo[]): string[] {
  const ids = cargos.flatMap((cargo) => (cargo.nivel === 'iglesia' ? [cargo.iglesiaId] : []));
  return [...new Set(ids)];
}
