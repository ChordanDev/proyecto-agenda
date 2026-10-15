import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { EventoAGuardar } from '../dominio/formularioDeEvento';
import { useGuardarEvento } from './useEscribirEvento';

const mockRpc = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

const EVENTO: EventoAGuardar = {
  titulo: 'Culto joven',
  lugar: null,
  descripcion: null,
  enfasis: null,
  duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
  hora: '19:00',
  fechaFin: null,
  repeticion: 'ninguna',
  finDeSerie: null,
  fechas: ['2026-10-17'],
};

type Guardar = ReturnType<typeof useGuardarEvento>;

const renderers: ReactTestRenderer[] = [];

/** Renders the hook for a form and returns a getter for its latest result. */
function renderGuardarEvento(id: string | undefined) {
  const queryClient = new QueryClient({
    // No gc timer: a finished test leaves nothing running.
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  const latest: { current: Guardar | null } = { current: null };

  function Form() {
    latest.current = useGuardarEvento(id);
    return null;
  }

  act(() => {
    renderers.push(
      create(
        <QueryClientProvider client={queryClient}>
          <Form />
        </QueryClientProvider>,
      ),
    );
  });

  return () => latest.current!;
}

/** Taps Guardar once and waits for the answer, as before a second try. */
async function guardar(getGuardar: () => Guardar) {
  await act(async () => {
    await getGuardar()
      .mutateAsync(EVENTO)
      .catch(() => undefined);
    // Lets the cache tell the hook about the answer inside act.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function getGuardarEventoArgs() {
  return mockRpc.mock.calls
    .filter(([name]) => name === 'guardar_evento')
    .map(([, args]) => args as Record<string, unknown>);
}

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ data: 'e1', error: null });
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

describe('useGuardarEvento', () => {
  it('sends the same nuevo_evento_id on every try of a new evento', async () => {
    // The first try fails, so Guardar is tapped again.
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'Network request failed' } });
    const getGuardar = renderGuardarEvento(undefined);

    await guardar(getGuardar);
    await guardar(getGuardar);

    const calls = getGuardarEventoArgs();
    expect(calls).toHaveLength(2);
    expect(calls[0].nuevo_evento_id).toEqual(expect.any(String));
    expect(calls[1].nuevo_evento_id).toBe(calls[0].nuevo_evento_id);
    expect(calls[0].evento_id).toBeUndefined();
  });

  it('sends the evento_id and no nuevo_evento_id when editing', async () => {
    const getGuardar = renderGuardarEvento('e1');

    await guardar(getGuardar);

    expect(getGuardarEventoArgs()).toEqual([
      expect.objectContaining({ evento_id: 'e1', nuevo_evento_id: undefined }),
    ]);
  });
});
