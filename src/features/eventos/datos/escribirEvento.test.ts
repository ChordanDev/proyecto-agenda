import type { EventoAGuardar } from '../dominio/formularioDeEvento';
import {
  borrarEvento,
  borrarFecha,
  guardarEvento,
  guardarExcepcion,
  quitarEventoDeIglesia,
} from './escribirEvento';

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
  lugarId: null,
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

    await expect(guardarEvento(EVENTO, { editar: 'e1' })).rejects.toMatchObject({
      tipo: 'no-existe',
    });
    expect(mockReadEvento).toHaveBeenCalledWith({
      table: 'eventos',
      columns: 'id',
      eq: ['id', 'e1'],
    });
  });

  it('tells an evento the cargos do not cover', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue(STILL_THERE);

    await expect(guardarEvento(EVENTO, { editar: 'e1' })).rejects.toMatchObject({
      tipo: 'sin-permiso',
    });
  });

  it('keeps the cargos as the reason when the evento cannot be read again', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue({ data: null, error: { message: 'Failed to fetch' } });

    await expect(guardarEvento(EVENTO, { editar: 'e1' })).rejects.toMatchObject({
      tipo: 'sin-permiso',
    });
  });

  it('does not read the evento again for a row the policy rejects', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'rls' } });

    await expect(guardarEvento(EVENTO, { editar: 'e1' })).rejects.toMatchObject({
      tipo: 'sin-permiso',
    });
    expect(mockReadEvento).not.toHaveBeenCalled();
  });

  it('reads its own id again when a create sent again is rejected', async () => {
    // The first try created it; meanwhile its duenio moved out of the cargos.
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue(STILL_THERE);

    await expect(guardarEvento(EVENTO, { crear: 'n1' })).rejects.toMatchObject({
      tipo: 'sin-permiso',
    });
    expect(mockReadEvento).toHaveBeenCalledWith({
      table: 'eventos',
      columns: 'id',
      eq: ['id', 'n1'],
    });
  });

  it('returns the id of the evento saved', async () => {
    mockRpc.mockResolvedValue({ data: 'e1', error: null });

    await expect(guardarEvento(EVENTO, { editar: 'e1' })).resolves.toBe('e1');
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

describe('quitarEventoDeIglesia', () => {
  it('quita the evento from the calendario of the iglesia', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await expect(quitarEventoDeIglesia('e1', 'i3')).resolves.toBeUndefined();
    expect(mockRpc).toHaveBeenCalledWith('quitar_evento_de_iglesia', {
      evento_id: 'e1',
      iglesia_id: 'i3',
    });
  });

  it('tells an iglesia the cargos do not cover', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'The cargos of the usuario do not cover the iglesia i3' },
    });

    await expect(quitarEventoDeIglesia('e1', 'i3')).rejects.toMatchObject({ tipo: 'sin-permiso' });
    expect(mockReadEvento).not.toHaveBeenCalled();
  });
});

describe('guardarExcepcion', () => {
  it('sends only the fields that changed', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await guardarExcepcion('e1', {
      fecha: '2026-10-17',
      fechaNueva: null,
      cambios: { hora: '20:30:00' },
    });

    expect(mockRpc).toHaveBeenCalledWith('guardar_excepcion', {
      evento_id: 'e1',
      fecha: '2026-10-17',
      hora: '20:30:00',
    });
  });

  it('flags the fields emptied, and sends a lugar of the list by its id', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await guardarExcepcion('e1', {
      fecha: '2026-10-17',
      fechaNueva: '2026-10-18',
      cambios: { lugar: 'Salón', lugarId: 'l2', descripcion: null, enfasis: null },
    });

    expect(mockRpc).toHaveBeenCalledWith('guardar_excepcion', {
      evento_id: 'e1',
      fecha: '2026-10-17',
      fecha_nueva: '2026-10-18',
      cambia_lugar: true,
      lugar_id: 'l2',
      cambia_descripcion: true,
      cambia_enfasis: true,
    });
  });

  it('sends a lugar written by hand as text', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await guardarExcepcion('e1', {
      fecha: '2026-10-17',
      fechaNueva: null,
      cambios: { lugar: 'Plaza', lugarId: null },
    });

    expect(mockRpc).toHaveBeenCalledWith('guardar_excepcion', {
      evento_id: 'e1',
      fecha: '2026-10-17',
      cambia_lugar: true,
      lugar: 'Plaza',
    });
  });

  it('tells a date that changed meanwhile', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'deleted' } });

    await expect(
      guardarExcepcion('e1', { fecha: '2026-10-17', fechaNueva: null, cambios: { titulo: 'X' } }),
    ).rejects.toMatchObject({ tipo: 'fecha-cambiada' });
  });
});

describe('borrarFecha', () => {
  it('deletes a single date of the series', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    await borrarFecha('e1', '2026-10-17');

    expect(mockRpc).toHaveBeenCalledWith('borrar_fecha', { evento_id: 'e1', fecha: '2026-10-17' });
  });

  it('takes a series deleted meanwhile as done', async () => {
    mockRpc.mockResolvedValue({ data: null, error: NO_VISIBLE });
    mockReadEvento.mockResolvedValue(GONE);

    await expect(borrarFecha('e1', '2026-10-17')).resolves.toBeUndefined();
  });
});
