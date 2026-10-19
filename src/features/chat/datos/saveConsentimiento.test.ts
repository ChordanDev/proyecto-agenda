import { saveConsentimiento } from './saveConsentimiento';

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

describe('saveConsentimiento', () => {
  beforeEach(() => mockInsert.mockReset());

  it('saves only the usuario: the moment is the one of the database', async () => {
    mockInsert.mockResolvedValue({ error: null });

    await saveConsentimiento();

    expect(mockInsert).toHaveBeenCalledWith('chat_consentimientos', { usuario_id: 'usuario-1' });
  });

  it('counts a consentimiento already saved from another phone as saved', async () => {
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    await expect(saveConsentimiento()).resolves.toBeUndefined();
  });

  it('fails on any other error', async () => {
    mockInsert.mockResolvedValue({ error: { code: '08006', message: 'connection failure' } });

    await expect(saveConsentimiento()).rejects.toThrow('connection failure');
  });
});
