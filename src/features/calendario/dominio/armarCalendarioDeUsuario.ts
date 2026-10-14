import { cargosAbarcanDuenio } from '@/features/sesion/dominio/cargosAbarcanDuenio';
import type { Cargo } from '@/features/sesion/dominio/cargo';

import {
  armarCalendarioDeIglesias,
  type FechaDeEvento,
  type IglesiaEnEstructura,
} from './armarCalendario';

/**
 * The iglesias a usuario's cargos cover, in the order received. Each one is
 * asked to the same rule that decides who may write its eventos, so an
 * encargado gets their iglesia, a pastor all those of their distrito and an
 * admin all those of their asociacion.
 */
export function getIglesiasDeCargos<T extends IglesiaEnEstructura>(
  cargos: readonly Cargo[],
  iglesias: readonly T[],
): T[] {
  return iglesias.filter((iglesia) =>
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
  iglesias: readonly IglesiaEnEstructura[],
  fechas: readonly FechaDeEvento[],
): FechaDeEvento[] {
  return armarCalendarioDeIglesias(getIglesiasDeCargos(cargos, iglesias), fechas);
}
