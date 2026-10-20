import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { getCargosDelUsuario } from './getCargosDelUsuario';
import { useVerifySignInCode } from './useCodeSignIn';
import { getDispositivo, guardarDispositivo } from '@/features/recordatorios/datos/dispositivo';
import { getPermiso, pedirPermiso } from '@/features/recordatorios/datos/telefono';

jest.mock('./codeSignIn', () => ({
  sendSignInCode: jest.fn(),
  verifySignInCode: jest.fn(async () => undefined),
}));
jest.mock('./getCargosDelUsuario', () => ({ getCargosDelUsuario: jest.fn() }));
// Read only when the cache has no answer: signing in sets it.
jest.mock('./sesionQuery', () => ({
  sesionQueryOptions: { queryKey: ['sesion'], queryFn: async () => false, staleTime: Infinity },
}));
jest.mock('@/features/recordatorios/datos/telefono', () => ({
  getPermiso: jest.fn(),
  pedirPermiso: jest.fn(),
  getTokenDelTelefono: jest.fn(async () => 'ExponentPushToken[telefono]'),
}));
jest.mock('@/features/recordatorios/datos/dispositivo', () => ({
  getDispositivo: jest.fn(),
  guardarDispositivo: jest.fn(async () => undefined),
}));
jest.mock('@/features/iglesias/datos/iglesiaElegida', () => ({
  getIglesiaElegida: jest.fn(async () => 'i2'),
  clearIglesiaElegida: jest.fn(),
}));
jest.mock('@/features/calendario/datos/getIglesiasEnEstructura', () => ({
  getIglesiasEnEstructura: jest.fn(async () => [
    { id: 'i1', nombre: 'Iglesia 1', distritoId: 'd1', asociacionId: 'a1', distrito: 'D1' },
    { id: 'i2', nombre: 'Iglesia 2', distritoId: 'd1', asociacionId: 'a1', distrito: 'D1' },
  ]),
}));

const mockedGetCargos = jest.mocked(getCargosDelUsuario);
const mockedGetPermiso = jest.mocked(getPermiso);
const mockedGetDispositivo = jest.mocked(getDispositivo);
const mockedGuardar = jest.mocked(guardarDispositivo);

const TOKEN = 'ExponentPushToken[telefono]';

const renderers: ReactTestRenderer[] = [];

function renderHook<T>(queryClient: QueryClient, useHook: () => T) {
  const latest: { current: T | null } = { current: null };

  function Probe() {
    latest.current = useHook();
    return null;
  }

  act(() => {
    renderers.push(
      create(
        <QueryClientProvider client={queryClient}>
          <Probe />
        </QueryClientProvider>,
      ),
    );
  });

  return () => latest.current!;
}

// No gc timer: a finished test leaves nothing running.
const newClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });

const MAX_TICKS = 50;
const nextTick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * The phone is brought up to date in the background, several async hops after
 * the sign-in answers. The bound keeps a sync that never happens failing
 * instead of hanging.
 */
async function settleUntil(isDone: () => boolean, maxTicks = MAX_TICKS) {
  for (let tick = 0; tick < maxTicks && !isDone(); tick++) {
    await act(() => nextTick());
  }
}

/** Signs in with a code and waits for the sign-in to answer. */
async function signIn(queryClient: QueryClient) {
  const result = renderHook(queryClient, useVerifySignInCode);
  await act(() => result().mutateAsync({ email: 'ana@example.com', code: '123456' }));
}

beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
  mockedGetPermiso.mockResolvedValue('concedido');
  // The phone of a hermano who follows their iglesia elegida.
  mockedGetDispositivo.mockResolvedValue({
    encendido: true,
    iglesiaIds: ['i2'],
    conUsuario: false,
    delUsuario: false,
  });
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

describe('useVerifySignInCode', () => {
  it('saves the phone on, with their iglesia, once an encargado signs in', async () => {
    mockedGetCargos.mockResolvedValue([{ nivel: 'iglesia', iglesiaId: 'i1' }]);

    await signIn(newClient());
    await settleUntil(() => mockedGuardar.mock.calls.length > 0);

    expect(mockedGuardar).toHaveBeenCalledWith(TOKEN, { encendido: true, iglesiaIds: ['i1'] });
  });

  it('saves the phone off, with no iglesias, once a pastor signs in', async () => {
    mockedGetCargos.mockResolvedValue([{ nivel: 'distrito', distritoId: 'd1' }]);

    await signIn(newClient());
    await settleUntil(() => mockedGuardar.mock.calls.length > 0);

    expect(mockedGuardar).toHaveBeenCalledWith(TOKEN, { encendido: false, iglesiaIds: [] });
  });

  it('neither asks for the permiso nor saves anything without it', async () => {
    mockedGetPermiso.mockResolvedValue('sin-preguntar');
    mockedGetCargos.mockResolvedValue([{ nivel: 'iglesia', iglesiaId: 'i1' }]);

    await signIn(newClient());
    await settleUntil(() => mockedGetPermiso.mock.calls.length > 0);
    // Room for a save that should not come.
    await settleUntil(() => false, 10);

    expect(mockedGetPermiso).toHaveBeenCalled();
    expect(pedirPermiso).not.toHaveBeenCalled();
    expect(mockedGuardar).not.toHaveBeenCalled();
  });

  it('does not wait for the phone to be brought up to date', async () => {
    // A sync that never ends, as without a connection.
    mockedGetPermiso.mockReturnValue(new Promise(() => {}));
    const queryClient = newClient();

    await signIn(queryClient);

    expect(mockedGetPermiso).toHaveBeenCalled();
    expect(queryClient.getQueryData(['sesion'])).toBe(true);
  });
});
