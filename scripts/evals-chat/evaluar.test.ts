import type { RespuestaDeConsulta } from '../../src/features/chat/dominio/consulta.ts';
import {
  evaluarCaso,
  getAnclaje,
  getCodigoDeSalida,
  getHoy,
  hora,
  resumir,
  sumarDias,
} from './evaluar.ts';

const ANCLAJE = '2026-10-24';

type Borrador = NonNullable<RespuestaDeConsulta['borrador']>;

function respuesta(cambios: Partial<RespuestaDeConsulta> = {}): RespuestaDeConsulta {
  return {
    tipo: 'respuesta',
    texto: 'El culto joven es el sábado 24 a las 19 h en la Iglesia Evals Central.',
    eventos: [],
    aviso: null,
    borrador: null,
    ...cambios,
  };
}

function evento(titulo: string, fecha = ANCLAJE): RespuestaDeConsulta['eventos'][number] {
  return {
    id: titulo,
    titulo,
    fecha,
    fechaFin: null,
    hora: '19:00:00',
    lugar: null,
    descripcion: null,
    enfasis: null,
    alcance: 'iglesia',
    duenio: 'Iglesia Evals Central',
  };
}

function borrador(cambios: Partial<Borrador> = {}): Borrador {
  return {
    titulo: 'Culto joven',
    fecha: ANCLAJE,
    hora: '20:00:00',
    fechaFin: null,
    lugar: null,
    descripcion: null,
    enfasis: 'nuevas_generaciones',
    duenio: { alcance: 'iglesia', iglesiaId: 'central' },
    duenioNombre: 'Iglesia Evals Central',
    repeticion: 'ninguna',
    finDeSerie: null,
    ...cambios,
  };
}

describe('getAnclaje', () => {
  it('is the next sabado after hoy', () => {
    expect(getAnclaje('2026-10-19')).toBe('2026-10-24'); // lunes
    expect(getAnclaje('2026-10-23')).toBe('2026-10-24'); // viernes
  });

  it('is the sabado of next week when hoy is sabado', () => {
    expect(getAnclaje('2026-10-24')).toBe('2026-10-31');
  });
});

describe('sumarDias', () => {
  it('moves across months and back', () => {
    expect(sumarDias('2026-10-24', 8)).toBe('2026-11-01');
    expect(sumarDias('2026-10-24', -3)).toBe('2026-10-21');
  });
});

describe('getHoy', () => {
  it('is the dia in the zona horaria, not in UTC', () => {
    // 01:00 UTC is still the day before in Buenos Aires (UTC-3).
    expect(getHoy(new Date('2026-10-20T01:00:00Z'), 'America/Argentina/Buenos_Aires')).toBe(
      '2026-10-19',
    );
  });
});

describe('evaluarCaso', () => {
  it('passes when every expectation holds', () => {
    const resultado = evaluarCaso(
      {
        tipo: 'respuesta',
        eventos: ['Culto joven'],
        contiene: ['19'],
        contieneAlguno: ['iglesia', 'templo'],
        noContiene: ['guardado'],
      },
      respuesta({ eventos: [evento('Culto joven')] }),
      ANCLAJE,
    );

    expect(resultado).toEqual({ acierto: true, fallos: [] });
  });

  it('fails on another tipo', () => {
    expect(evaluarCaso({ tipo: 'repregunta' }, respuesta(), ANCLAJE)).toEqual({
      acierto: false,
      fallos: ['tipo: se esperaba repregunta y llegó respuesta'],
    });
  });

  it('compares the eventos by titulo, once per titulo, in any order', () => {
    const serie = respuesta({
      eventos: [
        evento('Visitación', '2026-10-25'),
        evento('Escuela Sabática'),
        evento('Visitación', '2026-11-01'),
      ],
    });

    expect(evaluarCaso({ eventos: ['Visitación', 'Escuela Sabática'] }, serie, ANCLAJE)).toEqual({
      acierto: true,
      fallos: [],
    });
    expect(evaluarCaso({ eventos: ['Visitación'] }, serie, ANCLAJE).fallos).toEqual([
      'eventos: se esperaba [Visitación] y llegó [Escuela Sabática, Visitación]',
    ]);
  });

  it('expects no eventos when the list is empty', () => {
    const resultado = evaluarCaso(
      { eventos: [] },
      respuesta({ eventos: [evento('Culto joven')] }),
      ANCLAJE,
    );

    expect(resultado.fallos).toEqual(['eventos: se esperaba [] y llegó [Culto joven]']);
  });

  it('reads the texto without caring about capitals or accents', () => {
    const resultado = evaluarCaso(
      { contiene: ['IGLESIA EVALS CENTRAL', 'sabado'] },
      respuesta(),
      ANCLAJE,
    );

    expect(resultado.acierto).toBe(true);
  });

  it('names each missing or forbidden fragment', () => {
    const resultado = evaluarCaso(
      { contiene: ['Los Pinos'], contieneAlguno: ['no tiene', 'no figura'], noContiene: ['culto'] },
      respuesta(),
      ANCLAJE,
    );

    expect(resultado.fallos).toEqual([
      'texto: falta "Los Pinos"',
      'texto: falta alguno de "no tiene", "no figura"',
      'texto: no debía decir "culto"',
    ]);
  });

  it('expects no borrador when it is null', () => {
    expect(
      evaluarCaso({ borrador: null }, respuesta({ borrador: borrador() }), ANCLAJE).fallos,
    ).toEqual(['borrador: no se esperaba uno']);
  });

  it('checks each field of the borrador it names, with dias from the anclaje', () => {
    const esperado = {
      borrador: { titulo: 'culto joven', dia: 0, hora: '20:00:00', enfasis: 'nuevas_generaciones' },
    } as const;

    expect(evaluarCaso(esperado, respuesta({ borrador: borrador() }), ANCLAJE)).toEqual({
      acierto: true,
      fallos: [],
    });
    expect(
      evaluarCaso(
        esperado,
        respuesta({
          borrador: borrador({
            titulo: 'Reunión',
            fecha: '2026-10-25',
            hora: '19:00:00',
            enfasis: null,
          }),
        }),
        ANCLAJE,
      ).fallos,
    ).toEqual([
      'borrador: el titulo "Reunión" no dice "culto joven"',
      'borrador: fecha 2026-10-25 en vez de 2026-10-24',
      'borrador: hora 19:00:00 en vez de 20:00:00',
      'borrador: enfasis null en vez de nuevas_generaciones',
    ]);
    expect(evaluarCaso(esperado, respuesta(), ANCLAJE).fallos).toEqual([
      'borrador: se esperaba uno y no llegó',
    ]);
  });

  it('ignores what the caso does not expect', () => {
    expect(evaluarCaso({}, respuesta({ eventos: [evento('Culto joven')] }), ANCLAJE)).toEqual({
      acierto: true,
      fallos: [],
    });
  });
});

describe('resumir', () => {
  it('counts the aciertos', () => {
    expect(
      resumir([
        { acierto: true, fallos: [] },
        { acierto: false, fallos: ['x'] },
        { acierto: true, fallos: [] },
      ]),
    ).toEqual({ aciertos: 2, total: 3 });
  });
});

describe('hora', () => {
  it('names the ways the chat writes an hora, not a bare number a fecha can hold', () => {
    expect(hora(19)).toEqual(['19 h', '19:00', '19 hs', '19.00', 'las 19']);
  });

  it('passes a respuesta that says the hora and fails one that only says the dia', () => {
    const esperado = { contieneAlguno: hora(10) };

    expect(
      evaluarCaso(esperado, respuesta({ texto: 'Es el sábado a las 10.' }), ANCLAJE).acierto,
    ).toBe(true);
    expect(
      evaluarCaso(esperado, respuesta({ texto: 'Es el sábado 10 de octubre.' }), ANCLAJE).acierto,
    ).toBe(false);
  });
});

describe('getCodigoDeSalida', () => {
  it('is 0 when every caso passed', () => {
    expect(getCodigoDeSalida({ aciertos: 3, total: 3, sinRespuesta: 0 })).toBe(0);
  });

  it('is 1 when the chat answered and some caso failed', () => {
    expect(getCodigoDeSalida({ aciertos: 2, total: 3, sinRespuesta: 0 })).toBe(1);
  });

  it('is 2 when some caso got no respuesta, since then the run did not measure the chat', () => {
    expect(getCodigoDeSalida({ aciertos: 2, total: 3, sinRespuesta: 1 })).toBe(2);
  });
});
