/**
 * How long what was downloaded stays valid. Within it, showing the same data
 * again (a month already seen, the iglesia elegida) makes no request; past it,
 * the data on screen is read again when the app comes back to the front.
 *
 * The calendario changes a few times a week, and someone flicking between two
 * months on mobile data should not download them again and again. The offline
 * cache (#27) keeps what was downloaded beyond this: it only decides when to
 * ask again.
 */
export const VIGENCIA_MS = 15 * 60 * 1000;
