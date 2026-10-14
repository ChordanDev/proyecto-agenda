/** An evento read with the distrito that owns it, if one does. */
export type DuenioDeDistritoLeido = {
  duenioDistritoId: string | null;
  /** Nombre of that distrito; null when no distrito owns the evento. */
  nombreDeDistrito: string | null;
};

/**
 * Nombre of each distrito that owns one of the eventos, by its id: a duenio only
 * carries ids, and the calendar shows which distrito an evento comes from.
 */
export function armarNombresDeDistritos(
  eventos: readonly DuenioDeDistritoLeido[],
): Record<string, string> {
  const nombres: Record<string, string> = {};

  for (const { duenioDistritoId, nombreDeDistrito } of eventos) {
    if (duenioDistritoId && nombreDeDistrito) {
      nombres[duenioDistritoId] = nombreDeDistrito;
    }
  }

  return nombres;
}
