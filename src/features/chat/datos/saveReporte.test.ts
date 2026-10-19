import { saveReporte } from './saveReporte';

// The client of Supabase, under the control of each test. There is a session.
const mockInsert = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: {
    auth: {
      getSession: () =>
        Promise.resolve({ data: { session: { user: { id: 'usuario-1' } } }, error: null }),
    },
    from: (table: string) => ({ insert: (row: unknown) => mockInsert(table, row) }),
  },
}));

describe('saveReporte', () => {
  beforeEach(() => mockInsert.mockReset());

  it('saves who and why, with its id: never the texto, and the moment is the one of the database', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await saveReporte({ id: 'reporte-1', motivo: 'ofensiva' });

    expect(mockInsert).toHaveBeenCalledWith('chat_reportes', {
      id: 'reporte-1',
      usuario_id: 'usuario-1',
      motivo: 'ofensiva',
    });
  });

  it('counts a reporte already saved by a try before as saved', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    await expect(saveReporte({ id: 'reporte-1', motivo: 'otro' })).resolves.toBeUndefined();
  });

  it('fails on any other error', async () => {
    mockInsert.mockResolvedValue({ error: { code: '08006', message: 'connection failure' } });

    await expect(saveReporte({ id: 'reporte-1', motivo: 'otro' })).rejects.toThrow(
      'connection failure',
    );
  });
});
