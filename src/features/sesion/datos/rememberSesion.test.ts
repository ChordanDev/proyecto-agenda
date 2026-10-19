import { QueryClient } from '@tanstack/react-query';

import { rememberSesion } from './rememberSesion';

// Without a garbage collection timer, the clients do not keep Jest running.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

describe('rememberSesion', () => {
  it('knows there is a session', async () => {
    const queryClient = newClient();

    await rememberSesion(queryClient);

    expect(queryClient.getQueryData(['sesion'])).toBe(true);
  });

  it('forgets the consentimiento of the chat left by whoever was signed in before', async () => {
    const queryClient = newClient();
    queryClient.setQueryData(['chat', 'consentimiento'], true);

    await rememberSesion(queryClient);

    expect(queryClient.getQueryData(['chat', 'consentimiento'])).toBeUndefined();
  });

  it('reads the cargos again', async () => {
    const queryClient = newClient();
    queryClient.setQueryData(['cargos'], []);

    await rememberSesion(queryClient);

    expect(queryClient.getQueryState(['cargos'])?.isInvalidated).toBe(true);
  });
});
