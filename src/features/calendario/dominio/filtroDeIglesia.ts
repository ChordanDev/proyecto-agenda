import { armarCalendario, type FechaDeEvento, type IglesiaEnEstructura } from './armarCalendario';

/** The filter by iglesia is offered only to whoever's cargos cover more than one. */
export function hasFiltroDeIglesia(iglesias: readonly IglesiaEnEstructura[]): boolean {
  return iglesias.length > 1;
}

/**
 * The iglesia the filter shows as selected: the one chosen while the cargos
 * still cover it, otherwise null ("Todas"), which is what the calendario shows.
 */
export function getIglesiaSeleccionada(
  iglesias: readonly IglesiaEnEstructura[],
  selectedIglesiaId: string | null,
): string | null {
  return iglesias.some((iglesia) => iglesia.id === selectedIglesiaId) ? selectedIglesiaId : null;
}

/**
 * The fechas of the calendario of the selected iglesia, out of those of all the
 * iglesias the cargos cover. Null is "Todas" and keeps every fecha, as does an
 * iglesia the cargos no longer cover.
 */
export function filterFechasByIglesia(
  fechas: readonly FechaDeEvento[],
  iglesias: readonly IglesiaEnEstructura[],
  selectedIglesiaId: string | null,
): FechaDeEvento[] {
  const selected = iglesias.find((iglesia) => iglesia.id === selectedIglesiaId);

  return selected === undefined ? [...fechas] : armarCalendario(selected, fechas);
}
