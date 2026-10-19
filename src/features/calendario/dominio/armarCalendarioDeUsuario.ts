import { cargosAbarcanDuenio } from '@/features/sesion/dominio/cargosAbarcanDuenio';
import type { Cargo } from '@/features/sesion/dominio/cargo';

import {
  armarCalendarioDeIglesias,
  type FechaDeEvento,
  type IglesiaEnEstructura,
} from './armarCalendario';

/** An iglesia of the structure, which may come with its mark of baja. */
type IglesiaConBaja = IglesiaEnEstructura & {
  /** Dada de baja: out of every calendario until it is reactivada. */
  deBaja?: boolean;
};

/**
 * The iglesias a usuario's cargos cover, in the order received. Each one is
 * asked to the same rule that decides who may write its eventos, so an
 * encargado gets their iglesia, a pastor all those of their distrito and an
 * admin all those of their asociacion. An iglesia dada de baja is covered by
 * nobody.
 */
export function getIglesiasDeCargos<T extends IglesiaConBaja>(
  cargos: readonly Cargo[],
  iglesias: readonly T[],
): T[] {
  return iglesias.filter(
    (iglesia) =>
      !iglesia.deBaja &&
      cargosAbarcanDuenio(cargos, {
        alcance: 'iglesia',
        iglesiaId: iglesia.id,
        distritoId: iglesia.distritoId,
        asociacionId: iglesia.asociacionId,
      }),
  );
}

/**
 * The calendario of a usuario: the union of the calendarios of the iglesias
 * their cargos cover. An evento that several of those iglesias see (one of a
 * distrito or an asociacion, or one shared with two of them) appears once.
 */
export function armarCalendarioDeUsuario(
  cargos: readonly Cargo[],
  iglesias: readonly IglesiaConBaja[],
  fechas: readonly FechaDeEvento[],
): FechaDeEvento[] {
  return armarCalendarioDeIglesias(getIglesiasDeCargos(cargos, iglesias), fechas);
}
