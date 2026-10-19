import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';

import { enviarConsulta } from './enviarConsulta';

// The client of Supabase, under the control of each test.
const mockInvoke = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: {
    functions: {
      invoke: (nombre: string, opciones: { body: unknown }) => mockInvoke(nombre, opciones.body),
    },
  },
}));

const pedido = { mensaje: '¿Qué hay el sábado?', tramo: [] };

function httpError(status: number, body: unknown) {
  return new FunctionsHttpError(new Response(JSON.stringify(body), { status }));
}

describe('enviarConsulta', () => {
  beforeEach(() => mockInvoke.mockReset());

  it('sends the pedido to the chat-consulta function and returns its respuesta', async () => {
    const respuesta = {
      tipo: 'respuesta',
      texto: 'El sábado no hay eventos.',
      eventos: [],
      aviso: 'Te quedan 5 consultas por hoy',
    };
    mockInvoke.mockResolvedValue({ data: { respuesta }, error: null });

    await expect(enviarConsulta(pedido)).resolves.toEqual({
      ok: true,
      respuesta: { ...respuesta, borrador: null },
    });
    expect(mockInvoke).toHaveBeenCalledWith('chat-consulta', pedido);
  });

  it('returns the borrador of the evento the asistente proposes', async () => {
    const respuesta = {
      tipo: 'respuesta',
      texto: 'Revisalo y confirmalo.',
      eventos: [],
      aviso: null,
      borrador: {
        titulo: 'Culto joven',
        fecha: '2026-10-24',
        hora: '19:00:00',
        fechaFin: null,
        lugar: null,
        descripcion: null,
        enfasis: 'nuevas_generaciones',
        duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
        duenioNombre: 'Iglesia Central',
        repeticion: 'ninguna',
        finDeSerie: null,
      },
    };
    mockInvoke.mockResolvedValue({ data: { respuesta }, error: null });

    await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: true, respuesta });
  });

  it('is an error of the server when the borrador is not one', async () => {
    const respuesta = {
      tipo: 'respuesta',
      texto: 'Listo.',
      eventos: [],
      aviso: null,
      borrador: { titulo: 'Culto joven' },
    };
    mockInvoke.mockResolvedValue({ data: { respuesta }, error: null });

    await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: false, falla: 'error_servidor' });
  });

  it.each(['limite_diario', 'presupuesto_agotado', 'proveedor_caido'])(
    'returns the typed falla %s the function answers',
    async (falla) => {
      mockInvoke.mockResolvedValue({ data: null, error: httpError(429, { falla }) });

      await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: false, falla });
    },
  );

  it('is sin conexion when the call does not reach the function', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: new FunctionsFetchError(new TypeError('Network request failed')),
    });

    await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: false, falla: 'sin_conexion' });
  });

  it('is an error of the server when the relay fails or the body is not a falla', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: new FunctionsRelayError({}) });
    mockInvoke.mockResolvedValueOnce({ data: null, error: httpError(500, 'not json falla') });

    await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: false, falla: 'error_servidor' });
    await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: false, falla: 'error_servidor' });
  });

  it('is an error of the server when the respuesta is not one', async () => {
    mockInvoke.mockResolvedValue({ data: { respuesta: { texto: 3 } }, error: null });

    await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: false, falla: 'error_servidor' });
  });

  it('never throws', async () => {
    mockInvoke.mockRejectedValue(new Error('boom'));

    await expect(enviarConsulta(pedido)).resolves.toEqual({ ok: false, falla: 'error_servidor' });
  });
});
