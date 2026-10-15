import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, type QueryKey } from '@tanstack/react-query';
import { persistQueryClientSubscribe } from '@tanstack/react-query-persist-client';

import { persistOptions } from '@/shared/queryClient';

import { forgetSesion } from './useLeaveSesion';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () =>
  jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock'),
);
jest.mock('./signOut', () => ({ signOut: jest.fn() }));
jest.mock('./deleteOwnUsuario', () => ({ deleteOwnUsuario: jest.fn() }));

// Without a garbage collection timer, the clients do not keep Jest running.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

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
  await AsyncStorage.clear();
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
