import type { EventoDeChat, RespuestaDeConsulta } from './consulta';
import {
  crearConversacion,
  getLineasDeEventos,
  getPedido,
  getPreguntaAReintentar,
  hasMensajes,
  puedeEnviar,
  recortarMensaje,
  reducirConversacion,
  type AccionDeConversacion,
  type Conversacion,
} from './conversacion';

function respuesta(texto: string, extra: Partial<RespuestaDeConsulta> = {}): RespuestaDeConsulta {
  return { tipo: 'respuesta', texto, eventos: [], aviso: null, borrador: null, ...extra };
}

function evento(extra: Partial<EventoDeChat> = {}): EventoDeChat {
  return {
    id: 'evento-1',
    titulo: 'Escuela Sabática',
    fecha: '2026-10-10',
    fechaFin: null,
    hora: '09:30:00',
    lugar: 'Templo',
    descripcion: null,
    enfasis: null,
    alcance: 'iglesia',
    duenio: 'Iglesia Central',
    ...extra,
  };
}

function aplicar(conversacion: Conversacion, ...acciones: AccionDeConversacion[]): Conversacion {
  return acciones.reduce(reducirConversacion, conversacion);
}

/** A conversacion with a pregunta sent and waiting for its respuesta. */
function preguntando(texto = '¿Qué hay el sábado?', id = 'p1'): Conversacion {
  return aplicar(crearConversacion(1), { tipo: 'preguntar', id, texto });
}

describe('crearConversacion', () => {
  it('starts empty, with nothing in flight and the cuadro de texto open', () => {
    const conversacion = crearConversacion(1);

    expect(conversacion).toEqual({
      id: 1,
      mensajes: [],
      enviando: false,
      aviso: null,
      bloqueo: null,
      vuelta: null,
    });
    expect(hasMensajes(conversacion)).toBe(false);
  });
});

describe('preguntar', () => {
  it('adds the pregunta, trimmed, and waits for its respuesta', () => {
    const conversacion = preguntando('  ¿Qué hay el sábado?  ');

    expect(conversacion.mensajes).toEqual([
      { tipo: 'pregunta', id: 'p1', texto: '¿Qué hay el sábado?' },
    ]);
    expect(conversacion.enviando).toBe(true);
    expect(hasMensajes(conversacion)).toBe(true);
  });

  it('ignores an empty pregunta', () => {
    const conversacion = aplicar(crearConversacion(1), {
      tipo: 'preguntar',
      id: 'p1',
      texto: '  ',
    });

    expect(conversacion).toEqual(crearConversacion(1));
    expect(puedeEnviar(crearConversacion(1), '  ')).toBe(false);
  });

  it('ignores a pregunta of more than 500 characters', () => {
    const texto = 'a'.repeat(501);
    const conversacion = aplicar(crearConversacion(1), { tipo: 'preguntar', id: 'p1', texto });

    expect(conversacion.mensajes).toEqual([]);
    expect(puedeEnviar(crearConversacion(1), texto)).toBe(false);
  });

  it('takes a pregunta of exactly 500 characters, counting an emoji as one', () => {
    const texto = '🙂'.repeat(500);
    const conversacion = aplicar(crearConversacion(1), { tipo: 'preguntar', id: 'p1', texto });

    expect(puedeEnviar(crearConversacion(1), texto)).toBe(true);
    expect(conversacion.mensajes).toHaveLength(1);
  });

  it('ignores a second pregunta while one is in flight', () => {
    const conversacion = aplicar(preguntando(), { tipo: 'preguntar', id: 'p2', texto: 'Otra' });

    expect(conversacion.mensajes).toHaveLength(1);
    expect(puedeEnviar(preguntando(), 'Otra')).toBe(false);
  });
});

describe('responder', () => {
  it('adds the respuesta with its eventos and lets the usuario ask again', () => {
    const eventos = [evento()];
    const conversacion = aplicar(preguntando(), {
      tipo: 'responder',
      conversacionId: 1,
      id: 'r1',
      respuesta: respuesta('El sábado hay 1 actividad:', { eventos }),
    });

    expect(conversacion.mensajes[1]).toEqual({
      tipo: 'respuesta',
      id: 'r1',
      texto: 'El sábado hay 1 actividad:',
      eventos,
    });
    expect(conversacion.enviando).toBe(false);
    expect(puedeEnviar(conversacion, 'Otra')).toBe(true);
  });

  it('shows the aviso of the consultas left, and drops it once a respuesta has none', () => {
    const conAviso = aplicar(preguntando(), {
      tipo: 'responder',
      conversacionId: 1,
      id: 'r1',
      respuesta: respuesta('Hola', { aviso: 'Te quedan 5 consultas por hoy' }),
    });
    expect(conAviso.aviso).toBe('Te quedan 5 consultas por hoy');

    const sinAviso = aplicar(
      conAviso,
      { tipo: 'preguntar', id: 'p2', texto: 'Otra' },
      { tipo: 'responder', conversacionId: 1, id: 'r2', respuesta: respuesta('Listo') },
    );
    expect(sinAviso.aviso).toBeNull();
  });

  it('ignores a respuesta to a conversacion that was started again', () => {
    const conversacion = aplicar(
      preguntando(),
      { tipo: 'nueva', id: 2 },
      { tipo: 'responder', conversacionId: 1, id: 'r1', respuesta: respuesta('Tarde') },
    );

    expect(conversacion).toEqual(crearConversacion(2));
  });

  it('ignores a respuesta or a falla when no pregunta is waiting for one', () => {
    const respondida = aplicar(preguntando(), {
      tipo: 'responder',
      conversacionId: 1,
      id: 'r1',
      respuesta: respuesta('Primera'),
    });
    const conversacion = aplicar(
      respondida,
      { tipo: 'responder', conversacionId: 1, id: 'r2', respuesta: respuesta('Duplicada') },
      { tipo: 'fallar', conversacionId: 1, id: 'f1', falla: 'proveedor_caido' },
    );

    expect(conversacion).toEqual(respondida);
  });
});

describe('recortarMensaje', () => {
  it('keeps a texto of up to 500 characters as it is', () => {
    expect(recortarMensaje('¿Qué hay el sábado?')).toBe('¿Qué hay el sábado?');
  });

  it('cuts a longer texto at 500 characters, counting an emoji as one', () => {
    expect(recortarMensaje('🙂'.repeat(600))).toBe('🙂'.repeat(500));
    expect(recortarMensaje('a'.repeat(501))).toBe('a'.repeat(500));
  });
});

describe('fallar', () => {
  it('without conexion adds the falla to retry and frees the cuadro de texto', () => {
    const conversacion = aplicar(preguntando(), {
      tipo: 'fallar',
      conversacionId: 1,
      id: 'f1',
      falla: 'sin_conexion',
    });

    expect(conversacion.mensajes[1]).toEqual({ tipo: 'falla', id: 'f1', falla: 'sin-conexion' });
    expect(conversacion.enviando).toBe(false);
    expect(conversacion.bloqueo).toBeNull();
  });

  it('with the provider down adds the falla of the asistente caído', () => {
    const conversacion = aplicar(preguntando(), {
      tipo: 'fallar',
      conversacionId: 1,
      id: 'f1',
      falla: 'proveedor_caido',
    });

    expect(conversacion.mensajes[1]).toEqual({ tipo: 'falla', id: 'f1', falla: 'caido' });
  });

  it('at the limite diario closes the cuadro de texto, without a falla in the list', () => {
    const conversacion = aplicar(preguntando(), {
      tipo: 'fallar',
      conversacionId: 1,
      id: 'f1',
      falla: 'limite_diario',
    });

    expect(conversacion.bloqueo).toBe('limite-diario');
    expect(conversacion.mensajes).toHaveLength(1);
    expect(conversacion.enviando).toBe(false);
    expect(puedeEnviar(conversacion, 'Otra')).toBe(false);
  });

  it('with the presupuesto agotado closes the chat until the day it works again', () => {
    const conversacion = aplicar(preguntando(), {
      tipo: 'fallar',
      conversacionId: 1,
      id: 'f1',
      falla: 'presupuesto_agotado',
      vuelta: '2026-11-01',
    });

    expect(conversacion.bloqueo).toBe('presupuesto-agotado');
    expect(conversacion.vuelta).toBe('2026-11-01');
    expect(puedeEnviar(conversacion, 'Otra')).toBe(false);
  });

  it('ignores a falla of a conversacion that was started again', () => {
    const conversacion = aplicar(
      preguntando(),
      { tipo: 'nueva', id: 2 },
      { tipo: 'fallar', conversacionId: 1, id: 'f1', falla: 'limite_diario' },
    );

    expect(conversacion).toEqual(crearConversacion(2));
  });
});

describe('reintentar', () => {
  const caida = aplicar(preguntando('¿Qué hay?', 'p1'), {
    tipo: 'fallar',
    conversacionId: 1,
    id: 'f1',
    falla: 'proveedor_caido',
  });

  it('offers the pregunta of the last falla again', () => {
    expect(getPreguntaAReintentar(caida)).toBe('p1');
  });

  it('takes the falla away and sends the same pregunta again', () => {
    const conversacion = aplicar(caida, { tipo: 'reintentar' });

    expect(conversacion.mensajes).toEqual([{ tipo: 'pregunta', id: 'p1', texto: '¿Qué hay?' }]);
    expect(conversacion.enviando).toBe(true);
    expect(getPedido(conversacion, 'p1')).toEqual({ mensaje: '¿Qué hay?', tramo: [] });
  });

  it('is not offered once a new pregunta was sent after the falla', () => {
    const conversacion = aplicar(caida, { tipo: 'preguntar', id: 'p2', texto: 'Otra' });

    expect(getPreguntaAReintentar(conversacion)).toBeNull();
    expect(aplicar(conversacion, { tipo: 'reintentar' })).toEqual(conversacion);
  });

  it('is not offered while a pregunta is in flight', () => {
    expect(getPreguntaAReintentar(preguntando())).toBeNull();
  });
});

describe('reabrir', () => {
  const sinPresupuesto = aplicar(preguntando(), {
    tipo: 'fallar',
    conversacionId: 1,
    id: 'f1',
    falla: 'presupuesto_agotado',
    vuelta: '2026-11-01',
  });

  it('keeps the chat closed before the day it works again', () => {
    expect(aplicar(sinPresupuesto, { tipo: 'reabrir', hoy: '2026-10-31' })).toEqual(sinPresupuesto);
  });

  it('opens the chat again on that day, keeping the mensajes', () => {
    const conversacion = aplicar(sinPresupuesto, { tipo: 'reabrir', hoy: '2026-11-01' });

    expect(conversacion.bloqueo).toBeNull();
    expect(conversacion.vuelta).toBeNull();
    expect(conversacion.mensajes).toEqual(sinPresupuesto.mensajes);
    expect(puedeEnviar(conversacion, 'Otra')).toBe(true);
  });

  it('does not lift the limite diario', () => {
    const conLimite = aplicar(preguntando(), {
      tipo: 'fallar',
      conversacionId: 1,
      id: 'f1',
      falla: 'limite_diario',
    });

    expect(aplicar(conLimite, { tipo: 'reabrir', hoy: '2027-01-01' })).toEqual(conLimite);
  });
});

describe('nueva', () => {
  it('empties the conversacion, its aviso and the limite diario', () => {
    const conversacion = aplicar(
      preguntando(),
      {
        tipo: 'responder',
        conversacionId: 1,
        id: 'r1',
        respuesta: respuesta('Hola', { aviso: 'Te queda 1 consulta por hoy' }),
      },
      { tipo: 'preguntar', id: 'p2', texto: 'Otra' },
      { tipo: 'fallar', conversacionId: 1, id: 'f1', falla: 'limite_diario' },
      { tipo: 'nueva', id: 2 },
    );

    expect(conversacion).toEqual(crearConversacion(2));
  });
});

describe('getPedido', () => {
  it('sends the mensajes answered before the pregunta, and only the last six', () => {
    let conversacion = crearConversacion(1);
    for (let i = 1; i <= 4; i++) {
      conversacion = aplicar(
        conversacion,
        { tipo: 'preguntar', id: `p${i}`, texto: `Pregunta ${i}` },
        {
          tipo: 'responder',
          conversacionId: 1,
          id: `r${i}`,
          respuesta: respuesta(`Respuesta ${i}`),
        },
      );
    }
    conversacion = aplicar(conversacion, { tipo: 'preguntar', id: 'p5', texto: 'Pregunta 5' });

    expect(getPedido(conversacion, 'p5')).toEqual({
      mensaje: 'Pregunta 5',
      tramo: [
        { autor: 'usuario', texto: 'Pregunta 2' },
        { autor: 'asistente', texto: 'Respuesta 2' },
        { autor: 'usuario', texto: 'Pregunta 3' },
        { autor: 'asistente', texto: 'Respuesta 3' },
        { autor: 'usuario', texto: 'Pregunta 4' },
        { autor: 'asistente', texto: 'Respuesta 4' },
      ],
    });
  });

  it('leaves out a pregunta that got no respuesta', () => {
    const conversacion = aplicar(
      preguntando('Sin respuesta', 'p1'),
      { tipo: 'fallar', conversacionId: 1, id: 'f1', falla: 'sin_conexion' },
      { tipo: 'preguntar', id: 'p2', texto: 'Otra' },
    );

    expect(getPedido(conversacion, 'p2')).toEqual({ mensaje: 'Otra', tramo: [] });
  });

  it('is null for a pregunta that is not in the conversacion', () => {
    expect(getPedido(preguntando(), 'otra')).toBeNull();
  });
});

describe('getLineasDeEventos', () => {
  it('draws each evento with its categoria and hora, without the fecha when all share it', () => {
    const lineas = getLineasDeEventos([
      evento({ id: 'a', hora: '09:30:00' }),
      evento({ id: 'b', titulo: 'Bautismos', hora: '11:00:00', enfasis: 'discipulado' }),
    ]);

    expect(lineas).toEqual([
      {
        clave: 'a|2026-10-10',
        categoria: 'R',
        cuando: '09:30',
        titulo: 'Escuela Sabática',
        alcance: null,
      },
      {
        clave: 'b|2026-10-10',
        categoria: 'H',
        cuando: '11:00',
        titulo: 'Bautismos',
        alcance: null,
      },
    ]);
  });

  it('names the alcance of an evento of distrito or of asociacion', () => {
    const lineas = getLineasDeEventos([
      evento({ id: 'a', enfasis: 'liderazgo', alcance: 'distrito' }),
      evento({ id: 'b', enfasis: 'identidad', alcance: 'asociacion' }),
    ]);

    expect(lineas.map(({ categoria, alcance }) => ({ categoria, alcance }))).toEqual([
      { categoria: 'F', alcance: '(distrito)' },
      { categoria: 'S', alcance: '(asociación)' },
    ]);
  });

  it('says the day of each evento when they fall on different days', () => {
    const lineas = getLineasDeEventos([
      evento({ id: 'a', fecha: '2026-10-10' }),
      evento({ id: 'a', fecha: '2026-10-17', enfasis: 'nuevas_generaciones' }),
    ]);

    expect(lineas.map(({ clave, categoria, cuando }) => ({ clave, categoria, cuando }))).toEqual([
      { clave: 'a|2026-10-10', categoria: 'R', cuando: 'Sábado 10 de octubre · 09:30' },
      { clave: 'a|2026-10-17', categoria: 'I', cuando: 'Sábado 17 de octubre · 09:30' },
    ]);
  });
});
