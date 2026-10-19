import {
  MAX_BUSQUEDAS,
  MAX_LARGO_DE_MENSAJE,
  MAX_LLAMADAS_POR_RONDA,
  MAX_MENSAJES_DEL_TRAMO,
  responderConsulta,
  type Busqueda,
  type EstadoDelChat,
  type EventoDeChat,
  type MensajeParaProveedor,
  type PuertosDeConsulta,
  type RespuestaDelProveedor,
} from './consulta';

const USUARIO = 'usuario-1';
const ZONA = 'America/Argentina/Buenos_Aires';
// Saturday 17 October 2026, 22:30 in Buenos Aires: already Sunday in UTC.
const AHORA = new Date('2026-10-18T01:30:00Z');

function evento(numero: number): EventoDeChat {
  return {
    id: `evento-${numero}`,
    titulo: `Culto joven ${numero}`,
    fecha: `2026-10-2${numero}`,
    fechaFin: null,
    hora: '19:00:00',
    lugar: 'Templo',
    descripcion: null,
    enfasis: 'nuevas_generaciones',
    alcance: 'iglesia',
    duenio: 'Iglesia Central',
  };
}

function texto(contenido: string, costoUsd = 0.001): RespuestaDelProveedor {
  return { tipo: 'texto', texto: contenido, costoUsd };
}

function busqueda(argumentos: unknown, costoUsd = 0.001, id = 'llamada-1'): RespuestaDelProveedor {
  return { tipo: 'busqueda', llamadas: [{ id, argumentos }], costoUsd };
}

const BUSQUEDA_VALIDA = { desde: '2026-10-24', hasta: '2026-10-24', texto: 'culto joven' };

/** One round in which the model asks for `cuantas` busquedas at once. */
function busquedas(cuantas: number, costoUsd = 0.001): RespuestaDelProveedor {
  return {
    tipo: 'busqueda',
    llamadas: Array.from({ length: cuantas }, (_, i) => ({
      id: `llamada-${i}`,
      argumentos: BUSQUEDA_VALIDA,
    })),
    costoUsd,
  };
}

type Fake = {
  puertos: PuertosDeConsulta;
  /** What the provider received on each call, and whether it could search. */
  llamadasAlProveedor: { mensajes: readonly MensajeParaProveedor[]; conBusqueda: boolean }[];
  busquedas: Busqueda[];
  registros: { usuarioId: string; dia: string; mes: string; costoUsd: number }[];
  /** What the consulta reported about its fallas. */
  errores: string[];
};

/**
 * Ports with a fake provider that answers with `respuestas` in order. No test
 * reaches OpenAI or the database.
 */
function fake({
  respuestas = [texto('Hola')],
  estado = {},
  eventos = [],
  resultados,
  proveedorFalla = false,
  busquedaFalla = false,
  registroFalla = false,
  consultasDelDia = 1,
}: {
  respuestas?: RespuestaDelProveedor[];
  estado?: Partial<EstadoDelChat>;
  eventos?: EventoDeChat[];
  /** The coincidencias of each busqueda in order; without it every busqueda finds `eventos`. */
  resultados?: EventoDeChat[][];
  proveedorFalla?: boolean;
  busquedaFalla?: boolean;
  registroFalla?: boolean;
  consultasDelDia?: number;
} = {}): Fake {
  const result: Fake = {
    llamadasAlProveedor: [],
    busquedas: [],
    registros: [],
    errores: [],
    puertos: {
      informarError: (causa) => {
        result.errores.push(causa);
      },
      ahora: () => AHORA,
      leerEstado: async () => ({
        consentimiento: true,
        consultas: null,
        gasto: null,
        zonaHoraria: ZONA,
        ...estado,
      }),
      buscarEventos: async (pedida) => {
        result.busquedas.push(pedida);
        if (busquedaFalla) {
          throw new Error('database down');
        }
        const coincidencias = resultados ? (resultados.shift() ?? []) : eventos;
        return { eventos: coincidencias.slice(0, 3), total: coincidencias.length };
      },
      registrarConsulta: async (registro) => {
        if (registroFalla) {
          throw new Error('database down');
        }
        result.registros.push(registro);
        return { consultasDelDia };
      },
      proveedor: {
        responder: async (mensajes, { conBusqueda }) => {
          result.llamadasAlProveedor.push({ mensajes: structuredClone(mensajes), conBusqueda });
          if (proveedorFalla) {
            throw new Error('OpenAI answered 429');
          }
          const respuesta = respuestas.shift();
          if (!respuesta) {
            throw new Error('The fake provider ran out of respuestas');
          }
          return respuesta;
        },
      },
    },
  };
  return result;
}

function pedido(mensaje: unknown, tramo: unknown = []) {
  return { mensaje, tramo };
}

function resultadoDeBusqueda(f: Fake, llamada: number) {
  const mensajes = f.llamadasAlProveedor[llamada].mensajes;
  const ultimo = mensajes[mensajes.length - 1];
  if (ultimo.rol !== 'busqueda') {
    throw new Error('The last message is not the result of a busqueda');
  }
  return JSON.parse(ultimo.contenido);
}

describe('responderConsulta', () => {
  describe('the typed fallas', () => {
    it('rejects a call without a sesion before anything else', async () => {
      const f = fake();

      const resultado = await responderConsulta(pedido('Hola'), null, f.puertos);

      expect(resultado).toEqual({ ok: false, falla: 'sin_sesion' });
      expect(f.llamadasAlProveedor).toHaveLength(0);
      expect(f.registros).toHaveLength(0);
    });

    it('rejects a pedido without a mensaje, or with a tramo of another shape', async () => {
      for (const malo of [
        null,
        {},
        pedido(42),
        pedido('   '),
        pedido('Hola', [{ autor: 'otro' }]),
      ]) {
        const f = fake();

        expect(await responderConsulta(malo, USUARIO, f.puertos)).toEqual({
          ok: false,
          falla: 'pedido_invalido',
        });
        expect(f.llamadasAlProveedor).toHaveLength(0);
      }
    });

    it('rejects a mensaje of more than 500 characters', async () => {
      const f = fake();

      const resultado = await responderConsulta(
        pedido('a'.repeat(MAX_LARGO_DE_MENSAJE + 1)),
        USUARIO,
        f.puertos,
      );

      expect(MAX_LARGO_DE_MENSAJE).toBe(500);
      expect(resultado).toEqual({ ok: false, falla: 'mensaje_largo' });
      expect(f.llamadasAlProveedor).toHaveLength(0);
      expect(f.registros).toHaveLength(0);
    });

    it('accepts a mensaje of exactly 500 characters', async () => {
      const f = fake();

      const resultado = await responderConsulta(
        pedido('a'.repeat(MAX_LARGO_DE_MENSAJE)),
        USUARIO,
        f.puertos,
      );

      expect(resultado.ok).toBe(true);
    });

    it('rejects a usuario who did not accept the consentimiento', async () => {
      const f = fake({ estado: { consentimiento: false } });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'sin_consentimiento',
      });
      expect(f.llamadasAlProveedor).toHaveLength(0);
    });

    it('rejects a usuario who reached the limite diario of the asociacion', async () => {
      const f = fake({ estado: { consultas: { dia: '2026-10-17', cantidad: 50 } } });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'limite_diario',
      });
      expect(f.llamadasAlProveedor).toHaveLength(0);
    });

    it('rejects every usuario once the presupuesto of the mes is spent', async () => {
      const f = fake({ estado: { gasto: { mes: '2026-10-01', usd: 20 } } });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'presupuesto_agotado',
      });
      expect(f.llamadasAlProveedor).toHaveLength(0);
    });

    it('fails as proveedor_caido when the provider fails, and counts nothing', async () => {
      const f = fake({ proveedorFalla: true });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'proveedor_caido',
      });
      expect(f.registros).toHaveLength(0);
    });

    it('fails as proveedor_caido when the provider answers with no text, and counts nothing', async () => {
      const f = fake({ respuestas: [texto('   ')] });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'proveedor_caido',
      });
      expect(f.registros).toHaveLength(0);
    });

    it('fails as error_servidor when the busqueda fails, and counts nothing', async () => {
      const f = fake({ respuestas: [busqueda(BUSQUEDA_VALIDA)], busquedaFalla: true });

      expect(await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'error_servidor',
      });
      expect(f.registros).toHaveLength(0);
    });

    it('fails as error_servidor when the consulta cannot be registered', async () => {
      const f = fake({ registroFalla: true });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'error_servidor',
      });
    });
  });

  describe('what is reported about a falla', () => {
    it('reports why the provider failed, never the mensaje', async () => {
      const f = fake({ proveedorFalla: true });

      await responderConsulta(pedido('Mensaje privado del usuario'), USUARIO, f.puertos);

      expect(f.errores).toHaveLength(1);
      expect(f.errores[0]).toContain('429');
      expect(f.errores[0]).not.toContain('Mensaje privado');
    });

    it('reports why the busqueda failed', async () => {
      const f = fake({ respuestas: [busqueda(BUSQUEDA_VALIDA)], busquedaFalla: true });

      await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(f.errores).toEqual([expect.stringContaining('database down')]);
    });

    it('reports an empty answer of the provider', async () => {
      const f = fake({ respuestas: [texto('  ')] });

      await responderConsulta(pedido('Hola'), USUARIO, f.puertos);

      expect(f.errores).toHaveLength(1);
    });

    it('reports nothing about a consulta that is answered or rejected by the limits', async () => {
      const respondida = fake();
      const rechazada = fake({ estado: { consentimiento: false } });

      await responderConsulta(pedido('Hola'), USUARIO, respondida.puertos);
      await responderConsulta(pedido('Hola'), USUARIO, rechazada.puertos);

      expect([...respondida.errores, ...rechazada.errores]).toEqual([]);
    });
  });

  describe('the ambiguity rule', () => {
    it('answers with the three eventos when three match', async () => {
      const eventos = [evento(1), evento(2), evento(3)];
      const f = fake({
        respuestas: [busqueda(BUSQUEDA_VALIDA), texto('Hay tres cultos jóvenes.')],
        eventos,
      });

      const resultado = await responderConsulta(
        pedido('¿Cuándo es el culto joven?'),
        USUARIO,
        f.puertos,
      );

      expect(resultado).toEqual({
        ok: true,
        respuesta: { tipo: 'respuesta', texto: 'Hay tres cultos jóvenes.', eventos, aviso: null },
      });
      expect(resultadoDeBusqueda(f, 1)).toMatchObject({ total: 3, eventos });
    });

    it('asks to narrow the pregunta when four or more match, and shows none of them', async () => {
      const f = fake({
        respuestas: [busqueda(BUSQUEDA_VALIDA), texto('¿De qué fecha o iglesia?')],
        eventos: [evento(1), evento(2), evento(3), evento(4)],
      });

      const resultado = await responderConsulta(
        pedido('¿Cuándo es el culto joven?'),
        USUARIO,
        f.puertos,
      );

      expect(resultado).toEqual({
        ok: true,
        respuesta: {
          tipo: 'repregunta',
          texto: '¿De qué fecha o iglesia?',
          eventos: [],
          aviso: null,
        },
      });
      // The model never sees the eventos it should not list.
      const enviado = resultadoDeBusqueda(f, 1);
      expect(enviado.total).toBe(4);
      expect(enviado.eventos).toEqual([]);
      expect(enviado.indicacion).toMatch(/precise/);
    });

    it('answers with no eventos when nothing matches', async () => {
      const f = fake({ respuestas: [busqueda(BUSQUEDA_VALIDA), texto('No encontré nada.')] });

      const resultado = await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(resultado).toEqual({
        ok: true,
        respuesta: { tipo: 'respuesta', texto: 'No encontré nada.', eventos: [], aviso: null },
      });
    });

    it('asks to narrow the pregunta when any busqueda of the consulta has four or more', async () => {
      const f = fake({
        respuestas: [busquedas(2), texto('¿De qué día?')],
        resultados: [[evento(1), evento(2), evento(3), evento(4), evento(5)], [evento(6)]],
      });

      const resultado = await responderConsulta(
        pedido('¿Qué hay el sábado y el domingo?'),
        USUARIO,
        f.puertos,
      );

      expect(resultado).toMatchObject({ ok: true, respuesta: { tipo: 'repregunta', eventos: [] } });
    });

    it('answers with the coincidencias of every busqueda, not only the last one', async () => {
      const f = fake({
        respuestas: [busquedas(2), texto('Hay dos.')],
        resultados: [[evento(1), evento(2)], []],
      });

      const resultado = await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { tipo: 'respuesta', eventos: [evento(1), evento(2)] },
      });
    });

    it('keeps the coincidencias of an earlier round', async () => {
      const f = fake({
        respuestas: [
          busqueda(BUSQUEDA_VALIDA, 0.001, 'primera'),
          busqueda({ ...BUSQUEDA_VALIDA, texto: 'otra cosa' }, 0.001, 'segunda'),
          texto('Hay dos.'),
        ],
        resultados: [[evento(1), evento(2)], []],
      });

      const resultado = await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { tipo: 'respuesta', eventos: [evento(1), evento(2)] },
      });
    });

    it('counts an evento found twice once, in order of fecha', async () => {
      const f = fake({
        respuestas: [busquedas(2), texto('Hay dos.')],
        resultados: [[evento(3), evento(1)], [evento(1)]],
      });

      const resultado = await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { tipo: 'respuesta', eventos: [evento(1), evento(3)] },
      });
    });

    it('asks to narrow the pregunta when the busquedas add up to four or more, and hides the last ones from the model', async () => {
      const f = fake({
        respuestas: [busquedas(2), texto('¿De qué día?')],
        resultados: [
          [evento(1), evento(2)],
          [evento(3), evento(4)],
        ],
      });

      const resultado = await responderConsulta(
        pedido('¿Qué hay el sábado y el domingo?'),
        USUARIO,
        f.puertos,
      );

      expect(resultado).toMatchObject({ ok: true, respuesta: { tipo: 'repregunta', eventos: [] } });
      const enviados = f.llamadasAlProveedor[1].mensajes.filter((m) => m.rol === 'busqueda');
      const segundo = JSON.parse(enviados[1].contenido);
      expect(segundo.eventos).toEqual([]);
      expect(segundo.indicacion).toMatch(/precise/);
    });
  });

  describe('the busqueda', () => {
    it('runs the busqueda the model asks for', async () => {
      const f = fake({ respuestas: [busqueda(BUSQUEDA_VALIDA), texto('Listo.')] });

      await responderConsulta(pedido('¿Qué hay el sábado?'), USUARIO, f.puertos);

      expect(f.busquedas).toEqual([BUSQUEDA_VALIDA]);
    });

    it('tells the model its arguments are wrong instead of searching', async () => {
      const f = fake({
        respuestas: [
          busqueda({ desde: '2026-10-30', hasta: '2026-10-01' }),
          busqueda({ desde: 'sábado', hasta: '2026-10-24' }),
          busqueda({ desde: '2026-01-01', hasta: '2027-06-01' }),
          texto('¿Qué fecha?'),
        ],
      });

      const resultado = await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(f.busquedas).toHaveLength(0);
      expect(resultadoDeBusqueda(f, 1)).toHaveProperty('error');
      expect(resultado.ok).toBe(true);
    });

    it(`stops offering the busqueda after ${MAX_BUSQUEDAS} rounds`, async () => {
      const f = fake({
        respuestas: [
          ...Array.from({ length: MAX_BUSQUEDAS }, () => busqueda(BUSQUEDA_VALIDA)),
          texto('Esto encontré.'),
        ],
      });

      const resultado = await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(resultado.ok).toBe(true);
      expect(f.llamadasAlProveedor.map((llamada) => llamada.conBusqueda)).toEqual([
        ...Array.from({ length: MAX_BUSQUEDAS }, () => true),
        false,
      ]);
    });

    it('fails as proveedor_caido when the model keeps searching without the busqueda', async () => {
      const f = fake({
        respuestas: Array.from({ length: MAX_BUSQUEDAS + 1 }, () => busqueda(BUSQUEDA_VALIDA)),
      });

      expect(await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'proveedor_caido',
      });
      expect(f.registros).toHaveLength(0);
    });

    it(`runs at most ${MAX_LLAMADAS_POR_RONDA} busquedas of one round, and tells the model about the rest`, async () => {
      const f = fake({
        respuestas: [
          {
            tipo: 'busqueda',
            llamadas: Array.from({ length: MAX_LLAMADAS_POR_RONDA + 2 }, (_, i) => ({
              id: `llamada-${i}`,
              argumentos: BUSQUEDA_VALIDA,
            })),
            costoUsd: 0.001,
          },
          texto('Listo.'),
        ],
      });

      await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(f.busquedas).toHaveLength(MAX_LLAMADAS_POR_RONDA);
      // Every llamada gets its result, as the provider expects.
      const resultados = f.llamadasAlProveedor[1].mensajes.filter((m) => m.rol === 'busqueda');
      expect(resultados).toHaveLength(MAX_LLAMADAS_POR_RONDA + 2);
      expect(JSON.parse(resultados[MAX_LLAMADAS_POR_RONDA].contenido)).toHaveProperty('error');
    });
  });

  describe('what the model receives', () => {
    it('gets the fecha of today and the zona horaria of the asociacion', async () => {
      const f = fake();

      await responderConsulta(pedido('Hola'), USUARIO, f.puertos);

      const [instrucciones] = f.llamadasAlProveedor[0].mensajes;
      expect(instrucciones.rol).toBe('sistema');
      expect(instrucciones).toHaveProperty(
        'texto',
        expect.stringContaining('sábado 17 de octubre de 2026'),
      );
      expect(instrucciones).toHaveProperty('texto', expect.stringContaining('2026-10-17'));
      expect(instrucciones).toHaveProperty('texto', expect.stringContaining(ZONA));
    });

    it('gets only the recent tramo of the conversation, then the mensaje', async () => {
      const tramo = Array.from({ length: MAX_MENSAJES_DEL_TRAMO + 4 }, (_, i) => ({
        autor: i % 2 === 0 ? 'usuario' : 'asistente',
        texto: `mensaje ${i}`,
      }));
      const f = fake();

      await responderConsulta(pedido('¿Y el domingo?', tramo), USUARIO, f.puertos);

      const [, ...conversacion] = f.llamadasAlProveedor[0].mensajes;
      expect(conversacion).toEqual([
        ...tramo.slice(-MAX_MENSAJES_DEL_TRAMO).map(({ autor, texto: contenido }) => ({
          rol: autor,
          texto: contenido,
        })),
        { rol: 'usuario', texto: '¿Y el domingo?' },
      ]);
    });
  });

  describe('the registro of the consulta', () => {
    it('counts a successful consulta once, with what all its calls cost, in the dia and mes of the asociacion', async () => {
      const f = fake({
        respuestas: [
          busqueda(BUSQUEDA_VALIDA, 0.002),
          busqueda(BUSQUEDA_VALIDA, 0.003),
          texto('Listo.', 0.004),
        ],
      });

      await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(f.registros).toHaveLength(1);
      expect(f.registros[0]).toMatchObject({
        usuarioId: USUARIO,
        dia: '2026-10-17',
        mes: '2026-10-01',
      });
      expect(f.registros[0].costoUsd).toBeCloseTo(0.009);
    });

    it('counts a mensaje off the calendario, since it called the model', async () => {
      const f = fake({ respuestas: [texto('Solo puedo ayudarte con el calendario.')] });

      const resultado = await responderConsulta(
        pedido('¿Quién ganó el partido?'),
        USUARIO,
        f.puertos,
      );

      expect(resultado).toEqual({
        ok: true,
        respuesta: {
          tipo: 'respuesta',
          texto: 'Solo puedo ayudarte con el calendario.',
          eventos: [],
          aviso: null,
        },
      });
      expect(f.registros).toHaveLength(1);
    });

    it('warns about the consultas left today', async () => {
      const f = fake({ consultasDelDia: 47 });

      const resultado = await responderConsulta(pedido('Hola'), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { aviso: 'Te quedan 3 consultas por hoy' },
      });
    });
  });
});
