import type { FirstScreen } from './getFirstScreen';

const routes = {
  bienvenida: '/bienvenida',
  calendario: '/calendario',
} as const satisfies Record<FirstScreen, string>;

/** The route of a first screen, shared by whoever sends the app to it. */
export function firstScreenRoute<Screen extends FirstScreen>(
  screen: Screen,
): (typeof routes)[Screen] {
  return routes[screen];
}
