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
    iglesias: [
      { nombre: 'Iglesia Evals Central', direccion: 'x', localidad: 'y' },
      { nombre: 'Iglesia Evals Norte', direccion: 'x', localidad: 'y' },
    ],
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
        sumadas: [],
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

  it('shares an evento with the iglesias sumadas', () => {
    const [{ fila, sumadas }] = getEventosParaCargar(
      calendario([
        { ...EVENTO, duenio: 'Iglesia Evals Norte', sumadas: ['Iglesia Evals Central'] },
      ]),
      ANCLAJE,
    );

    expect(fila.duenio_iglesia_id).toBe(IDS.iglesia(1));
    expect(sumadas).toEqual([IDS.iglesia(0)]);
  });

  it('rejects an iglesia sumada that is not in the calendario', () => {
    expect(() =>
      getEventosParaCargar(calendario([{ ...EVENTO, sumadas: ['Otra iglesia'] }]), ANCLAJE),
    ).toThrow('Unknown iglesia in the calendario de prueba: Otra iglesia');
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

  it('finds the word coro only in the Ensayo del coro, as buscar_eventos matches part of a word', () => {
    const normalizar = (texto: string) =>
      texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
    const titulos = ARCHIVO.eventos
      .filter((evento) =>
        normalizar([evento.titulo, evento.lugar, evento.descripcion].join(' ')).includes('coro'),
      )
      .map((evento) => evento.titulo);

    expect(new Set(titulos)).toEqual(new Set(['Ensayo del coro']));
  });

  it('expects the shared evento to be said with its duenio, not just its lugar', () => {
    const caso = CASOS.find((candidato) => candidato.id === 'simple-compartido');
    const [titulo] = caso?.esperado.eventos ?? [];
    const evento = ARCHIVO.eventos.find((candidato) => candidato.titulo === titulo);
    const fragmentos = caso?.esperado.contiene ?? [];

    expect(evento?.sumadas).toEqual([ARCHIVO.encargadoDe]);
    expect(fragmentos).not.toEqual([]);
    for (const fragmento of fragmentos) {
      expect(evento?.duenio).toContain(fragmento);
      expect(evento?.lugar ?? '').not.toContain(fragmento);
    }
  });

  it('gives each caso its own id', () => {
    const ids = CASOS.map((caso) => caso.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
