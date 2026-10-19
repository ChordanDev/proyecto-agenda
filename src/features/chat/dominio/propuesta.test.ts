import type { BorradorDeEvento } from './borrador';
import {
  formularioDesdeBorrador,
  getEventoDelBorrador,
  getPreguntaDeHora,
  getTarjetaDePropuesta,
} from './propuesta';

const HOY = '2026-10-17';

function borrador(extra: Partial<BorradorDeEvento> = {}): BorradorDeEvento {
  return {
    titulo: 'Culto joven',
    fecha: '2026-10-24',
    hora: '19:00:00',
    fechaFin: null,
    lugar: 'Templo',
    descripcion: null,
    enfasis: 'nuevas_generaciones',
    duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
    duenioNombre: 'Iglesia Central',
    repeticion: 'ninguna',
    finDeSerie: null,
    ...extra,
  };
}

describe('formularioDesdeBorrador', () => {
  it('loads the form with the borrador, its lugar written by hand and no iglesia sumada', () => {
    expect(formularioDesdeBorrador(borrador({ descripcion: 'Con la banda' }))).toEqual({
      titulo: 'Culto joven',
      duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
      fecha: '2026-10-24',
      hora: '19:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      lugar: { tipo: 'escrito', nombre: 'Templo' },
      descripcion: 'Con la banda',
      categoria: 'I',
      iglesiasSumadas: [],
    });
  });

  it('leaves the lugar empty and takes the actividad regular when the borrador has neither', () => {
    const formulario = formularioDesdeBorrador(borrador({ lugar: null, enfasis: null }));

    expect(formulario.lugar).toBeNull();
    expect(formulario.categoria).toBe('R');
    expect(formulario.descripcion).toBe('');
  });
});

describe('getEventoDelBorrador', () => {
  it('gives the evento to save, with the lugar as text and no iglesias sumadas', () => {
    const resultado = getEventoDelBorrador(borrador(), HOY);

    expect(resultado).toEqual({
      ok: true,
      evento: expect.objectContaining({
        titulo: 'Culto joven',
        lugar: 'Templo',
        lugarId: null,
        enfasis: 'nuevas_generaciones',
        hora: '19:00:00',
        fechas: ['2026-10-24'],
        iglesiasSumadas: [],
      }),
    });
  });

  it('saves a series with every one of its dates', () => {
    const resultado = getEventoDelBorrador(
      borrador({ repeticion: 'semanal', finDeSerie: '2026-11-07' }),
      HOY,
    );

    expect(resultado.ok && resultado.evento.fechas).toEqual([
      '2026-10-24',
      '2026-10-31',
      '2026-11-07',
    ]);
  });

  it('tells the error of the form when a dato is no longer valid', () => {
    // The card stayed open until its "Hasta" passed.
    const resultado = getEventoDelBorrador(
      borrador({ fecha: '2026-10-10', repeticion: 'semanal', finDeSerie: '2026-10-15' }),
      HOY,
    );

    expect(resultado).toEqual({ ok: false, error: '"Hasta" no puede ser una fecha pasada.' });
  });
});

describe('getTarjetaDePropuesta', () => {
  it('draws an evento of one day with its enfasis, fecha, lugar and duenio', () => {
    expect(getTarjetaDePropuesta(borrador())).toEqual({
      categoria: 'I',
      lema: 'Integramos',
      enfasis: 'Nuevas Generaciones',
      titulo: 'Culto joven',
      cuando: 'Sábado 24 de octubre · 19:00',
      cuandoDetalle: 'No se repite',
      repeticion: null,
      lugar: 'Templo',
      duenio: 'Iglesia Central',
      seVe: 'Se ve en el calendario de esta iglesia',
    });
  });

  it('explains a series with words and its "Hasta"', () => {
    const tarjeta = getTarjetaDePropuesta(
      borrador({
        fecha: '2026-10-17',
        repeticion: 'mensual',
        finDeSerie: '2027-10-16',
        duenio: { alcance: 'distrito', distritoId: 'd1' },
        duenioNombre: 'Distrito Norte',
      }),
    );

    expect(tarjeta.cuandoDetalle).toBeNull();
    expect(tarjeta.repeticion).toEqual({
      como: 'El tercer sábado de cada mes',
      hasta: 'Hasta el 16 de octubre de 2027',
    });
    expect(tarjeta.duenio).toBe('Distrito Norte');
    expect(tarjeta.seVe).toBe('Se ve en todas las iglesias del distrito');
  });

  it('says until when an evento of several days lasts', () => {
    const tarjeta = getTarjetaDePropuesta(
      borrador({ fecha: '2026-11-06', fechaFin: '2026-11-08' }),
    );

    expect(tarjeta.cuando).toBe('Viernes 6 de noviembre · 19:00');
    expect(tarjeta.cuandoDetalle).toBe('Hasta el domingo 8 de noviembre · 3 días');
  });

  it('names the actividad regular alone and leaves out a missing lugar', () => {
    const tarjeta = getTarjetaDePropuesta(borrador({ enfasis: null, lugar: null }));

    expect(tarjeta.categoria).toBe('R');
    expect(tarjeta.enfasis).toBeNull();
    expect(tarjeta.lugar).toBeNull();
  });
});

describe('getPreguntaDeHora', () => {
  it('asks, as the form does, about a hora of the madrugada', () => {
    expect(getPreguntaDeHora(borrador({ hora: '03:00:00' }))).toBe(
      '¿Es a las 3:00 de la madrugada?',
    );
  });

  it('asks nothing about a hora from 06:00 on', () => {
    expect(getPreguntaDeHora(borrador({ hora: '06:00:00' }))).toBeNull();
    expect(getPreguntaDeHora(borrador())).toBeNull();
  });
});
