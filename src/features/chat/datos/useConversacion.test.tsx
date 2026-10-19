import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useConversacion, type ConversacionEnCurso } from './useConversacion';

// The server function, under the control of each test.
const mockEnviarConsulta = jest.fn();

jest.mock('./enviarConsulta', () => ({
  enviarConsulta: (pedido: unknown) => mockEnviarConsulta(pedido),
}));
jest.mock('@/shared/supabase', () => ({ supabase: {} }));
jest.mock('./zonaHoraria', () => ({ getZonaHoraria: () => Promise.resolve('UTC') }));
jest.mock('@/features/sesion/datos/useSesion', () => ({ useSesion: () => true }));

let mockNextId = 0;
jest.mock('@/shared/newId', () => ({ newId: () => `id-${mockNextId++}` }));

const renderers: ReactTestRenderer[] = [];

function renderConversacion() {
  const latest: { current: ConversacionEnCurso | null } = { current: null };

  function Probe() {
    latest.current = useConversacion();
    return null;
  }

  const queryClient = new QueryClient({
    // No gc timer: a finished test leaves nothing running.
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
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

const respuesta = { tipo: 'respuesta', texto: 'Listo', eventos: [], aviso: null };

/** Lets a pending consulta finish inside act. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  mockNextId = 0;
  mockEnviarConsulta.mockReset();
  onlineManager.setOnline(true);
});

afterEach(() => {
  act(() => renderers.splice(0).forEach((renderer) => renderer.unmount()));
});

describe('useConversacion', () => {
  it('sends a pregunta once when it is sent twice before the screen updates', async () => {
    let answer: (value: unknown) => void = () => undefined;
    mockEnviarConsulta.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const chat = renderConversacion();

    // The send button and the Enter key, both from the same render.
    const { enviar } = chat();
    act(() => {
      enviar('¿Qué hay el sábado?');
      enviar('¿Qué hay el sábado?');
    });
    answer({ ok: true, respuesta });
    await settle();

    expect(mockEnviarConsulta).toHaveBeenCalledTimes(1);
    expect(chat().conversacion.mensajes.map(({ tipo }) => tipo)).toEqual(['pregunta', 'respuesta']);
  });

  it('retries a falla once when Reintentar is tapped twice before the screen updates', async () => {
    mockEnviarConsulta.mockResolvedValueOnce({ ok: false, falla: 'proveedor_caido' });
    const chat = renderConversacion();
    act(() => chat().enviar('¿Qué hay el sábado?'));
    await settle();

    mockEnviarConsulta.mockReturnValue(new Promise(() => undefined));
    const { reintentar } = chat();
    act(() => {
      reintentar!();
      reintentar!();
    });

    expect(mockEnviarConsulta).toHaveBeenCalledTimes(2);
  });

  it('sends the pregunta with the tramo answered before it', async () => {
    mockEnviarConsulta.mockResolvedValue({ ok: true, respuesta });
    const chat = renderConversacion();

    act(() => chat().enviar('Primera'));
    await settle();
    act(() => chat().enviar('Segunda'));
    await settle();

    expect(mockEnviarConsulta).toHaveBeenLastCalledWith({
      mensaje: 'Segunda',
      tramo: [
        { autor: 'usuario', texto: 'Primera' },
        { autor: 'asistente', texto: 'Listo' },
      ],
    });
  });
});
