import type { EventoAGuardar } from '../dominio/formularioDeEvento';
import { borrarEvento, guardarEvento } from './escribirEvento';

const mockRpc = jest.fn();
const mockReadEvento = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    // The read again records what it asks for, so a test can pin it.
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => ({
          maybeSingle: () => mockReadEvento({ table, columns, eq: [column, value] }),
        }),
      }),
    }),
  },
}));

const EVENTO: EventoAGuardar = {
  titulo: 'Culto joven',
  lugar: null,
  descripcion: null,
  enfasis: null,
  duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
  hora: '19:00',
  fechaFin: null,
  repeticion: 'ninguna',
  finDeSerie: null,
  fechas: ['2026-10-17'],
};

const NO_VISIBLE = { code: 'P0002', message: 'There is no evento e1 the usuario can edit' };
const GONE = { data: null, error: null };
const STILL_THERE = { data: { id: 'e1' }, error: null };

beforeEach(() => {
  mockRpc.mockReset();
  mockReadEvento.mockReset();
});

describe('guardarEvento', () => {
  it('tells an evento deleted while it was edited', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue(GONE);

    await expect(guardarEvento(EVENTO, 'e1')).rejects.toMatchObject({ tipo: 'no-existe' });
    expect(mockReadEvento).toHaveBeenCalledWith({
      table: 'eventos',
      columns: 'id',
      eq: ['id', 'e1'],
    });
  });

  it('tells an evento the cargos do not cover', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue(STILL_THERE);

    await expect(guardarEvento(EVENTO, 'e1')).rejects.toMatchObject({ tipo: 'sin-permiso' });
  });

  it('keeps the cargos as the reason when the evento cannot be read again', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });

    await expect(guardarEvento(EVENTO, 'e1')).rejects.toMatchObject({ tipo: 'sin-permiso' });
  });

  it('does not read the evento again for a row the policy rejects', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'rls' } });

    await expect(guardarEvento(EVENTO, 'e1')).rejects.toMatchObject({ tipo: 'sin-permiso' });
    expect(mockReadEvento).not.toHaveBeenCalled();
  });

  it('returns the id of the evento saved', async () => {
    mockRpc.mockResolvedValue({ data: 'e1', error: null });

    await expect(guardarEvento(EVENTO, 'e1')).resolves.toBe('e1');
  });
});

describe('borrarEvento', () => {
  it('takes an evento already deleted as deleted', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue(GONE);

    await expect(borrarEvento('e1')).resolves.toBeUndefined();
  });

  it('tells an evento the cargos do not cover', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue(STILL_THERE);

    await expect(borrarEvento('e1')).rejects.toMatchObject({ tipo: 'sin-permiso' });
  });
});
