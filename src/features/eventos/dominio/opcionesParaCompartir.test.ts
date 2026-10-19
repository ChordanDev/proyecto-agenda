import {
  getIglesiasElegidas,
  getOpcionesParaCompartir,
  getTituloDeOpciones,
  type IglesiaParaCompartir,
} from './opcionesParaCompartir';

// Points along a meridian: 0.01 degrees of latitud is about 1.1 km.
function iglesia(
  id: string,
  distritoId: string,
  latitud: number | null,
  nombre = `Iglesia ${id}`,
): IglesiaParaCompartir {
  return {
    id,
    nombre,
    distritoId,
    distrito: `Distrito ${distritoId}`,
    ...(latitud !== null && { coordenadas: { latitud, longitud: -64 } }),
  };
}

const CENTRAL = iglesia('central', 'd1', -31.4);
const NORTE = iglesia('norte', 'd1', -31.52);
const A = iglesia('a', 'd2', -31.42);
const B = iglesia('b', 'd2', -31.45);
const C = iglesia('c', 'd3', -31.3);
const D = iglesia('d', 'd3', -31.25);
const E = iglesia('e', 'd4', -31.1);
const SIN_COORDENADAS = iglesia('x', 'd4', null);

const IGLESIAS = [SIN_COORDENADAS, E, D, C, B, A, NORTE, CENTRAL];

const DE_IGLESIA = { alcance: 'iglesia', iglesiaId: 'central' } as const;
const DE_DISTRITO = { alcance: 'distrito', distritoId: 'd1' } as const;

function ids(opciones: readonly { id: string }[]): string[] {
  return opciones.map((opcion) => opcion.id);
}

describe('getOpcionesParaCompartir', () => {
  it('offers the 4 iglesias closest to the duenia of an evento of iglesia', () => {
    const opciones = getOpcionesParaCompartir(DE_IGLESIA, IGLESIAS, { texto: '', elegidas: [] });

    expect(ids(opciones)).toEqual(['a', 'b', 'c', 'norte']);
  });

  it('measures an evento of distrito from its iglesia closest to each option, and does not offer the distrito', () => {
    const opciones = getOpcionesParaCompartir(DE_DISTRITO, IGLESIAS, {
      texto: 'iglesia',
      elegidas: [],
    });

    expect(ids(opciones)).toEqual(['a', 'b', 'c', 'd', 'e', 'x']);
    const distancias = Object.fromEntries(opciones.map((o) => [o.id, o.distancia]));
    expect(distancias.a).toBeCloseTo(2224, -1); // 0.02 from Central, 0.10 from Norte
    expect(distancias.b).toBeCloseTo(5560, -1); // 0.05 from Central, 0.07 from Norte
    expect(distancias.c).toBeCloseTo(11119, -1); // 0.10 from Central, 0.22 from Norte
    expect(distancias.x).toBeNull();
  });

  it('measures from Norte the options closer to it than to Central', () => {
    const cercaDeNorte = iglesia('sur', 'd2', -31.55);

    const [opcion] = getOpcionesParaCompartir(DE_DISTRITO, [CENTRAL, NORTE, cercaDeNorte], {
      texto: '',
      elegidas: [],
    });

    expect(opcion?.distancia).toBeCloseTo(3336, -1); // 0.03 from Norte, 0.15 from Central
  });

  it('keeps the results of a search ordered by distance', () => {
    const conNombres = [
      iglesia('lejos', 'd2', -31.0, 'Iglesia Villa Lejana'),
      iglesia('cerca', 'd2', -31.41, 'Iglesia Villa Cercana'),
      iglesia('medio', 'd3', -31.2, 'Iglesia Villa del Medio'),
      iglesia('otra', 'd3', -31.405, 'Iglesia Los Pinos'),
      CENTRAL,
    ];

    const opciones = getOpcionesParaCompartir(DE_IGLESIA, conNombres, {
      texto: 'VILLA',
      elegidas: [],
    });

    expect(ids(opciones)).toEqual(['cerca', 'medio', 'lejos']);
  });

  it('finds an iglesia ignoring case and accents', () => {
    const conNombres = [iglesia('cordoba', 'd2', -31.41, 'Iglesia Córdoba Centro'), CENTRAL];

    const opciones = getOpcionesParaCompartir(DE_IGLESIA, conNombres, {
      texto: 'cordoba',
      elegidas: [],
    });

    expect(ids(opciones)).toEqual(['cordoba']);
  });

  it('shows every match of a search, not only the 4 closest', () => {
    const opciones = getOpcionesParaCompartir(DE_IGLESIA, IGLESIAS, {
      texto: 'Iglesia',
      elegidas: [],
    });

    expect(ids(opciones)).toEqual(['a', 'b', 'c', 'norte', 'd', 'e', 'x']);
  });

  it('puts the iglesias without coordenadas at the end, by nombre', () => {
    const sinCoordenadas = [
      iglesia('z', 'd2', null, 'Iglesia Zárate'),
      iglesia('m', 'd2', null, 'Iglesia Malvinas'),
      A,
      CENTRAL,
    ];

    const opciones = getOpcionesParaCompartir(DE_IGLESIA, sinCoordenadas, {
      texto: '',
      elegidas: [],
    });

    expect(ids(opciones)).toEqual(['a', 'm', 'z']);
    expect(opciones[1]?.distancia).toBeNull();
  });

  it('orders by nombre when the duenia has no coordenadas', () => {
    const sinOrigen = [
      iglesia('central', 'd1', null),
      iglesia('b', 'd2', -31.45, 'Iglesia Beta'),
      iglesia('a', 'd2', -31.42, 'Iglesia Alfa'),
    ];

    const opciones = getOpcionesParaCompartir(DE_IGLESIA, sinOrigen, { texto: '', elegidas: [] });

    expect(ids(opciones)).toEqual(['a', 'b']);
    expect(opciones.every((opcion) => opcion.distancia === null)).toBe(true);
  });

  it('does not offer the iglesias already chosen', () => {
    const opciones = getOpcionesParaCompartir(DE_IGLESIA, IGLESIAS, {
      texto: '',
      elegidas: ['a', 'c'],
    });

    expect(ids(opciones)).toEqual(['b', 'norte', 'd', 'e']);
  });

  it('offers none for an evento of asociacion', () => {
    const opciones = getOpcionesParaCompartir(
      { alcance: 'asociacion', asociacionId: 'as1' },
      IGLESIAS,
      { texto: '', elegidas: [] },
    );

    expect(opciones).toEqual([]);
  });
});

describe('getIglesiasElegidas', () => {
  it('gives the chosen iglesias in the order they were chosen', () => {
    expect(ids(getIglesiasElegidas(DE_IGLESIA, ['c', 'a'], IGLESIAS))).toEqual(['c', 'a']);
  });

  it('leaves out the ones that already see the evento by its alcance', () => {
    expect(ids(getIglesiasElegidas(DE_DISTRITO, ['norte', 'a'], IGLESIAS))).toEqual(['a']);
  });
});

describe('getTituloDeOpciones', () => {
  it('names the closest ones while nothing is written', () => {
    expect(getTituloDeOpciones('  ')).toBe('Más cercanas');
  });

  it('names the results of a search', () => {
    expect(getTituloDeOpciones('villa')).toBe('Resultados, de la más cercana a la más lejana');
  });
});
