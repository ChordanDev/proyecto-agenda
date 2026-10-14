/** State of the write of the iglesia elegida, as the mutation reports it. */
export type EstadoGuardado = 'idle' | 'pending' | 'success' | 'error';

/**
 * "Continuar" can confirm only an iglesia that is marked and also on display:
 * what is saved is always what the hermano sees marked.
 */
export function puedeConfirmar(
  idMarcada: string | null,
  visibles: readonly { id: string }[],
): boolean {
  return idMarcada !== null && visibles.some((iglesia) => iglesia.id === idMarcada);
}

/**
 * While the iglesia is being saved, and once it is saved, the screen is on its
 * way to the calendario: marking another row or going back would leave a
 * different iglesia marked than the one saved, or saved without arriving.
 */
export function aceptaCambios(estado: EstadoGuardado): boolean {
  return estado !== 'pending' && estado !== 'success';
}
