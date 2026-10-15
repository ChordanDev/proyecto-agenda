import type { EventoAGuardar } from '../dominio/formularioDeEvento';
import { guardarEvento } from './escribirEvento';

const mockRpc = jest.fn();

jest.mock('@/shared/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
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

beforeEach(() => {
  mockRpc.mockReset().mockResolvedValue({ data: 'e1', error: null });
});

describe('guardarEvento', () => {
  it('creates an evento with the id the app chose, the same on every try', async () => {
    await guardarEvento(EVENTO, { crear: 'n1' });
    await guardarEvento(EVENTO, { crear: 'n1' });

    for (const [, args] of mockRpc.mock.calls) {
      expect(args).toMatchObject({ nuevo_evento_id: 'n1', evento_id: undefined });
    }
  });

  it('edits an evento by its id', async () => {
    await expect(guardarEvento(EVENTO, { editar: 'e1' })).resolves.toBe('e1');

    expect(mockRpc).toHaveBeenCalledWith(
      'guardar_evento',
      expect.objectContaining({ evento_id: 'e1', nuevo_evento_id: undefined }),
    );
  });
});
