import type { FechaDeEvento } from '../../calendario/dominio/armarCalendario';
import type { Evento } from '../../eventos/dominio/evento';
import type { Encargado } from './encargados';
import {
  contarEventosDelMes,
  getAvisosDelPastor,
  getDetalleDeIglesia,
  getEtiquetasDeIglesia,
  getMesDeLaAsociacion,
  getSubtituloDelPastor,
  ordenarEncargadosDelPastor,
  type IglesiaDelPastor,
} from './gestionPastor';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

const CENTRAL = { id: 'central', distritoId: 'norte', asociacionId: 'centro' };
const LAS_ROSAS = { id: 'las-rosas', distritoId: 'norte', asociacionId: 'centro' };

function evento(datos: Partial<Evento> & Pick<Evento, 'id'>): Evento {
  return {
    titulo: datos.id,
    lugar: null,
    lugarId: null,
    descripcion: null,
    enfasis: null,
    duenio: { alcance: 'iglesia', iglesiaId: CENTRAL.id },
    hora: '19:00:00',
    fechaFin: null,
    repeticion: 'ninguna',
    finDeSerie: null,
    iglesiasSumadas: [],
    ...datos,
  };
}

function fecha(dia: string, datos: Partial<Evento> & Pick<Evento, 'id'>): FechaDeEvento {
  return { fecha: dia, evento: evento(datos) };
}

function iglesia(
  datos: Partial<IglesiaDelPastor> & Pick<IglesiaDelPastor, 'nombre'>,
): IglesiaDelPastor {
  return {
    ...CENTRAL,
    id: datos.nombre,
    encargados: 1,
    conSecretaria: true,
    eventosDelMes: 0,
    ...datos,
  };
}

describe('getMesDeLaAsociacion', () => {
  it('is still the old month one minute before midnight in the asociacion', () => {
    // 23:59 of 31 October in Buenos Aires (UTC-3), already 1 November in UTC.
    expect(getMesDeLaAsociacion(new Date('2026-11-01T02:59:00Z'), BUENOS_AIRES)).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it('is the new month at midnight in the asociacion', () => {
    expect(getMesDeLaAsociacion(new Date('2026-11-01T03:00:00Z'), BUENOS_AIRES)).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it('turns the year only at midnight of 31 December in the asociacion', () => {
    expect(getMesDeLaAsociacion(new Date('2027-01-01T02:00:00Z'), BUENOS_AIRES)).toEqual({
      year: 2026,
      month: 12,
    });
  });
});

describe('contarEventosDelMes', () => {
  const OCTUBRE = { year: 2026, month: 10 };

  it('counts the eventos of the month at the edge of midnight in the asociacion', () => {
    const fechas = [
      fecha('2026-09-30', { id: 'ultimo-de-septiembre' }),
      fecha('2026-10-01', { id: 'primero-de-octubre' }),
      fecha('2026-10-31', { id: 'ultimo-de-octubre', hora: '23:30:00' }),
      fecha('2026-11-01', { id: 'primero-de-noviembre', hora: '00:00:00' }),
    ];
    // 23:59 of 31 October in Buenos Aires: still October.
    const mes = getMesDeLaAsociacion(new Date('2026-11-01T02:59:00Z'), BUENOS_AIRES);

    expect(contarEventosDelMes(CENTRAL, fechas, mes)).toBe(2);
  });

  it('counts the eventos of the new month from midnight in the asociacion', () => {
    const fechas = [
      fecha('2026-10-31', { id: 'ultimo-de-octubre' }),
      fecha('2026-11-01', { id: 'primero-de-noviembre' }),
    ];
    const mes = getMesDeLaAsociacion(new Date('2026-11-01T03:00:00Z'), BUENOS_AIRES);

    expect(contarEventosDelMes(CENTRAL, fechas, mes)).toBe(1);
  });

  it('counts each date of a series that falls in the month', () => {
    const semanal = { id: 'culto', repeticion: 'semanal', finDeSerie: '2027-10-01' } as const;
    const fechas = ['2026-10-03', '2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31'].map(
      (dia) => fecha(dia, semanal),
    );

    expect(contarEventosDelMes(CENTRAL, fechas, OCTUBRE)).toBe(5);
  });

  it('counts once an evento of several days that started the month before', () => {
    const fechas = [fecha('2026-09-29', { id: 'campamento', fechaFin: '2026-10-02' })];

    expect(contarEventosDelMes(CENTRAL, fechas, OCTUBRE)).toBe(1);
  });

  it('counts the eventos the iglesia sees by alcance and as iglesia sumada', () => {
    const fechas = [
      fecha('2026-10-03', {
        id: 'del-distrito',
        duenio: { alcance: 'distrito', distritoId: 'norte' },
      }),
      fecha('2026-10-04', {
        id: 'de-la-asociacion',
        duenio: { alcance: 'asociacion', asociacionId: 'centro' },
      }),
      fecha('2026-10-05', {
        id: 'compartido',
        duenio: { alcance: 'iglesia', iglesiaId: LAS_ROSAS.id },
        iglesiasSumadas: [CENTRAL.id],
      }),
      fecha('2026-10-06', {
        id: 'de-las-rosas',
        duenio: { alcance: 'iglesia', iglesiaId: LAS_ROSAS.id },
      }),
      fecha('2026-10-07', {
        id: 'de-otro-distrito',
        duenio: { alcance: 'distrito', distritoId: 'sur' },
      }),
    ];

    expect(contarEventosDelMes(CENTRAL, fechas, OCTUBRE)).toBe(3);
  });

  it('counts an evento read twice only once', () => {
    const fechas = [
      fecha('2026-10-03', { id: 'repetido' }),
      fecha('2026-10-03', { id: 'repetido' }),
    ];

    expect(contarEventosDelMes(CENTRAL, fechas, OCTUBRE)).toBe(1);
  });
});

describe('getEtiquetasDeIglesia', () => {
  it('marks an iglesia without encargados only "Sin encargado"', () => {
    expect(getEtiquetasDeIglesia({ encargados: 0, conSecretaria: false })).toEqual([
      'Sin encargado',
    ]);
  });

  it('marks an iglesia with encargados and no secretaria "Sin secretaria"', () => {
    expect(getEtiquetasDeIglesia({ encargados: 2, conSecretaria: false })).toEqual([
      'Sin secretaria',
    ]);
  });

  it('marks nothing on an iglesia with a secretaria', () => {
    expect(getEtiquetasDeIglesia({ encargados: 1, conSecretaria: true })).toEqual([]);
  });
});

describe('getAvisosDelPastor', () => {
  const SIN_ENCARGADO =
    'Nadie de la iglesia puede cargar sus eventos. Agregá un encargado o cargalos vos.';

  it('gives no notice when every iglesia has a secretaria', () => {
    expect(getAvisosDelPastor([iglesia({ nombre: 'Iglesia Central' })])).toEqual([]);
  });

  it('gives one notice per iglesia without encargado', () => {
    expect(
      getAvisosDelPastor([
        iglesia({ nombre: 'Iglesia San Martín', encargados: 0, conSecretaria: false }),
        iglesia({ nombre: 'Iglesia Villa Sur', encargados: 0, conSecretaria: false }),
      ]),
    ).toEqual([
      { titulo: 'Iglesia San Martín no tiene encargado', texto: SIN_ENCARGADO },
      { titulo: 'Iglesia Villa Sur no tiene encargado', texto: SIN_ENCARGADO },
    ]);
  });

  it('groups the iglesias without secretaria in one notice, after those without encargado', () => {
    expect(
      getAvisosDelPastor([
        iglesia({ nombre: 'Iglesia Central' }),
        iglesia({ nombre: 'Iglesia Barrio Norte', conSecretaria: false }),
        iglesia({ nombre: 'Iglesia Las Rosas', conSecretaria: false }),
        iglesia({ nombre: 'Iglesia San Martín', encargados: 0, conSecretaria: false }),
      ]),
    ).toEqual([
      { titulo: 'Iglesia San Martín no tiene encargado', texto: SIN_ENCARGADO },
      {
        titulo: '2 iglesias sin secretaria',
        texto: 'En Barrio Norte y Las Rosas solo vos podés agregar encargados.',
      },
    ]);
  });

  it('names three iglesias without secretaria with commas and "y"', () => {
    expect(
      getAvisosDelPastor([
        iglesia({ nombre: 'Iglesia A', conSecretaria: false }),
        iglesia({ nombre: 'Iglesia B', conSecretaria: false }),
        iglesia({ nombre: 'Templo C', conSecretaria: false }),
      ]),
    ).toEqual([
      {
        titulo: '3 iglesias sin secretaria',
        texto: 'En A, B y Templo C solo vos podés agregar encargados.',
      },
    ]);
  });

  it('names a single iglesia without secretaria', () => {
    expect(
      getAvisosDelPastor([iglesia({ nombre: 'Iglesia Las Rosas', conSecretaria: false })]),
    ).toEqual([
      {
        titulo: 'Iglesia Las Rosas no tiene secretaria',
        texto: 'En Las Rosas solo vos podés agregar encargados.',
      },
    ]);
  });
});

describe('getDetalleDeIglesia', () => {
  const OCTUBRE = { year: 2026, month: 10 };

  it('says the encargados and the eventos of the month', () => {
    expect(getDetalleDeIglesia({ encargados: 2, eventosDelMes: 9 }, OCTUBRE)).toBe(
      '2 encargados · 9 eventos en octubre',
    );
  });

  it('says one encargado and one evento in singular', () => {
    expect(getDetalleDeIglesia({ encargados: 1, eventosDelMes: 1 }, OCTUBRE)).toBe(
      '1 encargado · 1 evento en octubre',
    );
  });

  it('says nothing for an iglesia without encargados: its label speaks', () => {
    expect(getDetalleDeIglesia({ encargados: 0, eventosDelMes: 3 }, OCTUBRE)).toBeNull();
  });
});

describe('getSubtituloDelPastor', () => {
  it('says the distrito and how many iglesias it has', () => {
    expect(getSubtituloDelPastor(['Distrito Norte'], 4)).toBe('Distrito Norte · 4 iglesias');
  });

  it('names both distritos of a pastor with two', () => {
    expect(getSubtituloDelPastor(['Distrito Norte', 'Distrito Sur'], 7)).toBe(
      'Distrito Norte y Distrito Sur · 7 iglesias',
    );
  });

  it('says one iglesia in singular', () => {
    expect(getSubtituloDelPastor(['Distrito Norte'], 1)).toBe('Distrito Norte · 1 iglesia');
  });
});

describe('ordenarEncargadosDelPastor', () => {
  function encargado(nombre: string, iglesiaNombre: string, esSecretaria = false) {
    const uno: Encargado = {
      cargoId: `${nombre}-${iglesiaNombre}`,
      usuarioId: nombre,
      nombre,
      nombreDelPerfil: nombre,
      correo: null,
      funcion: null,
      esSecretaria,
    };
    return { ...uno, iglesia: { id: iglesiaNombre, nombre: iglesiaNombre } };
  }

  it('orders by iglesia, then the secretarias, then by nombre', () => {
    const ordenados = ordenarEncargadosDelPastor([
      encargado('Raúl', 'Iglesia Central'),
      encargado('Ana', 'Iglesia Barrio Norte'),
      encargado('Marta', 'Iglesia Central', true),
      encargado('Daniel', 'Iglesia Central'),
    ]);

    expect(ordenados.map((uno) => uno.nombre)).toEqual(['Ana', 'Marta', 'Daniel', 'Raúl']);
  });

  it('does not change the list it receives', () => {
    const lista = [encargado('Raúl', 'Iglesia Central'), encargado('Ana', 'Iglesia Central')];

    ordenarEncargadosDelPastor(lista);

    expect(lista.map((uno) => uno.nombre)).toEqual(['Raúl', 'Ana']);
  });
});
