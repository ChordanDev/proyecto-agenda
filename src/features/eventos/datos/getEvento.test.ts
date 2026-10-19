import { getEvento } from './getEvento';

let mockRow: unknown;

jest.mock('@/shared/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: () => Promise.resolve({ data: mockRow, error: null }) }),
      }),
    }),
  },
}));

const DISTRITO_ROW = {
  id: 'e1',
  titulo: 'Congreso de jóvenes',
  lugar: null,
  lugar_id: null,
  lugares: null,
  descripcion: null,
  enfasis: null,
  alcance: 'distrito',
  duenio_iglesia_id: null,
  duenio_distrito_id: 'd1',
  duenio_asociacion_id: null,
  hora: '19:00:00',
  fecha_fin: null,
  repeticion: 'ninguna',
  fin_de_serie: null,
  iglesias_sumadas: [],
  eventos_fechas: [{ fecha: '2026-10-17' }],
  excepciones: [],
  iglesias: null,
  distritos: { nombre: 'Centro', asociacion_id: 'a1' },
  asociaciones: null,
};

describe('getEvento', () => {
  it('names the duenio by the join of its alcance', async () => {
    // A join that is not the one of the alcance never names the duenio.
    mockRow = {
      ...DISTRITO_ROW,
      iglesias: {
        nombre: 'Córdoba Central',
        distrito_id: 'd1',
        distritos: { asociacion_id: 'a1' },
      },
    };

    expect((await getEvento('e1'))?.nombreDelDuenio).toBe('Centro');
  });

  it('names the lugar of the list of the evento', async () => {
    mockRow = { ...DISTRITO_ROW, lugar_id: 'l1', lugares: { nombre: 'Templo' } };

    expect((await getEvento('e1'))?.evento).toMatchObject({ lugar: 'Templo', lugarId: 'l1' });
  });

  it('keeps the lugar an old evento has written by hand', async () => {
    mockRow = { ...DISTRITO_ROW, lugar: 'Salon jovenes' };

    expect((await getEvento('e1'))?.evento).toMatchObject({
      lugar: 'Salon jovenes',
      lugarId: null,
    });
  });

  it('reads the iglesias sumadas with their nombre and their place in the structure', async () => {
    mockRow = {
      ...DISTRITO_ROW,
      iglesias_sumadas: [
        {
          iglesia_id: 'i9',
          iglesias: { nombre: 'Norte', distrito_id: 'd2', distritos: { asociacion_id: 'a1' } },
        },
      ],
    };

    const detallado = await getEvento('e1');

    expect(detallado?.sumadas).toEqual([
      { id: 'i9', nombre: 'Norte', distritoId: 'd2', asociacionId: 'a1' },
    ]);
    expect(detallado?.evento.iglesiasSumadas).toEqual(['i9']);
  });

  it('fails when the duenio of its alcance was not read', async () => {
    mockRow = { ...DISTRITO_ROW, distritos: null, asociaciones: { nombre: 'Asociación' } };

    await expect(getEvento('e1')).rejects.toThrow('Evento e1 has no duenio to name');
  });

  it('shows the dates of a series as they are seen, and keeps the dates of the series', async () => {
    const excepcion = {
      fecha_nueva: null,
      titulo: null,
      hora: null,
      cambia_lugar: false,
      lugar: null,
      lugar_id: null,
      lugares: null,
      cambia_descripcion: false,
      descripcion: null,
      cambia_enfasis: false,
      enfasis: null,
      borrada: false,
    };
    mockRow = {
      ...DISTRITO_ROW,
      repeticion: 'semanal',
      fin_de_serie: '2026-11-07',
      // The date of 10-24 was deleted, so it has no row left.
      eventos_fechas: [{ fecha: '2026-10-31' }, { fecha: '2026-10-17' }, { fecha: '2026-11-07' }],
      excepciones: [
        { ...excepcion, fecha: '2026-10-24', borrada: true },
        { ...excepcion, fecha: '2026-10-31', fecha_nueva: '2026-11-01', titulo: 'Especial' },
      ],
    };

    const detallado = await getEvento('e1');

    expect(detallado?.fechas).toEqual(['2026-10-17', '2026-10-24', '2026-10-31', '2026-11-07']);
    expect(
      detallado?.vistas.map(({ fecha, fechaOriginal, evento, tieneCambios }) => [
        fecha,
        fechaOriginal,
        evento.titulo,
        tieneCambios,
      ]),
    ).toEqual([
      ['2026-10-17', '2026-10-17', 'Congreso de jóvenes', false],
      ['2026-11-01', '2026-10-31', 'Especial', true],
      ['2026-11-07', '2026-11-07', 'Congreso de jóvenes', false],
    ]);
    expect(detallado?.evento.titulo).toBe('Congreso de jóvenes');
    expect(detallado?.excepciones).toHaveLength(2);
  });
});
