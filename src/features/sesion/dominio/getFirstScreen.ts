/** The screen the app opens on. */
export type FirstScreen = 'bienvenida' | 'calendario';

type StartState = {
  /** An iglesia was chosen on this phone. */
  hasIglesiaElegida: boolean;
  hasSesion: boolean;
};

/**
 * The Bienvenida is only for whoever has not taken the first step yet: with an
 * iglesia elegida or a session, the app goes straight to the calendar.
 */
export function getFirstScreen({ hasIglesiaElegida, hasSesion }: StartState): FirstScreen {
  return hasIglesiaElegida || hasSesion ? 'calendario' : 'bienvenida';
}
