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

  it('fails when the duenio of its alcance was not read', async () => {
    mockRow = { ...DISTRITO_ROW, distritos: null, asociaciones: { nombre: 'Asociación' } };

    await expect(getEvento('e1')).rejects.toThrow('Evento e1 has no duenio to name');
  });
});
