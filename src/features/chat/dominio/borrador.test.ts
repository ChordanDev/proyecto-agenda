import type { Cargo } from '../../sesion/dominio/cargo';
import type { EstructuraConNombres } from '../../eventos/dominio/opcionesDeDuenio';
import { isBorrador, leerPropuesta, type BorradorDeEvento } from './borrador';

const HOY = '2026-10-17';

const ESTRUCTURA: EstructuraConNombres = {
  asociaciones: [{ id: 'a1', nombre: 'Asociación Central' }],
  distritos: [{ id: 'd1', nombre: 'Centro', asociacionId: 'a1' }],
  iglesias: [
    { id: 'i1', nombre: 'Central', distritoId: 'd1' },
    { id: 'i2', nombre: 'Norte', distritoId: 'd1' },
  ],
};

const ENCARGADO: Cargo[] = [{ nivel: 'iglesia', iglesiaId: 'i1' }];
const PASTOR: Cargo[] = [{ nivel: 'distrito', distritoId: 'd1' }];

/** What the model writes for "Cargame un culto joven el sábado 24 a las 19 h". */
const PROPUESTA = {
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

function leer(argumentos: Record<string, unknown>, cargos: Cargo[] = ENCARGADO) {
  return leerPropuesta({ ...PROPUESTA, ...argumentos }, { cargos, estructura: ESTRUCTURA }, HOY);
}

describe('leerPropuesta', () => {
  it('gives the only duenio the cargos cover, without asking', () => {
    expect(leer({})).toEqual({
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
    });
  });

  it('asks whose evento it is when the cargos cover several duenios', () => {
    const resultado = leer({}, PASTOR);

    expect(resultado).toEqual({
      error: expect.stringContaining('de quién es el evento'),
      falta: 'duenio',
    });
  });

  it('uses the duenio the model names when the cargos cover it', () => {
    const resultado = leer({ duenio: 'i2' }, PASTOR);

    expect('borrador' in resultado && resultado.borrador.duenio).toEqual({
      alcance: 'iglesia',
      iglesiaId: 'i2',
    });
  });

  it('never gives a duenio the cargos do not cover', () => {
    expect(leer({ duenio: 'i2' })).toEqual({ error: expect.stringContaining('dueño') });
    expect(leer({ duenio: 'd1' })).toEqual({ error: expect.stringContaining('dueño') });
  });

  it('asks for the enfasis when the mensaje does not say it', () => {
    expect(leer({ enfasis: null })).toEqual({
      error: expect.stringContaining('énfasis'),
      falta: 'enfasis',
    });
  });

  it('takes an actividad regular as an evento without enfasis', () => {
    const resultado = leer({ enfasis: 'actividad_regular' });

    expect('borrador' in resultado && resultado.borrador.enfasis).toBeNull();
  });

  it('rejects an evento of several days that repeats, with the rule of the form', () => {
    expect(leer({ fecha_fin: '2026-10-25', repeticion: 'semanal', hasta: '2026-12-26' })).toEqual({
      error: expect.stringContaining('Un evento que se repite no puede durar varios días.'),
    });
  });

  it('gives an evento of several days its fecha de fin', () => {
    const resultado = leer({ fecha_fin: '2026-10-25' });

    expect('borrador' in resultado && resultado.borrador.fechaFin).toBe('2026-10-25');
  });

  it('gives a series without "Hasta" the suggested one, a year after its first date', () => {
    const resultado = leer({ repeticion: 'semanal' });

    expect('borrador' in resultado && resultado.borrador).toMatchObject({
      repeticion: 'semanal',
      finDeSerie: '2027-10-24',
    });
  });

  it('rejects a "Hasta" more than a year after the first date', () => {
    expect(leer({ repeticion: 'mensual', hasta: '2027-10-25' })).toEqual({
      error: expect.stringContaining('"Hasta" puede ser, como máximo, el'),
    });
  });

  it('keeps the "Hasta" of a series only when it repeats', () => {
    const resultado = leer({ hasta: '2027-01-01' });

    expect('borrador' in resultado && resultado.borrador.finDeSerie).toBeNull();
  });

  it('rejects what the form rejects: no titulo, an impossible hora or fecha', () => {
    expect(leer({ titulo: '  ' })).toEqual({ error: expect.stringContaining('título') });
    expect(leer({ hora: '25:00' })).toEqual({ error: expect.stringContaining('hora') });
    expect(leer({ fecha: '2026-02-30' })).toEqual({ error: expect.stringContaining('fecha') });
  });

  it('keeps the lugar and the descripcion as written', () => {
    const resultado = leer({ lugar: ' Templo ', descripcion: 'Con cena' });

    expect('borrador' in resultado && resultado.borrador).toMatchObject({
      lugar: 'Templo',
      descripcion: 'Con cena',
    });
  });

  it('rejects arguments that are not an evento', () => {
    expect(leerPropuesta(null, { cargos: ENCARGADO, estructura: ESTRUCTURA }, HOY)).toEqual({
      error: expect.any(String),
    });
    expect(leer({ repeticion: 'diaria' })).toEqual({ error: expect.any(String) });
  });

  it('proposes nothing to a usuario whose cargos cover no duenio', () => {
    expect(leer({}, [])).toEqual({ error: expect.stringContaining('dueño') });
  });
});

describe('isBorrador', () => {
  const BORRADOR: BorradorDeEvento = {
    titulo: 'Culto joven',
    fecha: '2026-10-24',
    hora: '19:00:00',
    fechaFin: null,
    lugar: null,
    descripcion: null,
    enfasis: null,
    duenio: { alcance: 'distrito', distritoId: 'd1' },
    duenioNombre: 'Distrito Centro',
    repeticion: 'semanal',
    finDeSerie: '2027-10-24',
  };

  it('accepts a borrador as the server sends it', () => {
    expect(isBorrador(BORRADOR)).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isBorrador(null)).toBe(false);
    expect(isBorrador({ ...BORRADOR, titulo: 3 })).toBe(false);
    expect(isBorrador({ ...BORRADOR, enfasis: 'otro' })).toBe(false);
    expect(isBorrador({ ...BORRADOR, duenio: { alcance: 'iglesia' } })).toBe(false);
    expect(isBorrador({ ...BORRADOR, repeticion: 'diaria' })).toBe(false);
  });
});
