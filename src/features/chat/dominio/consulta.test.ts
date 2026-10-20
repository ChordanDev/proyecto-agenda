import {
  MAX_BUSQUEDAS,
  MAX_LARGO_DE_MENSAJE,
  MAX_LLAMADAS_POR_RONDA,
  MAX_MENSAJES_DEL_TRAMO,
  getHerramientas,
  responderConsulta,
  type Busqueda,
  type EstadoDelChat,
  type EventoDeChat,
  type MensajeParaProveedor,
  type PuertosDeConsulta,
  type RespuestaDelProveedor,
  type ResultadoDeReserva,
} from './consulta';
import type { CargosDelUsuario } from './borrador';

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

const ESTRUCTURA: CargosDelUsuario['estructura'] = {
  asociaciones: [{ id: 'a1', nombre: 'Asociación Central' }],
  distritos: [{ id: 'd1', nombre: 'Centro', asociacionId: 'a1' }],
  iglesias: [
    { id: 'i1', nombre: 'Central', distritoId: 'd1' },
    { id: 'i2', nombre: 'Norte', distritoId: 'd1' },
  ],
};

const ENCARGADO: CargosDelUsuario = {
  cargos: [{ nivel: 'iglesia', iglesiaId: 'i1' }],
  estructura: ESTRUCTURA,
};
const PASTOR: CargosDelUsuario = {
  cargos: [{ nivel: 'distrito', distritoId: 'd1' }],
  estructura: ESTRUCTURA,
};

function texto(contenido: string, costoUsd = 0.001): RespuestaDelProveedor {
  return { tipo: 'texto', texto: contenido, costoUsd };
}

function busqueda(argumentos: unknown, costoUsd = 0.001, id = 'llamada-1'): RespuestaDelProveedor {
  return { tipo: 'busqueda', llamadas: [{ id, argumentos }], costoUsd };
}

/** A round in which the model proposes an evento with "proponer_evento". */
function propuesta(argumentos: Record<string, unknown>, costoUsd = 0.001): RespuestaDelProveedor {
  return {
    tipo: 'busqueda',
    llamadas: [
      {
        id: 'propuesta-1',
        herramienta: 'proponer_evento',
        argumentos: { ...PROPUESTA_VALIDA, ...argumentos },
      },
    ],
    costoUsd,
  };
}

/** "Cargame un culto joven el sábado 24 a las 19 h", as the model writes it. */
const PROPUESTA_VALIDA = {
  titulo: 'Culto joven',
  fecha: '2026-10-24',
  hora: '19:00',
  fecha_fin: null,
  lugar: null,
  descripcion: null,
  enfasis: 'nuevas_generaciones',
  duenio: null,
  repeticion: 'ninguna',
  hasta: null,
};

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
  llamadasAlProveedor: {
    mensajes: readonly MensajeParaProveedor[];
    conBusqueda: boolean;
    conPropuesta: boolean;
  }[];
  busquedas: Busqueda[];
  /** The consultas confirmed with their costo. */
  registros: { usuarioId: string; dia: string; mes: string; costoUsd: number }[];
  /** The consultas freed because their respuesta failed. */
  liberaciones: { usuarioId: string; dia: string }[];
  /** The order in which the consulta reached the database and the provider. */
  orden: string[];
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
  reservar = async () => 'reservada',
  cargos = ENCARGADO,
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
  /** What the database answers to a reserva; it reserves every consulta unless told otherwise. */
  reservar?: () => Promise<ResultadoDeReserva>;
  /** The cargos of the usuario and the structure; an encargado of one iglesia by default. */
  cargos?: CargosDelUsuario;
} = {}): Fake {
  const result: Fake = {
    llamadasAlProveedor: [],
    busquedas: [],
    registros: [],
    liberaciones: [],
    orden: [],
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
      leerCargos: async () => cargos,
      buscarEventos: async (pedida) => {
        result.busquedas.push(pedida);
        if (busquedaFalla) {
          throw new Error('database down');
        }
        const coincidencias = resultados ? (resultados.shift() ?? []) : eventos;
        return { eventos: coincidencias.slice(0, 3), total: coincidencias.length };
      },
      reservarConsulta: async () => {
        result.orden.push('reservar');
        return reservar();
      },
      confirmarConsulta: async (registro) => {
        result.orden.push('confirmar');
        if (registroFalla) {
          throw new Error('database down');
        }
        result.registros.push(registro);
        return { consultasDelDia };
      },
      liberarConsulta: async (liberacion) => {
        result.orden.push('liberar');
        result.liberaciones.push(liberacion);
      },
      proveedor: {
        responder: async (mensajes, { conBusqueda, conPropuesta }) => {
          result.orden.push('proveedor');
          result.llamadasAlProveedor.push({
            mensajes: structuredClone(mensajes),
            conBusqueda,
            conPropuesta,
          });
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

  describe('the reserva of the consulta', () => {
    it('reserves the consulta before calling the model, and confirms it with its costo', async () => {
      const f = fake();

      await responderConsulta(pedido('Hola'), USUARIO, f.puertos);

      expect(f.orden).toEqual(['reservar', 'proveedor', 'confirmar']);
      expect(f.liberaciones).toEqual([]);
    });

    it('rejects the consulta when the reserva finds the limite diario reached', async () => {
      const f = fake({ reservar: async () => 'limite_diario' });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'limite_diario',
      });
      expect(f.orden).toEqual(['reservar']);
    });

    it('rejects the consulta when the reserva finds the presupuesto spent', async () => {
      const f = fake({ reservar: async () => 'presupuesto_agotado' });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'presupuesto_agotado',
      });
      expect(f.orden).toEqual(['reservar']);
    });

    it('reserves nothing when the limits already reject the consulta', async () => {
      const f = fake({ estado: { consultas: { dia: '2026-10-17', cantidad: 50 } } });

      await responderConsulta(pedido('Hola'), USUARIO, f.puertos);

      expect(f.orden).toEqual([]);
    });

    it('frees the reserva when the provider fails', async () => {
      const f = fake({ proveedorFalla: true });

      await responderConsulta(pedido('Hola'), USUARIO, f.puertos);

      expect(f.orden).toEqual(['reservar', 'proveedor', 'liberar']);
      expect(f.liberaciones).toEqual([{ usuarioId: USUARIO, dia: '2026-10-17' }]);
    });

    it('frees the reserva when the busqueda fails', async () => {
      const f = fake({ respuestas: [busqueda(BUSQUEDA_VALIDA)], busquedaFalla: true });

      await responderConsulta(pedido('¿Qué hay?'), USUARIO, f.puertos);

      expect(f.liberaciones).toHaveLength(1);
      expect(f.registros).toHaveLength(0);
    });

    it('frees the reserva when the consulta cannot be confirmed', async () => {
      const f = fake({ registroFalla: true });

      expect(await responderConsulta(pedido('Hola'), USUARIO, f.puertos)).toEqual({
        ok: false,
        falla: 'error_servidor',
      });
      expect(f.orden).toEqual(['reservar', 'proveedor', 'confirmar', 'liberar']);
    });

    it('lets one consulta through when five arrive at once with one left today', async () => {
      // The counters every consulta reads before reserving: 49 of 50.
      const estado = { consultas: { dia: '2026-10-17', cantidad: 49 } };
      // The database reserves one at a time, as the reserva does.
      let reservadas = 49;
      const reservar = async (): Promise<ResultadoDeReserva> => {
        if (reservadas >= 50) {
          return 'limite_diario';
        }
        reservadas++;
        return 'reservada';
      };
      // The model answers only once every consulta got that far.
      let soltar = () => {};
      const barrera = new Promise<void>((resolve) => {
        soltar = resolve;
      });
      const consultas = Array.from({ length: 5 }, () => {
        const f = fake({ estado, reservar });
        const responder = f.puertos.proveedor.responder;
        f.puertos.proveedor = {
          responder: async (...args) => {
            await barrera;
            return responder(...args);
          },
        };
        return responderConsulta(pedido('Hola'), USUARIO, f.puertos);
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
      soltar();

      const resultados = await Promise.all(consultas);

      expect(resultados.filter((resultado) => resultado.ok)).toHaveLength(1);
      expect(resultados.filter((resultado) => !resultado.ok)).toEqual(
        Array.from({ length: 4 }, () => ({ ok: false, falla: 'limite_diario' })),
      );
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
        respuesta: {
          tipo: 'respuesta',
          texto: 'Hay tres cultos jóvenes.',
          eventos,
          aviso: null,
          borrador: null,
        },
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
          borrador: null,
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
        respuesta: {
          tipo: 'respuesta',
          texto: 'No encontré nada.',
          eventos: [],
          aviso: null,
          borrador: null,
        },
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
          borrador: null,
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

  describe('the propuesta of an evento', () => {
    const CARGA = 'Cargame un culto joven el sábado 24 a las 19 h';

    /** What the model read back from its last call to a herramienta. */
    function resultadoDePropuesta(f: Fake, llamada: number) {
      return resultadoDeBusqueda(f, llamada);
    }

    it('gives an encargado of one iglesia the borrador with that iglesia, without asking', async () => {
      const f = fake({ respuestas: [propuesta({}), texto('Revisalo y confirmalo.')] });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toEqual({
        ok: true,
        respuesta: {
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
        },
      });
      // The model is told it is not saved yet.
      expect(resultadoDePropuesta(f, 1).indicacion).toMatch(/Confirmar/);
    });

    it('asks a pastor with several iglesias whose evento it is when the mensaje does not say it', async () => {
      const f = fake({
        cargos: PASTOR,
        respuestas: [propuesta({}), texto('¿Es de la Iglesia Central o de la Norte?')],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { tipo: 'repregunta', borrador: null },
      });
      expect(resultadoDePropuesta(f, 1).error).toMatch(/de quién es el evento/);
    });

    it('gives a pastor the iglesia the mensaje names', async () => {
      const f = fake({
        cargos: PASTOR,
        respuestas: [propuesta({ duenio: 'i2' }), texto('Listo.')],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { borrador: { duenio: { alcance: 'iglesia', iglesiaId: 'i2' } } },
      });
    });

    it('never gives a duenio the cargos of the usuario do not cover', async () => {
      const f = fake({ respuestas: [propuesta({ duenio: 'i2' }), texto('No puedo.')] });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({ ok: true, respuesta: { borrador: null } });
      expect(resultadoDePropuesta(f, 1).error).toMatch(/dueño/);
    });

    it('proposes nothing and asks for the enfasis when the mensaje does not say it', async () => {
      const f = fake({
        respuestas: [propuesta({ enfasis: null }), texto('¿De qué énfasis es?')],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { tipo: 'repregunta', borrador: null },
      });
      expect(resultadoDePropuesta(f, 1).error).toMatch(/énfasis/);
    });

    it('rejects an evento of several days that repeats, with the rule of the form', async () => {
      const f = fake({
        respuestas: [
          propuesta({ fecha_fin: '2026-10-25', repeticion: 'semanal' }),
          texto('Un evento que se repite no puede durar varios días.'),
        ],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({ ok: true, respuesta: { borrador: null } });
      expect(resultadoDePropuesta(f, 1).error).toContain(
        'Un evento que se repite no puede durar varios días.',
      );
    });

    it('gives a series without "Hasta" the suggested one, and rejects one of more than a year', async () => {
      const sinHasta = fake({
        respuestas: [propuesta({ repeticion: 'semanal' }), texto('Listo.')],
      });
      const largo = fake({
        respuestas: [
          propuesta({ repeticion: 'semanal', hasta: '2027-10-25' }),
          texto('Como mucho, un año.'),
        ],
      });

      expect(await responderConsulta(pedido(CARGA), USUARIO, sinHasta.puertos)).toMatchObject({
        respuesta: { borrador: { repeticion: 'semanal', finDeSerie: '2027-10-24' } },
      });
      expect(await responderConsulta(pedido(CARGA), USUARIO, largo.puertos)).toMatchObject({
        respuesta: { borrador: null },
      });
      expect(resultadoDePropuesta(largo, 1).error).toMatch(/"Hasta" puede ser, como máximo/);
    });

    it('keeps the last valid propuesta after the model fixes one', async () => {
      const f = fake({
        respuestas: [
          propuesta({ enfasis: null }),
          propuesta({ enfasis: 'discipulado' }),
          texto('Listo.'),
        ],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        respuesta: { tipo: 'respuesta', borrador: { enfasis: 'discipulado' } },
      });
    });

    it('proposes one evento per mensaje: a second propuesta is an error, not lost', async () => {
      const dos: RespuestaDelProveedor = {
        tipo: 'busqueda',
        llamadas: [
          {
            id: 'propuesta-a',
            herramienta: 'proponer_evento',
            argumentos: { ...PROPUESTA_VALIDA, titulo: 'Evento A' },
          },
          {
            id: 'propuesta-b',
            herramienta: 'proponer_evento',
            argumentos: { ...PROPUESTA_VALIDA, titulo: 'Evento B' },
          },
        ],
        costoUsd: 0.001,
      };
      const f = fake({ respuestas: [dos, texto('Te dejé el primero; el otro, en otro mensaje.')] });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({ respuesta: { borrador: { titulo: 'Evento A' } } });
      const mensajes = f.llamadasAlProveedor[1].mensajes;
      const segunda = mensajes.find(
        (mensaje) => mensaje.rol === 'busqueda' && mensaje.llamadaId === 'propuesta-b',
      );
      expect(segunda).toBeDefined();
      const error = JSON.parse((segunda as { contenido: string }).contenido).error;
      expect(error).toMatch(/un evento por mensaje/);
      // The model cannot fix its propuesta in the same mensaje: the first one stays.
      expect(error).toMatch(/queda en la tarjeta/);
      expect(error).toMatch(/Editar/);
      expect(error).toMatch(/otro mensaje/);
      const [instrucciones] = f.llamadasAlProveedor[0].mensajes;
      expect(instrucciones).toHaveProperty(
        'texto',
        expect.stringContaining('un evento por mensaje'),
      );
    });

    it('keeps the first borrador when a later propuesta of the same mensaje fails', async () => {
      const f = fake({
        respuestas: [
          propuesta({ titulo: 'Evento A' }),
          propuesta({ titulo: 'Evento B', enfasis: null }),
          texto('El otro evento, mandalo en otro mensaje.'),
        ],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        respuesta: { tipo: 'respuesta', borrador: { titulo: 'Evento A' } },
      });
      expect(resultadoDePropuesta(f, 2).error).toMatch(/un evento por mensaje/);
    });

    it('keeps the eventos found on a repregunta for the enfasis of a mixed mensaje', async () => {
      const f = fake({
        respuestas: [
          busqueda(BUSQUEDA_VALIDA),
          propuesta({ enfasis: null }),
          texto('El sábado hay un culto joven. ¿De qué énfasis es el evento que querés cargar?'),
        ],
        eventos: [evento(1)],
      });

      const resultado = await responderConsulta(
        pedido('¿Qué hay el sábado? Y cargame un culto joven a las 19'),
        USUARIO,
        f.puertos,
      );

      expect(resultado).toMatchObject({
        respuesta: { tipo: 'repregunta', eventos: [evento(1)], borrador: null },
      });
    });

    it('keeps asking for a dato the model lacked even when a later propuesta fails otherwise', async () => {
      const f = fake({
        respuestas: [
          propuesta({ enfasis: null }),
          propuesta({ hora: 19 }),
          texto('¿De qué énfasis es?'),
        ],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultadoDePropuesta(f, 2).error).toMatch(/formato/);
      expect(resultado).toMatchObject({
        respuesta: { tipo: 'repregunta', borrador: null },
      });
    });

    it('counts a mensaje de carga as one consulta and saves nothing', async () => {
      const f = fake({ respuestas: [propuesta({}), texto('Listo.')] });

      await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(f.registros).toHaveLength(1);
      // Only the counters of the consulta reach the database.
      expect(f.orden).toEqual(['reservar', 'proveedor', 'proveedor', 'confirmar']);
    });

    it('offers the propuesta only to a usuario whose cargos cover a duenio, and lists them', async () => {
      const conCargos = fake({ cargos: PASTOR });
      const sinCargos = fake({ cargos: { cargos: [], estructura: ESTRUCTURA } });

      await responderConsulta(pedido('Hola'), USUARIO, conCargos.puertos);
      await responderConsulta(pedido('Hola'), USUARIO, sinCargos.puertos);

      expect(conCargos.llamadasAlProveedor[0].conPropuesta).toBe(true);
      expect(sinCargos.llamadasAlProveedor[0].conPropuesta).toBe(false);
      const [instrucciones] = conCargos.llamadasAlProveedor[0].mensajes;
      expect(instrucciones).toHaveProperty('texto', expect.stringContaining('i2: Iglesia Norte'));
      expect(instrucciones).toHaveProperty('texto', expect.stringContaining('d1: Distrito Centro'));
    });

    it('names the only duenio instead of listing it, and keeps the list out of the errores', async () => {
      const encargado = fake({ respuestas: [texto('Hola')] });
      const pastor = fake({
        cargos: PASTOR,
        respuestas: [propuesta({}), texto('¿De quién es?')],
      });

      await responderConsulta(pedido('Hola'), USUARIO, encargado.puertos);
      await responderConsulta(pedido(CARGA), USUARIO, pastor.puertos);

      const [instrucciones] = encargado.llamadasAlProveedor[0].mensajes;
      expect(instrucciones).toHaveProperty('texto', expect.stringContaining('Iglesia Central'));
      expect(instrucciones).not.toHaveProperty('texto', expect.stringContaining('i1:'));
      expect(resultadoDePropuesta(pastor, 1).error).not.toContain('i2: Iglesia Norte');
    });

    it(`stops offering the propuesta after ${MAX_BUSQUEDAS} rounds`, async () => {
      const f = fake({
        respuestas: [
          ...Array.from({ length: MAX_BUSQUEDAS }, () => propuesta({ enfasis: null })),
          texto('¿De qué énfasis es?'),
        ],
      });

      await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(f.llamadasAlProveedor.map((llamada) => llamada.conPropuesta)).toEqual([
        ...Array.from({ length: MAX_BUSQUEDAS }, () => true),
        false,
      ]);
    });

    it('tells the model it cannot propose when its cargos cover no duenio', async () => {
      const f = fake({
        cargos: { cargos: [], estructura: ESTRUCTURA },
        respuestas: [propuesta({}), texto('No podés crear eventos.')],
      });

      const resultado = await responderConsulta(pedido(CARGA), USUARIO, f.puertos);

      expect(resultado).toMatchObject({ ok: true, respuesta: { borrador: null } });
      expect(resultadoDePropuesta(f, 1)).toHaveProperty('error');
    });

    it('answers without offering the propuesta when the cargos cannot be read', async () => {
      const f = fake({
        respuestas: [busqueda(BUSQUEDA_VALIDA), texto('El sábado hay un culto joven.')],
        eventos: [evento(1)],
      });
      f.puertos.leerCargos = async () => {
        throw new Error('database down');
      };

      const resultado = await responderConsulta(pedido('¿Qué hay el sábado?'), USUARIO, f.puertos);

      expect(resultado).toMatchObject({
        ok: true,
        respuesta: { tipo: 'respuesta', eventos: [evento(1)], borrador: null },
      });
      expect(f.llamadasAlProveedor.map((llamada) => llamada.conPropuesta)).toEqual([false, false]);
      // The model does not blame the cargo of the person: it just cannot load now.
      const [instrucciones] = f.llamadasAlProveedor[0].mensajes;
      expect(instrucciones).toHaveProperty('texto', expect.stringContaining('en un rato'));
      expect(instrucciones).not.toHaveProperty('texto', expect.stringContaining('su cargo'));
      expect(f.registros).toHaveLength(1);
      expect(f.liberaciones).toEqual([]);
      expect(f.errores).toEqual([expect.stringContaining('database down')]);
    });
  });

  describe('the herramientas of the model', () => {
    it('never include one that writes to the database', () => {
      const nombres = getHerramientas({ conBusqueda: true, conPropuesta: true }).map(
        (herramienta) => herramienta.nombre,
      );

      expect(nombres).toEqual(['buscar_eventos', 'proponer_evento']);
    });

    it('include only the ones allowed in the round', () => {
      expect(getHerramientas({ conBusqueda: true, conPropuesta: false })).toHaveLength(1);
      expect(getHerramientas({ conBusqueda: false, conPropuesta: false })).toEqual([]);
    });
  });
});
