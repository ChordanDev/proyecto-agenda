/** What Ajustes needs to know about an iglesia. */
type IglesiaDeAjustes = {
  id: string;
  nombre: string;
  /** Nombre of its distrito. */
  distrito: string;
  deBaja: boolean;
};

export type MiIglesia = {
  nombre: string;
  distrito: string;
};

/**
 * The iglesia elegida of this phone, or null when none was chosen or the one
 * chosen no longer exists or was dada de baja: in every case there is no
 * iglesia to show, and the phone chooses another one.
 */
export function getMiIglesia(
  iglesiaElegidaId: string | null,
  iglesias: readonly IglesiaDeAjustes[],
): MiIglesia | null {
  const iglesia = iglesias.find(({ id }) => id === iglesiaElegidaId);

  return iglesia && !iglesia.deBaja ? { nombre: iglesia.nombre, distrito: iglesia.distrito } : null;
}
