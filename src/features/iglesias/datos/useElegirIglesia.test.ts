import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import * as trigger from '@/features/recordatorios/datos/actualizarRecordatorios';

import { getIglesiaElegida } from './iglesiaElegida';
import { useElegirIglesia } from './useElegirIglesia';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// The recordatorios are not mocked as a module: loading the hook must not load
// the native modules of the notifications. Each test replaces the trigger.
const mockedActualizar = jest.spyOn(trigger, 'actualizarRecordatorios');

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
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedActualizar.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

describe('useElegirIglesia', () => {
  it('loads none of the native modules of the notifications', async () => {
    const elegir = renderHook(newClient(), useElegirIglesia);

    await act(async () => {
      await elegir().mutateAsync('iglesia-2');
    });

    const loaded = Object.keys(require.cache);
    expect(loaded.filter((path) => /expo-notifications|expo-constants/.test(path))).toEqual([]);
    expect(mockedActualizar).toHaveBeenCalledTimes(1);
  });

  it('lets the recordatorios follow the new iglesia elegida', async () => {
    const queryClient = newClient();
    let elegidaAlActualizar: string | null = null;
    mockedActualizar.mockImplementation(async () => {
      elegidaAlActualizar = await getIglesiaElegida();
    });
    const elegir = renderHook(queryClient, useElegirIglesia);

    await act(async () => {
      await elegir().mutateAsync('iglesia-2');
    });

    expect(mockedActualizar).toHaveBeenCalledTimes(1);
    expect(mockedActualizar).toHaveBeenCalledWith(queryClient);
    // The recordatorios read the iglesia already stored.
    expect(elegidaAlActualizar).toBe('iglesia-2');
  });
});
