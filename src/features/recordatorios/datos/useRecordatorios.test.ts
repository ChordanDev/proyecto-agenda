import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  registroQueryKey,
  sincronizarRecordatorios,
  type EstadoDeRecordatorios,
} from './sincronizarRecordatorios';
import { useRecordatorios } from './useRecordatorios';

jest.mock('./telefono', () => ({
  getPermiso: jest.fn(async () => 'concedido'),
  pedirPermiso: jest.fn(),
}));
jest.mock('./sincronizarRecordatorios', () => ({
  registroQueryKey: ['recordatorios', 'registro'],
  sincronizarRecordatorios: jest.fn(),
}));
// Each test sets whether there is a session.
jest.mock('@/features/sesion/datos/sesionQuery', () => ({
  sesionQueryOptions: { queryKey: ['sesion'], queryFn: jest.fn(), staleTime: Infinity },
}));

const mockedSincronizar = jest.mocked(sincronizarRecordatorios);

function estado(iglesiaIds: string[]): EstadoDeRecordatorios {
  return {
    modo: 'eligiendo',
    registro: { encendido: iglesiaIds.length > 0, iglesiaIds },
    iglesias: [],
    opciones: [],
    conBuscador: false,
  };
}

/** What the pastor sees before saving, and what saving their choice returns. */
const DEL_PASTOR = estado([]);
const ELEGIDO_POR_EL_PASTOR = estado(['i2']);
/** What the phone has once the session is gone. */
const SIN_SESION: EstadoDeRecordatorios = {
  ...estado(['i1']),
  modo: 'iglesia-elegida',
};

const renderers: ReactTestRenderer[] = [];

function renderHook<T>(queryClient: QueryClient, useHook: () => T) {
  const latest: { current: T | null } = { current: null };

  function Probe() {
    latest.current = useHook();
    return null;
  }

  act(() => {
    renderers.push(
      create(createElement(QueryClientProvider, { client: queryClient }, createElement(Probe))),
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

/** Lets the cache tell the hook about each answer, until `isDone` holds. */
async function settleUntil(isDone: () => boolean, maxTicks = MAX_TICKS) {
  for (let tick = 0; tick < maxTicks && !isDone(); tick++) {
    await act(() => nextTick());
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

/** The hook of a pastor signed in, once their registro was read. */
async function renderDelPastor(queryClient: QueryClient) {
  queryClient.setQueryData(['sesion'], true);
  mockedSincronizar.mockResolvedValueOnce(DEL_PASTOR);
  const recordatorios = renderHook(queryClient, useRecordatorios);
  await settleUntil(() => recordatorios().registro.isSuccess);
  expect(recordatorios().registro.data).toEqual(DEL_PASTOR);
  return recordatorios;
}

describe('useRecordatorios', () => {
  it('shows what was saved, under the session it was saved with', async () => {
    const queryClient = newClient();
    const recordatorios = await renderDelPastor(queryClient);
    mockedSincronizar.mockResolvedValueOnce(ELEGIDO_POR_EL_PASTOR);

    await act(async () => {
      await recordatorios().guardar.mutateAsync(() => ELEGIDO_POR_EL_PASTOR.registro);
    });
    await settleUntil(() => recordatorios().registro.data?.registro.encendido === true);

    expect(recordatorios().registro.data).toEqual(ELEGIDO_POR_EL_PASTOR);
    expect(queryClient.getQueryData([...registroQueryKey, true])).toEqual(ELEGIDO_POR_EL_PASTOR);
    // Saving already read the registro: nothing to read again.
    expect(mockedSincronizar).toHaveBeenCalledTimes(2);
  });

  it('forgets a failed save once a later one succeeds', async () => {
    const queryClient = newClient();
    const recordatorios = await renderDelPastor(queryClient);
    mockedSincronizar.mockRejectedValueOnce(new Error('offline'));
    mockedSincronizar.mockResolvedValueOnce(ELEGIDO_POR_EL_PASTOR);

    await act(async () => {
      await expect(
        recordatorios().guardar.mutateAsync(() => ELEGIDO_POR_EL_PASTOR.registro),
      ).rejects.toThrow('offline');
    });
    await settleUntil(() => recordatorios().guardar.isError);
    expect(recordatorios().guardar.isError).toBe(true);

    await act(async () => {
      await recordatorios().guardar.mutateAsync(() => ELEGIDO_POR_EL_PASTOR.registro);
    });
    await settleUntil(() => recordatorios().guardar.isSuccess);

    expect(recordatorios().guardar.isError).toBe(false);
  });

  it('reads the registro again for the new session when it changed while saving', async () => {
    const queryClient = newClient();
    const recordatorios = await renderDelPastor(queryClient);
    const guardado = deferred<EstadoDeRecordatorios>();
    mockedSincronizar.mockReturnValueOnce(guardado.promise);
    mockedSincronizar.mockResolvedValue(SIN_SESION);

    act(() => {
      recordatorios().guardar.mutate(() => ELEGIDO_POR_EL_PASTOR.registro);
    });
    await settleUntil(() => mockedSincronizar.mock.calls.length === 2);
    // The pastor signs out while it saves.
    act(() => {
      queryClient.setQueryData(['sesion'], false);
    });
    await settleUntil(() => recordatorios().registro.data?.modo === 'iglesia-elegida');
    const leidas = mockedSincronizar.mock.calls.length;

    await act(async () => {
      guardado.resolve(ELEGIDO_POR_EL_PASTOR);
    });
    await settleUntil(
      () =>
        recordatorios().guardar.isSuccess &&
        !queryClient.isFetching({ queryKey: registroQueryKey }) &&
        mockedSincronizar.mock.calls.length > leidas,
    );

    // The registro of the pastor does not show without their session.
    expect(queryClient.getQueryData([...registroQueryKey, false])).toEqual(SIN_SESION);
    expect(recordatorios().registro.data).toEqual(SIN_SESION);
    // It was read again with the session there is now.
    expect(mockedSincronizar).toHaveBeenCalledTimes(leidas + 1);
  });
});
