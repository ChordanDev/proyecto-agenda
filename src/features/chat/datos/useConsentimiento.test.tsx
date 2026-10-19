import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  CONSENTIMIENTO_QUERY_KEY,
  useAceptarConsentimiento,
  useConsentimiento,
} from './useConsentimiento';

// The client of Supabase, under the control of each test.
const mockUsuarioId = { current: 'usuario-a' as string | null };
const mockInsert = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mockUsuarioId.current ? { user: { id: mockUsuarioId.current } } : null },
          error: null,
        }),
    },
    from: () => ({
      insert: (row: unknown) => mockInsert(row),
      select: () => ({ eq: () => ({ maybeSingle: () => mockSelect() }) }),
    }),
  },
}));
jest.mock('@/features/sesion/datos/useSesion', () => ({ useSesion: () => true }));

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
 * Lets the cache tell the hook about an answer inside act, one tick at a time,
 * until `isDone` holds. The read chains several async hops (the session, then
 * the select), so a single tick is not enough on a loaded runner. The bound
 * keeps a hook that never answers failing instead of hanging.
 */
async function settleUntil(isDone: () => boolean, maxTicks = MAX_TICKS) {
  for (let tick = 0; tick < maxTicks && !isDone(); tick++) {
    await act(() => nextTick());
  }
}

/** Like settleUntil, for code already running inside act. */
async function tickUntil(isDone: () => boolean, maxTicks = MAX_TICKS) {
  for (let tick = 0; tick < maxTicks && !isDone(); tick++) {
    await nextTick();
  }
}

beforeEach(() => {
  mockUsuarioId.current = 'usuario-a';
  mockInsert.mockReset();
  mockSelect.mockReset().mockResolvedValue({ data: null, error: null });
  onlineManager.setOnline(true);
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
  onlineManager.setOnline(true);
});

describe('useAceptarConsentimiento', () => {
  it('opens the conversacion for the usuario who accepted', async () => {
    const queryClient = newClient();
    mockInsert.mockResolvedValue({ error: null });
    const aceptar = renderHook(queryClient, useAceptarConsentimiento);

    await act(async () => {
      await aceptar().mutateAsync();
    });

    expect(queryClient.getQueryData(CONSENTIMIENTO_QUERY_KEY)).toBe(true);
  });

  it('leaves nothing for the next usuario when the session ends while it saves', async () => {
    const queryClient = newClient();
    let answer: (value: { error: null }) => void = () => undefined;
    mockInsert.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const aceptar = renderHook(queryClient, useAceptarConsentimiento);

    await act(async () => {
      const saving = aceptar().mutateAsync();
      // The session ends once the insert has been sent.
      await tickUntil(() => mockInsert.mock.calls.length > 0);
      // Signing out removes the session and forgets the chat.
      mockUsuarioId.current = null;
      queryClient.removeQueries({ queryKey: ['chat'] });
      answer({ error: null });
      await saving;
    });

    expect(queryClient.getQueryData(CONSENTIMIENTO_QUERY_KEY)).toBeUndefined();
  });
});

describe('useConsentimiento', () => {
  it('reads that the usuario has not accepted', async () => {
    const consentimiento = renderHook(newClient(), useConsentimiento);

    await settleUntil(() => consentimiento().consentimiento !== 'leyendo');

    expect(consentimiento().consentimiento).toBe('no');
  });

  it('does not wait forever without a connection: it is an error to retry', async () => {
    onlineManager.setOnline(false);
    mockSelect.mockRejectedValue(new Error('Network request failed'));
    const consentimiento = renderHook(newClient(), useConsentimiento);

    await settleUntil(() => consentimiento().consentimiento !== 'leyendo');

    expect(consentimiento().consentimiento).toBe('error');
  });
});
