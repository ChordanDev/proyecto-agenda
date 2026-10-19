import { guardarDistrito } from './guardarDistrito';
import { guardarIglesia } from './guardarIglesia';

type Respuesta = { data: unknown; error: { code: string; message: string } | null };

const mockInsert = jest.fn();
const mockUpdate = jest.fn();
let mockInsertAnswer: Respuesta;
let mockUpdateAnswer: Respuesta;

// A builder like the one of supabase-js: each write answers once awaited.
jest.mock('@/shared/supabase', () => ({
  supabase: {
    from: (tabla: string) => ({
      insert: (fila: unknown) => {
        mockInsert(tabla, fila);
        return { select: () => ({ single: () => Promise.resolve(mockInsertAnswer) }) };
      },
      update: (fila: unknown) => {
        mockUpdate(tabla, fila);
        return {
          eq: (_columna: string, id: string) => ({
            select: () =>
              Promise.resolve({ ...mockUpdateAnswer, data: mockUpdateAnswer.data ?? [{ id }] }),
          }),
        };
      },
    }),
  },
}));

const DUPLICADO = { code: '23505', message: 'duplicate key value violates unique constraint' };

const IGLESIA = {
  nombre: 'Iglesia Juana Koslay',
  direccion: 'Av. Los Fresnos 1450',
  localidad: 'Juana Koslay',
  distritoId: 'd1',
};

beforeEach(() => {
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockInsertAnswer = { data: { id: 'nuevo' }, error: null };
  mockUpdateAnswer = { data: null, error: null };
});

describe('guardarDistrito', () => {
  it('creates a distrito with the id the app chose, the same on every try', async () => {
    await guardarDistrito('a1', { nombre: 'Distrito Oeste' }, { crear: 'nuevo' });
    await guardarDistrito('a1', { nombre: 'Distrito Oeste' }, { crear: 'nuevo' });

    expect(mockInsert).toHaveBeenCalledTimes(2);
    for (const [tabla, fila] of mockInsert.mock.calls) {
      expect(tabla).toBe('distritos');
      expect(fila).toEqual({ id: 'nuevo', asociacion_id: 'a1', nombre: 'Distrito Oeste' });
    }
  });

  it('saves what the form holds when an earlier try already created it', async () => {
    mockInsertAnswer = { data: null, error: DUPLICADO };

    const id = await guardarDistrito('a1', { nombre: 'Distrito Oeste' }, { crear: 'nuevo' });

    expect(id).toBe('nuevo');
    expect(mockUpdate).toHaveBeenCalledWith('distritos', { nombre: 'Distrito Oeste' });
  });

  it('fails when the earlier row cannot be edited', async () => {
    mockInsertAnswer = { data: null, error: DUPLICADO };
    mockUpdateAnswer = { data: [], error: null };

    await expect(
      guardarDistrito('a1', { nombre: 'Distrito Oeste' }, { crear: 'nuevo' }),
    ).rejects.toThrow();
  });

  it('renames a distrito without creating one', async () => {
    await guardarDistrito('a1', { nombre: 'Distrito Norte' }, { editar: 'd1' });

    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith('distritos', { nombre: 'Distrito Norte' });
  });
});

describe('guardarIglesia', () => {
  it('creates an iglesia with the id the app chose, the same on every try', async () => {
    await guardarIglesia(IGLESIA, { crear: 'nuevo' });
    await guardarIglesia(IGLESIA, { crear: 'nuevo' });

    expect(mockInsert).toHaveBeenCalledTimes(2);
    for (const [tabla, fila] of mockInsert.mock.calls) {
      expect(tabla).toBe('iglesias');
      expect(fila).toMatchObject({ id: 'nuevo', distrito_id: 'd1' });
    }
  });

  it('saves what the form holds when an earlier try already created it', async () => {
    mockInsertAnswer = { data: null, error: DUPLICADO };

    const id = await guardarIglesia(IGLESIA, { crear: 'nuevo' });

    expect(id).toBe('nuevo');
    expect(mockUpdate).toHaveBeenCalledWith('iglesias', {
      nombre: 'Iglesia Juana Koslay',
      direccion: 'Av. Los Fresnos 1450',
      localidad: 'Juana Koslay',
      distrito_id: 'd1',
    });
  });

  it('fails on any other error of the create', async () => {
    mockInsertAnswer = { data: null, error: { code: '42501', message: 'denied' } };

    await expect(guardarIglesia(IGLESIA, { crear: 'nuevo' })).rejects.toThrow();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
