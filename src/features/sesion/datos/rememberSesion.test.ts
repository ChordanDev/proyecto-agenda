import { QueryClient, QueryObserver } from '@tanstack/react-query';

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

  it('forgets the cargos and encargados left by a session the server ended', async () => {
    const queryClient = newClient();
    queryClient.setQueryData(['cargos'], [{ rol: 'secretaria' }]);
    queryClient.setQueryData(['cargos', 'gestor'], { nombre: 'Ana' });
    queryClient.setQueryData(
      ['cargos', 'encargados', 'iglesia-1'],
      [{ correo: 'ana@example.com' }],
    );

    await rememberSesion(queryClient);

    expect(queryClient.getQueryData(['cargos'])).toBeUndefined();
    expect(queryClient.getQueryData(['cargos', 'gestor'])).toBeUndefined();
    expect(queryClient.getQueryData(['cargos', 'encargados', 'iglesia-1'])).toBeUndefined();
  });

  it('reads the cargos on screen again', async () => {
    const queryClient = newClient();
    queryClient.setQueryData(['cargos'], []);
    const queryFn = jest.fn().mockResolvedValue([]);
    const observer = new QueryObserver(queryClient, {
      queryKey: ['cargos'],
      queryFn,
      // Fresh: only rememberSesion makes it fetch.
      staleTime: Infinity,
    });
    const unsubscribe = observer.subscribe(() => {});

    await rememberSesion(queryClient);

    expect(queryFn).toHaveBeenCalled();
    unsubscribe();
  });
});
