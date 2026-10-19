import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getEventosParaCargar,
  IDS,
  type CalendarioDePrueba,
  type EventoDePrueba,
} from './calendario.ts';
import { CASOS } from './casos.ts';

const ANCLAJE = '2026-10-24';

const ARCHIVO: CalendarioDePrueba = JSON.parse(
  readFileSync(join(__dirname, 'calendario-de-prueba.json'), 'utf8'),
);

function calendario(eventos: EventoDePrueba[]): CalendarioDePrueba {
  return {
    asociacion: 'Asociación Evals',
    zonaHoraria: 'America/Argentina/Buenos_Aires',
    distrito: 'Distrito Evals',
    iglesias: [{ nombre: 'Iglesia Evals Central', direccion: 'x', ciudad: 'y', provincia: 'z' }],
    encargadoDe: 'Iglesia Evals Central',
    eventos,
  };
}

const EVENTO: EventoDePrueba = {
  titulo: 'Culto joven',
  duenio: 'Iglesia Evals Central',
  dia: 0,
  hora: '19:00',
  lugar: null,
  descripcion: null,
  enfasis: null,
};

describe('getEventosParaCargar', () => {
  it('puts a single evento on its dia', () => {
    expect(getEventosParaCargar(calendario([EVENTO]), ANCLAJE)).toEqual([
      {
        fila: {
          titulo: 'Culto joven',
          lugar: null,
          descripcion: null,
          enfasis: null,
          alcance: 'iglesia',
          duenio_iglesia_id: IDS.iglesia(0),
          duenio_distrito_id: null,
          duenio_asociacion_id: null,
          hora: '19:00',
          fecha_fin: null,
          repeticion: 'ninguna',
          fin_de_serie: null,
        },
        fechas: ['2026-10-24'],
      },
    ]);
  });

  it('keeps one fecha for an evento of several days, with its fecha_fin', () => {
    const [{ fila, fechas }] = getEventosParaCargar(
      calendario([{ ...EVENTO, dia: 14, diaFin: 16 }]),
      ANCLAJE,
    );

    expect(fila.fecha_fin).toBe('2026-11-09');
    expect(fechas).toEqual(['2026-11-07']);
  });

  it('repeats a series every week until its dia, included', () => {
    const [{ fila, fechas }] = getEventosParaCargar(
      calendario([{ ...EVENTO, dia: 1, semanalHasta: 15 }]),
      ANCLAJE,
    );

    expect(fila).toMatchObject({ repeticion: 'semanal', fin_de_serie: '2026-11-08' });
    expect(fechas).toEqual(['2026-10-25', '2026-11-01', '2026-11-08']);
  });

  it('gives the distrito and the asociacion their alcance', () => {
    const [distrito, asociacion] = getEventosParaCargar(
      calendario([
        { ...EVENTO, duenio: 'Distrito Evals' },
        { ...EVENTO, duenio: 'Asociación Evals' },
      ]),
      ANCLAJE,
    );

    expect(distrito.fila).toMatchObject({
      alcance: 'distrito',
      duenio_distrito_id: IDS.distrito,
      duenio_iglesia_id: null,
    });
    expect(asociacion.fila).toMatchObject({
      alcance: 'asociacion',
      duenio_asociacion_id: IDS.asociacion,
      duenio_iglesia_id: null,
    });
  });

  it('rejects a duenio that is not in the calendario', () => {
    expect(() =>
      getEventosParaCargar(calendario([{ ...EVENTO, duenio: 'Otra iglesia' }]), ANCLAJE),
    ).toThrow('Unknown duenio in the calendario de prueba: Otra iglesia');
  });
});

describe('the versioned calendario de prueba and its casos', () => {
  it('loads every evento of the file', () => {
    expect(getEventosParaCargar(ARCHIVO, ANCLAJE)).toHaveLength(ARCHIVO.eventos.length);
  });

  it('expects only eventos the file has', () => {
    const titulos = new Set(ARCHIVO.eventos.map((evento) => evento.titulo));
    const desconocidos = CASOS.flatMap((caso) => caso.esperado.eventos ?? []).filter(
      (titulo) => !titulos.has(titulo),
    );

    expect(desconocidos).toEqual([]);
  });

  it('gives each caso its own id', () => {
    const ids = CASOS.map((caso) => caso.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
