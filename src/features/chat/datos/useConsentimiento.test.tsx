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

/** Lets the cache tell the hook about an answer inside act. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

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
      await new Promise((resolve) => setTimeout(resolve, 0));
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

    await settle();

    expect(consentimiento().consentimiento).toBe('no');
  });

  it('does not wait forever without a connection: it is an error to retry', async () => {
    onlineManager.setOnline(false);
    mockSelect.mockRejectedValue(new Error('Network request failed'));
    const consentimiento = renderHook(newClient(), useConsentimiento);

    await settle();

    expect(consentimiento().consentimiento).toBe('error');
  });
});
