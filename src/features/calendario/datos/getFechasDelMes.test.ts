import { getFechasDelMes } from './getFechasDelMes';

type Request = 'insideTheMonth' | 'startedBefore';
type Page = { data: unknown[]; error: { message: string } | null };

/** The pages each request returns, in order. */
let mockPages: Record<Request, Page[]>;
/** The ranges and orders each request asked for, in order. */
let mockCalls: { request: Request; range: [number, number]; order: string[] }[];

// Each page is a chain of filters awaited at its end. A request is told apart
// by its `lt`, which only the eventos that started before the month use.
jest.mock('@/shared/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => {
        let request: Request = 'insideTheMonth';
        let range: [number, number] = [0, 0];
        const order: string[] = [];
        const query = {
          gte: () => query,
          lte: () => query,
          lt: () => {
            request = 'startedBefore';
            return query;
          },
          or: () => query,
          order: (column: string) => {
            order.push(column);
            return query;
          },
          range: (from: number, to: number) => {
            range = [from, to];
            return query;
          },
          then: (resolve: (value: unknown) => unknown) => {
            mockCalls.push({ request, range, order });
            return Promise.resolve(mockPages[request].shift()).then(resolve);
          },
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

const OCTOBER = { year: 2026, month: 10 };

function rows(count: number) {
  return Array.from({ length: count }, () => ROW);
}

beforeEach(() => {
  mockCalls = [];
});

describe('getFechasDelMes', () => {
  it('turns each date read into a fecha with its evento and names its distrito', async () => {
    mockPages = {
      insideTheMonth: [{ data: [ROW], error: null }],
      startedBefore: [{ data: [], error: null }],
    };

    expect(await getFechasDelMes(null, OCTOBER)).toEqual({
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

  it('reads every page of both requests until one comes back short', async () => {
    mockPages = {
      insideTheMonth: [
        { data: rows(1000), error: null },
        { data: rows(1000), error: null },
        { data: rows(3), error: null },
      ],
      startedBefore: [
        { data: rows(1000), error: null },
        { data: [], error: null },
      ],
    };

    const { fechas } = await getFechasDelMes('duenio_iglesia_id.in.(i1)', OCTOBER);

    expect(fechas).toHaveLength(3003);
    expect(mockCalls.filter((call) => call.request === 'insideTheMonth')).toEqual([
      { request: 'insideTheMonth', range: [0, 999], order: ['evento_id', 'fecha'] },
      { request: 'insideTheMonth', range: [1000, 1999], order: ['evento_id', 'fecha'] },
      { request: 'insideTheMonth', range: [2000, 2999], order: ['evento_id', 'fecha'] },
    ]);
    expect(mockCalls.filter((call) => call.request === 'startedBefore')).toEqual([
      { request: 'startedBefore', range: [0, 999], order: ['evento_id', 'fecha'] },
      { request: 'startedBefore', range: [1000, 1999], order: ['evento_id', 'fecha'] },
    ]);
  });

  it('fails when a later page cannot be read', async () => {
    mockPages = {
      insideTheMonth: [
        { data: rows(1000), error: null },
        { data: [], error: { message: 'timeout' } },
      ],
      startedBefore: [{ data: [], error: null }],
    };

    await expect(getFechasDelMes(null, OCTOBER)).rejects.toThrow(
      'Could not read the calendario: timeout',
    );
  });
});
