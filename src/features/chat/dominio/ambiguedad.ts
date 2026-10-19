/** Up to this many coincidencias the chat answers with all of them. */
export const MAX_COINCIDENCIAS = 3;

/**
 * What the chat does with a busqueda, from how many eventos matched it:
 * - `ninguna`: nothing matched.
 * - `responder`: it answers with every coincidencia, each with its fecha and
 *   iglesia.
 * - `repreguntar`: too many to list; it asks to narrow the pregunta (which
 *   fecha, which iglesia).
 *
 * The code applies this rule, not the model.
 */
export type DecisionDeBusqueda = 'ninguna' | 'responder' | 'repreguntar';

export function decidirBusqueda(total: number): DecisionDeBusqueda {
  if (total <= 0) {
    return 'ninguna';
  }
  return total <= MAX_COINCIDENCIAS ? 'responder' : 'repreguntar';
}
