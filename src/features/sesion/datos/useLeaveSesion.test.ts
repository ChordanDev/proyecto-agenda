import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider, type QueryKey } from '@tanstack/react-query';
import { persistQueryClientSubscribe } from '@tanstack/react-query-persist-client';
import { createElement } from 'react';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// these tests to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { actualizarRecordatorios } from '@/features/recordatorios/datos/actualizarRecordatorios';
import { persistOptions } from '@/shared/queryClient';

import { deleteOwnUsuario } from './deleteOwnUsuario';
import { signOut } from './signOut';
import { forgetSesion, useDeleteOwnUsuario, useSignOut } from './useLeaveSesion';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock('./signOut', () => ({ signOut: jest.fn() }));
jest.mock('./deleteOwnUsuario', () => ({ deleteOwnUsuario: jest.fn() }));
jest.mock('@/features/recordatorios/datos/actualizarRecordatorios', () => ({
  actualizarRecordatorios: jest.fn(),
}));

const mockedSignOut = jest.mocked(signOut);
const mockedDeleteOwnUsuario = jest.mocked(deleteOwnUsuario);
const mockedActualizar = jest.mocked(actualizarRecordatorios);

// Without a garbage collection timer, the clients do not keep Jest running.
const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });

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

/** What the calendario of the hermano and that of a usuario leave in the cache. */
const IGLESIA = ['calendario', 'iglesia-1'];
const IGLESIA_MES = ['calendario', 'iglesia-1', 'filtro', 2026, 10];
const USUARIO = ['calendario', 'usuario', 'iglesia-1,iglesia-2'];
const USUARIO_MES = ['calendario', 'usuario', 'iglesia-1,iglesia-2', 'filtro', 2026, 10];

function seedCalendarios(queryClient: QueryClient) {
  for (const key of [IGLESIA, IGLESIA_MES, USUARIO, USUARIO_MES]) {
    queryClient.setQueryData(key, { fechas: [] });
  }
}

/** The query keys saved on the phone. */
async function persistedKeys(): Promise<QueryKey[]> {
  const saved = await AsyncStorage.getItem('query-cache');
  const { clientState } = JSON.parse(saved ?? '{"clientState":{"queries":[]}}');

  return clientState.queries.map((query: { queryKey: QueryKey }) => query.queryKey);
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

describe('forgetSesion', () => {
  it('forgets the calendario of the usuario and keeps that of the iglesia elegida', () => {
    const queryClient = newClient();
    seedCalendarios(queryClient);

    forgetSesion(queryClient);

    expect(queryClient.getQueryData(USUARIO)).toBeUndefined();
    expect(queryClient.getQueryData(USUARIO_MES)).toBeUndefined();
    expect(queryClient.getQueryData(IGLESIA)).toEqual({ fechas: [] });
    expect(queryClient.getQueryData(IGLESIA_MES)).toEqual({ fechas: [] });
  });

  it('forgets the consentimiento of the chat, which belongs to the usuario', () => {
    const queryClient = newClient();
    queryClient.setQueryData(['chat', 'consentimiento'], true);

    forgetSesion(queryClient);

    expect(queryClient.getQueryData(['chat', 'consentimiento'])).toBeUndefined();
  });

  it('forgets the recordatorios read with the session, which show the iglesias of the usuario', () => {
    const queryClient = newClient();
    const registro = {
      modo: 'eligiendo',
      registro: { encendido: true, iglesiaIds: ['iglesia-1'] },
    };
    queryClient.setQueryData(['recordatorios', 'registro', true], registro);
    queryClient.setQueryData(['recordatorios', 'permiso'], 'concedido');

    forgetSesion(queryClient);

    expect(queryClient.getQueryData(['recordatorios', 'registro', true])).toBeUndefined();
    // The permiso belongs to the phone.
    expect(queryClient.getQueryData(['recordatorios', 'permiso'])).toBe('concedido');
  });

  it('drops the calendario of the usuario from the copy saved on the phone', async () => {
    jest.useFakeTimers();
    const queryClient = newClient();
    const unsubscribe = persistQueryClientSubscribe({ queryClient, ...persistOptions });

    try {
      seedCalendarios(queryClient);
      await jest.advanceTimersByTimeAsync(2000);
      expect(await persistedKeys()).toEqual(
        expect.arrayContaining([IGLESIA, IGLESIA_MES, USUARIO, USUARIO_MES]),
      );

      forgetSesion(queryClient);
      await jest.advanceTimersByTimeAsync(2000);

      const keys = await persistedKeys();
      expect(keys).toEqual(expect.arrayContaining([IGLESIA, IGLESIA_MES]));
      expect(keys).not.toContainEqual(USUARIO);
      expect(keys).not.toContainEqual(USUARIO_MES);
    } finally {
      unsubscribe();
      jest.useRealTimers();
    }
  });
});

describe.each([
  ['useSignOut', useSignOut, mockedSignOut],
  ['useDeleteOwnUsuario', useDeleteOwnUsuario, mockedDeleteOwnUsuario],
] as const)('%s', (_, useLeave, mockedLeave) => {
  it('lets the recordatorios follow the phone once the session is gone', async () => {
    const queryClient = newClient();
    queryClient.setQueryData(['sesion'], true);
    mockedLeave.mockResolvedValue(undefined);
    let sesionAlActualizar: unknown;
    mockedActualizar.mockImplementation(async (client) => {
      sesionAlActualizar = client.getQueryData(['sesion']);
    });
    const leave = renderHook(queryClient, useLeave);

    await act(async () => {
      await leave().mutateAsync();
    });

    expect(mockedActualizar).toHaveBeenCalledTimes(1);
    expect(mockedActualizar).toHaveBeenCalledWith(queryClient);
    // The recordatorios are read without the session.
    expect(sesionAlActualizar).toBe(false);
  });

  it('leaves the recordatorios as they are when the session could not be closed', async () => {
    const queryClient = newClient();
    mockedLeave.mockRejectedValue(new Error('offline'));
    const leave = renderHook(queryClient, useLeave);

    await act(async () => {
      await expect(leave().mutateAsync()).rejects.toThrow('offline');
    });

    expect(mockedActualizar).not.toHaveBeenCalled();
  });
});
