import { getCargosDelUsuario } from './getCargosDelUsuario';

type CargoRow = {
  id: string;
  usuario_id: string;
  iglesia_id: string | null;
  distrito_id: string | null;
  asociacion_id: string | null;
};

let mockSessionUserId: string | null;
let mockRows: CargoRow[];
const mockFrom = jest.fn();

// The rows the database lets a pastor read: their own cargo, and the cargos of
// the encargados of their distrito, which the gestion needs to read.
jest.mock('@/shared/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({
          data: { session: mockSessionUserId ? { user: { id: mockSessionUserId } } : null },
          error: null,
        }),
    },
    from: (table: string) => {
      mockFrom(table);
      return {
        select: () => ({
          eq: (column: keyof CargoRow, value: string) =>
            Promise.resolve({ data: mockRows.filter((row) => row[column] === value), error: null }),
        }),
      };
    },
  },
}));

const PASTOR = 'u-pastor';

beforeEach(() => {
  mockFrom.mockClear();
  mockSessionUserId = PASTOR;
  mockRows = [
    { id: 'c1', usuario_id: PASTOR, iglesia_id: null, distrito_id: 'd1', asociacion_id: null },
    {
      id: 'c2',
      usuario_id: 'u-encargado',
      iglesia_id: 'i1',
      distrito_id: null,
      asociacion_id: null,
    },
    {
      id: 'c3',
      usuario_id: 'u-secretaria',
      iglesia_id: 'i2',
      distrito_id: null,
      asociacion_id: null,
    },
  ];
});

describe('getCargosDelUsuario', () => {
  it('returns only the cargos of the usuario of the session, not the ones they oversee', async () => {
    expect(await getCargosDelUsuario()).toEqual([{ nivel: 'distrito', distritoId: 'd1' }]);
  });

  it('returns no cargo and does not ask the database without a session', async () => {
    mockSessionUserId = null;

    expect(await getCargosDelUsuario()).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
