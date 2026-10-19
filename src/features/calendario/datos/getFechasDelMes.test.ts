import { getFechasDelMes } from './getFechasDelMes';

type Request = 'insideTheMonth' | 'startedBefore' | 'movedIn';
type Page = { data: unknown[]; error: { message: string } | null };

/** The pages each request returns, in order. */
let mockPages: Partial<Record<Request, Page[]>>;
/** The filters, ranges and orders each page asked for, in order. */
let mockCalls: {
  request: Request;
  filters: string[];
  range: [number, number];
  order: string[];
}[];

// Each page is a chain of filters awaited at its end. A request is told apart
// by its table (the dates moved into the month are read from the excepciones)
// or by its `lt`, which only the eventos that started before the month use. A
// request with no pages given reads none.
jest.mock('@/shared/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => {
        let request: Request = table === 'excepciones' ? 'movedIn' : 'insideTheMonth';
        let range: [number, number] = [0, 0];
        const filters: string[] = [];
        const order: string[] = [];
        const filter = (name: string) => (column: string, value: unknown) => {
          filters.push(`${name} ${column} ${JSON.stringify(value)}`);
          return query;
        };
        const query = {
          gte: filter('gte'),
          lte: filter('lte'),
          lt: (column: string, value: unknown) => {
            request = 'startedBefore';
            return filter('lt')(column, value);
          },
          or: filter('or'),
          order: (column: string) => {
            order.push(column);
            return query;
          },
          range: (from: number, to: number) => {
            range = [from, to];
            return query;
          },
          then: (resolve: (value: unknown) => unknown) => {
            mockCalls.push({ request, filters, range, order });
            const page = mockPages[request]?.shift() ?? { data: [], error: null };
            return Promise.resolve(page).then(resolve);
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
    iglesias_sumadas: [
      { iglesia_id: 'i9', iglesias: { distrito_id: 'd2', distritos: { asociacion_id: 'a1' } } },
    ],
    iglesias: null,
    distritos: { nombre: 'Centro' },
    excepciones: [],
  },
};

/** The columns of an excepcion that changes nothing yet. */
const EXCEPCION = {
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

/** A weekly series: the row of its date of 10-17. */
const SERIE_ROW = {
  ...ROW,
  eventos: { ...ROW.eventos, repeticion: 'semanal', fin_de_serie: '2026-12-26' },
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
      nombresDeIglesias: {},
      sumadas: { i9: { id: 'i9', distritoId: 'd2', asociacionId: 'a1' } },
    });
  });

  it('names the iglesia that owns an evento', async () => {
    const deIglesia = {
      ...ROW,
      eventos: {
        ...ROW.eventos,
        alcance: 'iglesia',
        duenio_iglesia_id: 'i1',
        duenio_distrito_id: null,
        iglesias: { nombre: 'Central' },
        distritos: null,
      },
    };
    mockPages = {
      insideTheMonth: [{ data: [deIglesia], error: null }],
      startedBefore: [{ data: [], error: null }],
    };

    expect(await getFechasDelMes(null, OCTOBER)).toMatchObject({
      nombresDeDistritos: {},
      nombresDeIglesias: { i1: 'Central' },
    });
  });

  it('reads every page of both requests, with its filters, until one comes back short', async () => {
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

    const insideTheMonth = [
      'or duenio_iglesia_id.in.(i1) {"referencedTable":"eventos"}',
      'gte fecha "2026-10-01"',
      'lte fecha "2026-10-31"',
    ];
    const startedBefore = [
      'or duenio_iglesia_id.in.(i1) {"referencedTable":"eventos"}',
      'lt fecha "2026-10-01"',
      'gte eventos.fecha_fin "2026-10-01"',
    ];
    const order = ['evento_id', 'fecha'];

    expect(fechas).toHaveLength(3003);
    expect(mockCalls.filter((call) => call.request === 'insideTheMonth')).toEqual([
      { request: 'insideTheMonth', filters: insideTheMonth, range: [0, 999], order },
      { request: 'insideTheMonth', filters: insideTheMonth, range: [1000, 1999], order },
      { request: 'insideTheMonth', filters: insideTheMonth, range: [2000, 2999], order },
    ]);
    expect(mockCalls.filter((call) => call.request === 'startedBefore')).toEqual([
      { request: 'startedBefore', filters: startedBefore, range: [0, 999], order },
      { request: 'startedBefore', filters: startedBefore, range: [1000, 1999], order },
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

  it('combines a date with what it changed and keeps it on its day', async () => {
    const horaPropia = {
      ...SERIE_ROW,
      eventos: {
        ...SERIE_ROW.eventos,
        excepciones: [{ ...EXCEPCION, fecha: '2026-10-17', hora: '20:30:00' }],
      },
    };
    mockPages = { insideTheMonth: [{ data: [horaPropia], error: null }] };

    const { fechas } = await getFechasDelMes(null, OCTOBER);

    expect(fechas).toHaveLength(1);
    expect(fechas[0]).toMatchObject({
      fecha: '2026-10-17',
      evento: { titulo: 'Congreso de jóvenes', hora: '20:30:00' },
    });
  });

  it('shows a moved date on its new day and not on the original one', async () => {
    const movida = { ...EXCEPCION, fecha: '2026-10-17', fecha_nueva: '2026-10-18' };
    // The date of 10-17 is read in the month, and its excepcion moved it.
    const original = {
      ...SERIE_ROW,
      eventos: { ...SERIE_ROW.eventos, excepciones: [movida] },
    };
    mockPages = {
      insideTheMonth: [{ data: [original], error: null }],
      movedIn: [{ data: [{ ...movida, eventos: SERIE_ROW.eventos }], error: null }],
    };

    const { fechas } = await getFechasDelMes('duenio_distrito_id.in.(d1)', OCTOBER);

    expect(fechas.map(({ fecha }) => fecha)).toEqual(['2026-10-18']);
    expect(mockCalls.filter((call) => call.request === 'movedIn')).toEqual([
      {
        request: 'movedIn',
        filters: [
          'or duenio_distrito_id.in.(d1) {"referencedTable":"eventos"}',
          'gte fecha_nueva "2026-10-01"',
          'lte fecha_nueva "2026-10-31"',
        ],
        range: [0, 999],
        order: ['evento_id', 'fecha'],
      },
    ]);
  });

  it('leaves out a date moved to another month', async () => {
    const original = {
      ...SERIE_ROW,
      eventos: {
        ...SERIE_ROW.eventos,
        excepciones: [{ ...EXCEPCION, fecha: '2026-10-17', fecha_nueva: '2026-11-02' }],
      },
    };
    mockPages = { insideTheMonth: [{ data: [original], error: null }] };

    expect((await getFechasDelMes(null, OCTOBER)).fechas).toEqual([]);
  });

  it('takes what a date moved into the month changed', async () => {
    const movida = {
      ...EXCEPCION,
      fecha: '2026-09-26',
      fecha_nueva: '2026-10-03',
      cambia_lugar: true,
      lugar_id: 'l2',
      lugares: { nombre: 'Salón' },
    };
    mockPages = {
      movedIn: [{ data: [{ ...movida, eventos: SERIE_ROW.eventos }], error: null }],
    };

    const { fechas } = await getFechasDelMes(null, OCTOBER);

    expect(fechas).toHaveLength(1);
    expect(fechas[0]).toMatchObject({
      fecha: '2026-10-03',
      evento: { lugar: 'Salón', lugarId: 'l2', hora: '19:00:00' },
    });
  });
});
