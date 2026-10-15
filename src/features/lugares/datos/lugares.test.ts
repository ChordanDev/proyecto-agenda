import { getLugaresDelDuenio, guardarLugar } from './lugares';

const mockRpc = jest.fn();
const mockSelect = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: {
    rpc: (name: string, args: unknown) => ({ single: () => mockRpc(name, args) }),
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: string) => mockSelect({ table, columns, eq: [column, value] }),
      }),
    }),
  },
}));

const TEMPLO_ROW = {
  id: 'l1',
  nombre: 'Templo',
  duenio_iglesia_id: null,
  duenio_distrito_id: 'd1',
  duenio_asociacion_id: null,
};

beforeEach(() => {
  mockRpc.mockReset();
  mockSelect.mockReset();
});

describe('getLugaresDelDuenio', () => {
  it('reads the lugares by the column of the alcance of the duenio', async () => {
    mockSelect.mockResolvedValue({ data: [TEMPLO_ROW], error: null });

    await expect(getLugaresDelDuenio({ alcance: 'distrito', distritoId: 'd1' })).resolves.toEqual([
      { id: 'l1', nombre: 'Templo', duenio: { alcance: 'distrito', distritoId: 'd1' } },
    ]);
    expect(mockSelect).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'lugares', eq: ['duenio_distrito_id', 'd1'] }),
    );
  });

  it('fails when they cannot be read', async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });

    await expect(getLugaresDelDuenio({ alcance: 'iglesia', iglesiaId: 'i1' })).rejects.toThrow(
      'Could not read the lugares: Failed to fetch',
    );
  });
});

describe('guardarLugar', () => {
  it('saves the lugar with the column of its duenio and gives it back', async () => {
    mockRpc.mockResolvedValue({ data: TEMPLO_ROW, error: null });

    await expect(
      guardarLugar('Templo', { alcance: 'distrito', distritoId: 'd1' }),
    ).resolves.toEqual({
      id: 'l1',
      nombre: 'Templo',
      duenio: { alcance: 'distrito', distritoId: 'd1' },
    });
    expect(mockRpc).toHaveBeenCalledWith('guardar_lugar', {
      nombre: 'Templo',
      duenio_iglesia_id: undefined,
      duenio_distrito_id: 'd1',
      duenio_asociacion_id: undefined,
    });
  });

  it('tells a lugar the cargos do not cover', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'rls' } });

    await expect(
      guardarLugar('Patio', { alcance: 'iglesia', iglesiaId: 'i2' }),
    ).rejects.toMatchObject({ tipo: 'sin-permiso' });
  });

  it('tells a save that never reached the server', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Network request failed' } });

    await expect(
      guardarLugar('Patio', { alcance: 'iglesia', iglesiaId: 'i1' }),
    ).rejects.toMatchObject({ tipo: 'sin-conexion' });
  });
});
