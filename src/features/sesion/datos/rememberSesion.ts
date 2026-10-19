import type { QueryClient } from '@tanstack/react-query';

/**
 * What the app knows once a sign-in finishes: there is a session, and nothing
 * read for whoever was signed in before is taken as this usuario's.
 */
export async function rememberSesion(queryClient: QueryClient) {
  queryClient.setQueryData(['sesion'], true);
  // Whatever the chat kept, such as the consentimiento, belonged to the usuario
  // before: a session the server ended never went through forgetSesion.
  queryClient.removeQueries({ queryKey: ['chat'] });
  // The cargos of whoever was signed in before are not these ones.
  await queryClient.invalidateQueries({ queryKey: ['cargos'] });
}
