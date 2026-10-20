import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { actualizarRecordatorios } from '@/features/recordatorios/datos/sincronizarRecordatorios';

import { getIglesiaElegida } from './iglesiaElegida';
import { useElegirIglesia } from './useElegirIglesia';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/recordatorios/datos/sincronizarRecordatorios', () => ({
  actualizarRecordatorios: jest.fn(),
}));

const mockedActualizar = jest.mocked(actualizarRecordatorios);

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
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

describe('useElegirIglesia', () => {
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
