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

  it('fails when the duenio of its alcance was not read', async () => {
    mockRow = { ...DISTRITO_ROW, distritos: null, asociaciones: { nombre: 'Asociación' } };

    await expect(getEvento('e1')).rejects.toThrow('Evento e1 has no duenio to name');
  });
});
