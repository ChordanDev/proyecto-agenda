import { getFechasDelMes } from './getFechasDelMes';

let mockResults: { data: unknown[]; error: null }[];

// Each request of the month is a chain of filters awaited at its end.
jest.mock('@/shared/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => {
        const result = mockResults.shift();
        const query = {
          gte: () => query,
          lte: () => query,
          lt: () => query,
          or: () => query,
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
        };
        return query;
      },
    }),
  },
}));

const ROW = {
  fecha: '2026-10-17',
  eventos: {
    id: 'e1',
    titulo: 'Congreso de jóvenes',
    lugar: 'Templo central',
    descripcion: null,
    enfasis: 'nuevas_generaciones',
    alcance: 'distrito',
    duenio_iglesia_id: null,
    duenio_distrito_id: 'd1',
    duenio_asociacion_id: null,
    hora: '19:00:00',
    fecha_fin: null,
    repeticion: 'ninguna',
    fin_de_serie: null,
    iglesias_sumadas: [{ iglesia_id: 'i9' }],
    distritos: { nombre: 'Centro' },
  },
};

describe('getFechasDelMes', () => {
  it('turns each date read into a fecha with its evento and names its distrito', async () => {
    mockResults = [
      { data: [ROW], error: null },
      { data: [], error: null },
    ];

    expect(await getFechasDelMes(null, { year: 2026, month: 10 })).toEqual({
      fechas: [
        {
          fecha: '2026-10-17',
          evento: {
            id: 'e1',
            titulo: 'Congreso de jóvenes',
            lugar: 'Templo central',
            descripcion: null,
            enfasis: 'nuevas_generaciones',
            duenio: { alcance: 'distrito', distritoId: 'd1' },
            hora: '19:00:00',
            fechaFin: null,
            repeticion: 'ninguna',
            finDeSerie: null,
            iglesiasSumadas: ['i9'],
          },
        },
      ],
      nombresDeDistritos: { d1: 'Centro' },
    });
  });
});
