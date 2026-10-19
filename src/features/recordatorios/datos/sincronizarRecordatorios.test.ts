import { onlineManager, QueryClient } from '@tanstack/react-query';

import { guardarDispositivo, getDispositivo } from './dispositivo';
import { actualizarRecordatorios } from './sincronizarRecordatorios';

jest.mock('./telefono', () => ({
  getPermiso: jest.fn(async () => 'concedido'),
  getTokenDelTelefono: jest.fn(async () => 'ExponentPushToken[telefono]'),
}));
jest.mock('./dispositivo', () => ({
  getDispositivo: jest.fn(),
  guardarDispositivo: jest.fn(),
}));
jest.mock('@/features/iglesias/datos/iglesiaElegida', () => ({
  getIglesiaElegida: jest.fn(async () => 'i1'),
}));
jest.mock('@/features/calendario/datos/getIglesiasEnEstructura', () => ({
  getIglesiasEnEstructura: jest.fn(async () => [
    { id: 'i1', nombre: 'Iglesia 1', distritoId: 'd1', asociacionId: 'a1', distrito: 'D1' },
    { id: 'i2', nombre: 'Iglesia 2', distritoId: 'd1', asociacionId: 'a1', distrito: 'D1' },
  ]),
}));
jest.mock('@/features/sesion/datos/getCargosDelUsuario', () => ({
  getCargosDelUsuario: jest.fn(async () => []),
}));
// Signed out: there is no session.
jest.mock('@/features/sesion/datos/sesionQuery', () => ({
  sesionQueryOptions: { queryKey: ['sesion'], queryFn: async () => false },
}));

const mockedGetDispositivo = jest.mocked(getDispositivo);
const mockedGuardar = jest.mocked(guardarDispositivo);

// Without a garbage collection timer, the client does not keep Jest running.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
  // The phone of a pastor who has just signed out.
  mockedGetDispositivo.mockResolvedValue({
    encendido: false,
    iglesiaIds: ['i2'],
    conUsuario: true,
    delUsuario: false,
  });
});

describe('actualizarRecordatorios', () => {
  it('saves the phone back on the iglesia elegida once signed out', async () => {
    mockedGuardar.mockResolvedValue(undefined);

    await actualizarRecordatorios(newClient());

    expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', {
      encendido: true,
      iglesiaIds: ['i1'],
    });
  });

  it('saves the phone on, with the iglesia elegida, once the cuenta was deleted', async () => {
    // Deleting the usuario deleted the phones they saved.
    mockedGetDispositivo.mockResolvedValue(null);
    mockedGuardar.mockResolvedValue(undefined);

    await actualizarRecordatorios(newClient());

    expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', {
      encendido: true,
      iglesiaIds: ['i1'],
    });
  });

  it('tries again when the connection comes back, if saving failed', async () => {
    mockedGuardar.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);

    await actualizarRecordatorios(newClient());
    expect(mockedGuardar).toHaveBeenCalledTimes(1);

    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockedGuardar).toHaveBeenCalledTimes(2);
    expect(mockedGuardar).toHaveBeenLastCalledWith('ExponentPushToken[telefono]', {
      encendido: true,
      iglesiaIds: ['i1'],
    });
  });

  it('tries again only once, however many times the connection comes back', async () => {
    mockedGuardar.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);

    await actualizarRecordatorios(newClient());
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    // Saved now: the phone already has what it should.
    mockedGetDispositivo.mockResolvedValue({
      encendido: true,
      iglesiaIds: ['i1'],
      conUsuario: false,
      delUsuario: false,
    });
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockedGuardar).toHaveBeenCalledTimes(2);
  });
});
