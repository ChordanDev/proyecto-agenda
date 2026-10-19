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

// The save of a reporte, under the control of each test.
const mockSaveReporte = jest.fn();

jest.mock('./saveReporte', () => ({
  saveReporte: (reporte: unknown) => mockSaveReporte(reporte),
}));

// The save of an evento, under the control of each test.
const mockGuardarEvento = jest.fn();

jest.mock('@/features/eventos/datos/escribirEvento', () => ({
  ...jest.requireActual('@/features/eventos/datos/escribirEvento'),
  guardarEvento: (evento: unknown, destino: unknown) => mockGuardarEvento(evento, destino),
}));
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

const respuesta = { tipo: 'respuesta', texto: 'Listo', eventos: [], aviso: null, borrador: null };

/** Lets a pending consulta finish inside act. */
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  mockNextId = 0;
  mockEnviarConsulta.mockReset();
  mockGuardarEvento.mockReset();
  mockSaveReporte.mockReset();
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

describe('useConversacion with the presupuesto agotado', () => {
  afterEach(() => jest.useRealTimers());

  it('opens the chat again once the day it works again arrives', async () => {
    // Only the clock and the intervals are faked: the consulta still settles.
    jest.useFakeTimers({
      now: new Date('2026-10-31T12:00:00Z'),
      doNotFake: ['setTimeout', 'clearTimeout', 'setImmediate', 'nextTick', 'queueMicrotask'],
    });
    mockEnviarConsulta.mockResolvedValue({ ok: false, falla: 'presupuesto_agotado' });
    const chat = renderConversacion();

    act(() => chat().enviar('¿Qué hay el sábado?'));
    await settle();
    expect(chat().vuelta).toBe('1 de noviembre');

    act(() => {
      jest.setSystemTime(new Date('2026-11-01T12:00:00Z'));
      jest.advanceTimersByTime(60_000);
    });

    expect(chat().vuelta).toBeNull();
    expect(chat().conversacion.bloqueo).toBeNull();
  });
});

const borrador = {
  titulo: 'Culto joven',
  fecha: '2099-10-24',
  hora: '19:00:00',
  fechaFin: null,
  lugar: 'Templo',
  descripcion: null,
  enfasis: 'nuevas_generaciones',
  duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
  duenioNombre: 'Iglesia Central',
  repeticion: 'ninguna',
  finDeSerie: null,
};

/** A chat whose last mensaje is the propuesta of `borrador`, with its id. */
async function renderConPropuesta() {
  mockEnviarConsulta.mockResolvedValue({
    ok: true,
    respuesta: { ...respuesta, texto: 'Te preparé el evento.', borrador },
  });
  const chat = renderConversacion();
  act(() => chat().enviar('Cargame un culto joven el sábado 24 a las 19 h'));
  await settle();
  const propuesta = chat().conversacion.mensajes.at(-1)!;
  expect(propuesta.tipo).toBe('propuesta');

  return { chat, id: propuesta.id };
}

function getEstado(chat: () => ConversacionEnCurso, id: string) {
  const mensaje = chat().conversacion.mensajes.find((candidato) => candidato.id === id);
  return mensaje?.tipo === 'propuesta' ? { estado: mensaje.estado, error: mensaje.error } : null;
}

describe('useConversacion: Confirmar', () => {
  it('creates a single evento, with the id of the propuesta, when tapped twice', async () => {
    let saved: (value: unknown) => void = () => undefined;
    const { chat, id } = await renderConPropuesta();
    mockGuardarEvento.mockReturnValue(new Promise((resolve) => (saved = resolve)));

    const { confirmar } = chat();
    act(() => {
      confirmar(id);
      confirmar(id);
    });
    saved(id);
    await settle();

    expect(mockGuardarEvento).toHaveBeenCalledTimes(1);
    expect(mockGuardarEvento).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Culto joven', lugar: 'Templo', fechas: ['2099-10-24'] }),
      { crear: id },
    );
    expect(getEstado(chat, id)).toEqual({ estado: 'guardado', error: null });
  });

  it('does not count as a consulta', async () => {
    const { chat, id } = await renderConPropuesta();
    mockGuardarEvento.mockResolvedValue(id);

    act(() => chat().confirmar(id));
    await settle();

    expect(mockEnviarConsulta).toHaveBeenCalledTimes(1);
  });

  it('without conexion shows the error of the form and keeps the buttons', async () => {
    const { chat, id } = await renderConPropuesta();
    onlineManager.setOnline(false);

    act(() => chat().confirmar(id));
    await settle();

    expect(mockGuardarEvento).not.toHaveBeenCalled();
    expect(getEstado(chat, id)).toEqual({
      estado: 'pendiente',
      error: 'Hace falta conexión a internet. Revisá la conexión y probá de nuevo.',
    });
  });

  it('shows the error of the form when the save is rejected', async () => {
    const { ErrorDeEscritura } = jest.requireActual('@/features/eventos/datos/escribirEvento');
    const { chat, id } = await renderConPropuesta();
    mockGuardarEvento.mockRejectedValue(new ErrorDeEscritura('sin-permiso', 'denied'));

    act(() => chat().confirmar(id));
    await settle();

    expect(getEstado(chat, id)).toEqual({
      estado: 'pendiente',
      error: 'Tus cargos no te permiten cambiar este evento.',
    });
  });
});

describe('useConversacion: Editar', () => {
  it('opens the form with the borrador and leaves the card saved once it is saved there', async () => {
    const { getFormularioPrecargado } = jest.requireActual(
      '@/features/eventos/datos/formularioPrecargado',
    );
    const { chat, id } = await renderConPropuesta();

    let clave = '';
    act(() => {
      clave = chat().editar(id)!;
    });
    const precargado = getFormularioPrecargado(clave);

    expect(precargado).toMatchObject({
      eventoId: id,
      formulario: { titulo: 'Culto joven', lugar: { tipo: 'escrito', nombre: 'Templo' } },
    });
    expect(getEstado(chat, id)).toEqual({ estado: 'pendiente', error: null });

    act(() => precargado.onGuardado(id));

    expect(getEstado(chat, id)).toEqual({ estado: 'guardado', error: null });
  });
});

describe('useConversacion: forms precargados', () => {
  it('forgets the form of a propuesta once Confirmar saves it', async () => {
    const { getFormularioPrecargado } = jest.requireActual(
      '@/features/eventos/datos/formularioPrecargado',
    );
    const { chat, id } = await renderConPropuesta();
    mockGuardarEvento.mockResolvedValue(id);
    act(() => {
      chat().editar(id);
    });

    act(() => chat().confirmar(id));
    await settle();

    expect(getFormularioPrecargado(id)).toBeUndefined();
  });

  it('forgets the forms of the conversacion when a new one starts', async () => {
    const { getFormularioPrecargado } = jest.requireActual(
      '@/features/eventos/datos/formularioPrecargado',
    );
    const { chat, id } = await renderConPropuesta();
    act(() => {
      chat().editar(id);
    });

    act(() => chat().nueva());

    expect(getFormularioPrecargado(id)).toBeUndefined();
  });
});

describe('useConversacion: Reportar respuesta', () => {
  /** A conversacion with one respuesta; gives its id. */
  async function renderRespondida() {
    mockEnviarConsulta.mockResolvedValue({ ok: true, respuesta });
    const chat = renderConversacion();
    act(() => chat().enviar('¿Qué hay el sábado?'));
    await settle();
    const id = chat().conversacion.mensajes[1]!.id;
    return { chat, id };
  }

  function getReporteDe(chat: () => ConversacionEnCurso, id: string) {
    const mensaje = chat().conversacion.mensajes.find((m) => m.id === id);
    return mensaje?.tipo === 'respuesta' ? mensaje.reporte : null;
  }

  it('saves a single reporte, with its motivo, when sent twice, and shows it was sent', async () => {
    let saved: (value: unknown) => void = () => undefined;
    const { chat, id } = await renderRespondida();
    mockSaveReporte.mockReturnValue(new Promise((resolve) => (saved = resolve)));

    const { reportar } = chat();
    act(() => {
      reportar(id, 'incorrecta');
      reportar(id, 'incorrecta');
    });
    saved(undefined);
    await settle();

    expect(mockSaveReporte).toHaveBeenCalledTimes(1);
    expect(mockSaveReporte).toHaveBeenCalledWith({ id: expect.any(String), motivo: 'incorrecta' });
    expect(getReporteDe(chat, id)).toMatchObject({ estado: 'enviado', error: null });
  });

  it('does not count as a consulta', async () => {
    const { chat, id } = await renderRespondida();
    mockSaveReporte.mockResolvedValue(undefined);

    act(() => chat().reportar(id, 'ofensiva'));
    await settle();

    expect(mockEnviarConsulta).toHaveBeenCalledTimes(1);
  });

  it('without conexion says so and lets it be reported again', async () => {
    const { chat, id } = await renderRespondida();
    onlineManager.setOnline(false);

    act(() => chat().reportar(id, 'otro'));
    await settle();

    expect(mockSaveReporte).not.toHaveBeenCalled();
    expect(getReporteDe(chat, id)).toMatchObject({
      estado: 'sin-reportar',
      error: 'No se pudo enviar el reporte. Revisá la conexión y probá de nuevo.',
    });
  });

  it('when the save fails, sends it again with the same id', async () => {
    const { chat, id } = await renderRespondida();
    mockSaveReporte.mockRejectedValueOnce(new Error('lost')).mockResolvedValueOnce(undefined);

    act(() => chat().reportar(id, 'otro'));
    await settle();
    expect(getReporteDe(chat, id)).toMatchObject({ estado: 'sin-reportar' });

    act(() => chat().reportar(id, 'otro'));
    await settle();

    const [primero, segundo] = mockSaveReporte.mock.calls.map(([reporte]) => reporte);
    expect(segundo.id).toBe(primero.id);
    expect(getReporteDe(chat, id)).toMatchObject({ estado: 'enviado', error: null });
  });
});
