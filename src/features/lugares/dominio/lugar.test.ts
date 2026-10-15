import {
  getMensajeDeErrorDeLugar,
  getOpcionesDeLugar,
  getNombreKey,
  limpiarNombreDeLugar,
  resolverLugarNuevo,
  type Lugar,
} from './lugar';

const IGLESIA = { alcance: 'iglesia', iglesiaId: 'i1' } as const;
const OTRA_IGLESIA = { alcance: 'iglesia', iglesiaId: 'i2' } as const;
const DISTRITO = { alcance: 'distrito', distritoId: 'i1' } as const;

const TEMPLO: Lugar = { id: 'l1', nombre: 'Templo', duenio: IGLESIA };
const SALON: Lugar = { id: 'l2', nombre: 'Salón de jóvenes', duenio: IGLESIA };
const PLAZA: Lugar = { id: 'l3', nombre: 'Plaza San Martín', duenio: IGLESIA };
const AJENO: Lugar = { id: 'l4', nombre: 'Patio', duenio: OTRA_IGLESIA };

describe('limpiarNombreDeLugar', () => {
  it('trims the nombre and leaves single spaces', () => {
    expect(limpiarNombreDeLugar('  Salón   de  jóvenes ')).toBe('Salón de jóvenes');
  });

  it('keeps capitals and accents as written', () => {
    expect(limpiarNombreDeLugar('SALÓN')).toBe('SALÓN');
  });
});

describe('getNombreKey', () => {
  it('does not tell capitals, accents or spaces apart', () => {
    expect(getNombreKey('  Salón de  Jóvenes')).toBe(getNombreKey('salon de jovenes'));
    expect(getNombreKey('Pingüino')).toBe(getNombreKey('pinguino'));
  });

  it('tells different nombres apart', () => {
    expect(getNombreKey('Salón de jóvenes')).not.toBe(getNombreKey('Salón de actos'));
  });
});

describe('resolverLugarNuevo', () => {
  it('asks for a nombre when nothing is written', () => {
    expect(resolverLugarNuevo([TEMPLO], '   ')).toEqual({
      ok: false,
      error: 'Escribí el nombre del lugar.',
    });
  });

  it('gives a new nombre cleaned, to be saved', () => {
    expect(resolverLugarNuevo([TEMPLO], ' Salón  de actos ')).toEqual({
      ok: true,
      nuevo: 'Salón de actos',
    });
  });

  it('picks the lugar of the list that has that nombre instead of repeating it', () => {
    expect(resolverLugarNuevo([TEMPLO, SALON], 'salon de JOVENES')).toEqual({
      ok: true,
      existente: SALON,
    });
  });
});

describe('getOpcionesDeLugar', () => {
  it('offers "Sin lugar" first, then the lugares of the duenio by nombre', () => {
    const opciones = getOpcionesDeLugar([TEMPLO, SALON, PLAZA], IGLESIA, null);

    expect(opciones.map((opcion) => opcion.nombre)).toEqual([
      'Sin lugar',
      'Plaza San Martín',
      'Salón de jóvenes',
      'Templo',
    ]);
    expect(opciones.map((opcion) => opcion.checked)).toEqual([true, false, false, false]);
  });

  it('marks the lugar chosen', () => {
    const opciones = getOpcionesDeLugar([TEMPLO, SALON], IGLESIA, {
      tipo: 'guardado',
      lugar: TEMPLO,
    });

    expect(opciones.filter((opcion) => opcion.checked).map((opcion) => opcion.nombre)).toEqual([
      'Templo',
    ]);
  });

  it('leaves out the lugares of another duenio', () => {
    const opciones = getOpcionesDeLugar([TEMPLO, AJENO], IGLESIA, null);

    expect(opciones.map((opcion) => opcion.nombre)).toEqual(['Sin lugar', 'Templo']);
  });

  it('does not take an iglesia and a distrito with the same id for the same duenio', () => {
    const opciones = getOpcionesDeLugar([TEMPLO], DISTRITO, null);

    expect(opciones.map((opcion) => opcion.nombre)).toEqual(['Sin lugar']);
  });

  it('offers a lugar chosen that the list does not have yet', () => {
    const opciones = getOpcionesDeLugar([TEMPLO], IGLESIA, { tipo: 'guardado', lugar: SALON });

    expect(opciones.map((opcion) => [opcion.nombre, opcion.checked])).toEqual([
      ['Sin lugar', false],
      ['Salón de jóvenes', true],
      ['Templo', false],
    ]);
  });

  it('offers first the lugar an old evento has written by hand', () => {
    const escrito = { tipo: 'escrito', nombre: 'Salon jovenes' } as const;
    const opciones = getOpcionesDeLugar([TEMPLO], IGLESIA, escrito);

    expect(opciones).toEqual([
      { key: 'sin-lugar', nombre: 'Sin lugar', aMano: false, elegido: null, checked: false },
      { key: 'escrito', nombre: 'Salon jovenes', aMano: true, elegido: escrito, checked: true },
      {
        key: 'l1',
        nombre: 'Templo',
        aMano: false,
        elegido: { tipo: 'guardado', lugar: TEMPLO },
        checked: false,
      },
    ]);
  });

  it('has only "Sin lugar" while no duenio is chosen', () => {
    expect(getOpcionesDeLugar([TEMPLO], null, null).map((opcion) => opcion.nombre)).toEqual([
      'Sin lugar',
    ]);
  });
});

describe('getMensajeDeErrorDeLugar', () => {
  it('says what the person can do when a lugar is not saved', () => {
    expect(getMensajeDeErrorDeLugar('sin-conexion')).toBe(
      'Hace falta conexión a internet. Revisá la conexión y probá de nuevo.',
    );
    expect(getMensajeDeErrorDeLugar('sin-permiso')).toBe(
      'Tus cargos no te permiten agregar lugares de este dueño.',
    );
    expect(getMensajeDeErrorDeLugar('otro')).toBe(
      'No se pudo guardar el lugar. Probá de nuevo en un momento.',
    );
  });
});
