import type { Duenio } from './evento.ts';

/** What the rule needs to know of an iglesia. */
export type IglesiaParaSumar = { id: string; distritoId: string };

/**
 * The iglesias an evento can be shared with: the ones that do not see it
 * already by its alcance. The duenia sees an evento of iglesia, and every
 * iglesia of the distrito sees an evento of distrito. Every iglesia sees an
 * evento of asociacion, so it is not shared.
 */
export function getIglesiasParaSumar<T extends IglesiaParaSumar>(
  duenio: Duenio,
  iglesias: readonly T[],
): T[] {
  switch (duenio.alcance) {
    case 'iglesia':
      return iglesias.filter((iglesia) => iglesia.id !== duenio.iglesiaId);
    case 'distrito':
      return iglesias.filter((iglesia) => iglesia.distritoId !== duenio.distritoId);
    case 'asociacion':
      return [];
  }
}
