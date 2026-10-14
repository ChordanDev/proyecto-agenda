import {
  getDuenioId,
  getDuenioInicial,
  getOpcionDeDuenio,
  getOpcionesDeDuenio,
  type EstructuraConNombres,
} from './opcionesDeDuenio';

// One asociacion with two distritos: Centro with two iglesias, Norte with one.
// Another asociacion with its own distrito and iglesia.
const ESTRUCTURA: EstructuraConNombres = {
  asociaciones: [
    { id: 'a1', nombre: 'Asociación Argentina Central' },
    { id: 'a2', nombre: 'Asociación del Litoral' },
  ],
  distritos: [
    { id: 'd2', nombre: 'Norte', asociacionId: 'a1' },
    { id: 'd1', nombre: 'Centro', asociacionId: 'a1' },
    { id: 'd3', nombre: 'Rosario', asociacionId: 'a2' },
  ],
  iglesias: [
    { id: 'i2', nombre: 'Nueva Córdoba', distritoId: 'd1' },
    { id: 'i1', nombre: 'Córdoba Central', distritoId: 'd1' },
    { id: 'i3', nombre: 'Argüello', distritoId: 'd2' },
    { id: 'i4', nombre: 'Rosario Centro', distritoId: 'd3' },
  ],
};

const nombres = (opciones: { nombre: string }[]) => opciones.map((opcion) => opcion.nombre);

describe('getOpcionesDeDuenio', () => {
  it('offers an encargado their iglesia only', () => {
    const opciones = getOpcionesDeDuenio([{ nivel: 'iglesia', iglesiaId: 'i1' }], ESTRUCTURA);

    expect(opciones).toEqual({
      asociaciones: [],
      distritos: [],
      iglesias: [
        {
          duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
          nombre: 'Iglesia Córdoba Central',
          detalle: 'Distrito Centro',
        },
      ],
    });
  });

  it('offers a pastor their distrito and each of its iglesias, never the asociacion', () => {
    const opciones = getOpcionesDeDuenio([{ nivel: 'distrito', distritoId: 'd1' }], ESTRUCTURA);

    expect(opciones.asociaciones).toEqual([]);
    expect(opciones.distritos).toEqual([
      {
        duenio: { alcance: 'distrito', distritoId: 'd1' },
        nombre: 'Distrito Centro',
        detalle: 'Se ve en sus 2 iglesias',
      },
    ]);
    expect(nombres(opciones.iglesias)).toEqual([
      'Iglesia Córdoba Central',
      'Iglesia Nueva Córdoba',
    ]);
  });

  it('offers an admin their asociacion and every distrito and iglesia in it, ordered by nombre', () => {
    const opciones = getOpcionesDeDuenio([{ nivel: 'asociacion', asociacionId: 'a1' }], ESTRUCTURA);

    expect(opciones.asociaciones).toEqual([
      {
        duenio: { alcance: 'asociacion', asociacionId: 'a1' },
        nombre: 'Asociación Argentina Central',
        detalle: 'Se ve en todas sus iglesias',
      },
    ]);
    expect(nombres(opciones.distritos)).toEqual(['Distrito Centro', 'Distrito Norte']);
    expect(nombres(opciones.iglesias)).toEqual([
      'Iglesia Argüello',
      'Iglesia Córdoba Central',
      'Iglesia Nueva Córdoba',
    ]);
  });

  it('says a distrito with a single iglesia is seen in it', () => {
    const opciones = getOpcionesDeDuenio([{ nivel: 'distrito', distritoId: 'd2' }], ESTRUCTURA);

    expect(opciones.distritos[0].detalle).toBe('Se ve en su única iglesia');
  });

  it('joins what several cargos cover, each level once', () => {
    const opciones = getOpcionesDeDuenio(
      [
        { nivel: 'iglesia', iglesiaId: 'i1' },
        { nivel: 'distrito', distritoId: 'd1' },
        { nivel: 'iglesia', iglesiaId: 'i4' },
      ],
      ESTRUCTURA,
    );

    expect(nombres(opciones.distritos)).toEqual(['Distrito Centro']);
    expect(nombres(opciones.iglesias)).toEqual([
      'Iglesia Córdoba Central',
      'Iglesia Nueva Córdoba',
      'Iglesia Rosario Centro',
    ]);
  });

  it('offers nothing without cargos', () => {
    expect(getOpcionesDeDuenio([], ESTRUCTURA)).toEqual({
      asociaciones: [],
      distritos: [],
      iglesias: [],
    });
  });
});

describe('getDuenioInicial', () => {
  it('chooses the duenio when there is a single possible one', () => {
    const opciones = getOpcionesDeDuenio([{ nivel: 'iglesia', iglesiaId: 'i1' }], ESTRUCTURA);

    expect(getDuenioInicial(opciones)).toEqual({ alcance: 'iglesia', iglesiaId: 'i1' });
  });

  it('chooses nothing when there are several', () => {
    const opciones = getOpcionesDeDuenio([{ nivel: 'distrito', distritoId: 'd1' }], ESTRUCTURA);

    expect(getDuenioInicial(opciones)).toBeNull();
  });
});

describe('getOpcionDeDuenio', () => {
  const opciones = getOpcionesDeDuenio([{ nivel: 'distrito', distritoId: 'd1' }], ESTRUCTURA);

  it('finds the option of the duenio chosen', () => {
    expect(getOpcionDeDuenio(opciones, { alcance: 'iglesia', iglesiaId: 'i2' })?.nombre).toBe(
      'Iglesia Nueva Córdoba',
    );
  });

  it('finds nothing for a duenio the cargos do not cover', () => {
    expect(getOpcionDeDuenio(opciones, { alcance: 'iglesia', iglesiaId: 'i3' })).toBeUndefined();
    expect(getOpcionDeDuenio(opciones, null)).toBeUndefined();
  });
});

describe('getDuenioId', () => {
  it('gives the id of the iglesia, distrito or asociacion that owns', () => {
    expect(getDuenioId({ alcance: 'iglesia', iglesiaId: 'i1' })).toBe('i1');
    expect(getDuenioId({ alcance: 'distrito', distritoId: 'd1' })).toBe('d1');
    expect(getDuenioId({ alcance: 'asociacion', asociacionId: 'a1' })).toBe('a1');
  });

  it('tells apart two options with the same nombre', () => {
    // Two iglesias of different distritos can share a nombre.
    const ids = [
      { alcance: 'iglesia', iglesiaId: 'i1' } as const,
      { alcance: 'iglesia', iglesiaId: 'i4' } as const,
    ].map(getDuenioId);

    expect(new Set(ids).size).toBe(2);
  });
});
