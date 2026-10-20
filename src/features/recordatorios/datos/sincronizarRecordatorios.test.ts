import { onlineManager, QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { getCargosDelUsuario } from '@/features/sesion/datos/getCargosDelUsuario';

import { elegirIglesias, type RegistroGuardado } from '../dominio/recordatorios';
import { guardarDispositivo, getDispositivo } from './dispositivo';
import { actualizarRecordatorios, RETRY_DELAYS_MS } from './actualizarRecordatorios';
import { sincronizarRecordatorios } from './sincronizarRecordatorios';
import { getTokenDelTelefono } from './telefono';

jest.mock('./telefono', () => ({
  getPermiso: jest.fn(async () => 'concedido'),
  getTokenDelTelefono: jest.fn(async () => 'ExponentPushToken[telefono]'),
}));
// Only for the real getTokenDelTelefono, which a test borrows.
jest.mock('expo-notifications', () => ({ getExpoPushTokenAsync: jest.fn() }));
jest.mock('expo-constants', () => ({ easConfig: { projectId: 'proyecto' } }));
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
    { id: 'i3', nombre: 'Iglesia 3', distritoId: 'd2', asociacionId: 'a1', distrito: 'D2' },
  ]),
}));
jest.mock('@/features/sesion/datos/getCargosDelUsuario', () => ({
  getCargosDelUsuario: jest.fn(async () => []),
}));
// Whether there is a session, under the control of each test.
const mockHasSesion = { current: false };
jest.mock('@/features/sesion/datos/sesionQuery', () => ({
  sesionQueryOptions: { queryKey: ['sesion'], queryFn: async () => mockHasSesion.current },
}));

const mockedGetDispositivo = jest.mocked(getDispositivo);
const mockedGuardar = jest.mocked(guardarDispositivo);
const mockedGetCargos = jest.mocked(getCargosDelUsuario);
const mockedGetToken = jest.mocked(getTokenDelTelefono);

// Without a garbage collection timer, the client does not keep Jest running.
const newClient = () => new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });

beforeEach(() => {
  jest.clearAllMocks();
  onlineManager.setOnline(true);
  // Signed out: there is no session.
  mockHasSesion.current = false;
  mockedGetCargos.mockResolvedValue([]);
  mockedGuardar.mockResolvedValue(undefined);
  // The phone of a pastor who has just signed out.
  mockedGetDispositivo.mockResolvedValue({
    encendido: false,
    iglesiaIds: ['i2'],
    conUsuario: true,
    delUsuario: false,
  });
});

/** What saving the phone throws when the request never reached the server. */
const sinConexion = () => new Error('Could not save the phone: TypeError: Network request failed');

/** Signs in a usuario with these cargos. */
function signIn(cargos: Awaited<ReturnType<typeof getCargosDelUsuario>>) {
  mockHasSesion.current = true;
  mockedGetCargos.mockResolvedValue(cargos);
}

describe('sincronizarRecordatorios', () => {
  it('applies the change to the registro and saves it', async () => {
    // The phone of a hermano, on.
    mockedGetDispositivo.mockResolvedValue({
      encendido: true,
      iglesiaIds: ['i1'],
      conUsuario: false,
      delUsuario: false,
    });

    const estado = await sincronizarRecordatorios(newClient(), (actual) => ({
      ...actual,
      encendido: false,
    }));

    expect(estado.registro).toEqual({ encendido: false, iglesiaIds: ['i1'] });
    expect(mockedGuardar).toHaveBeenCalledTimes(1);
    expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', {
      encendido: false,
      iglesiaIds: ['i1'],
    });
  });

  it('saves the iglesias a pastor chose', async () => {
    signIn([{ nivel: 'distrito', distritoId: 'd1' }]);
    // A pastor starts with none chosen.
    mockedGetDispositivo.mockResolvedValue({
      encendido: false,
      iglesiaIds: [],
      conUsuario: true,
      delUsuario: true,
    });

    const estado = await sincronizarRecordatorios(newClient(), () => elegirIglesias(['i2']));

    expect(estado.registro).toEqual({ encendido: true, iglesiaIds: ['i2'] });
    expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', {
      encendido: true,
      iglesiaIds: ['i2'],
    });
  });

  it('does not save when the phone already has the registro and is of whoever uses it', async () => {
    mockedGetDispositivo.mockResolvedValue({
      encendido: true,
      iglesiaIds: ['i1'],
      conUsuario: false,
      delUsuario: false,
    });

    const estado = await sincronizarRecordatorios(newClient());

    expect(estado.registro).toEqual({ encendido: true, iglesiaIds: ['i1'] });
    expect(mockedGuardar).not.toHaveBeenCalled();
  });

  it('saves the same registro again when another usuario saved it', async () => {
    // An encargado of i1 signs in on a phone another usuario saved on i1.
    signIn([{ nivel: 'iglesia', iglesiaId: 'i1' }]);
    mockedGetDispositivo.mockResolvedValue({
      encendido: true,
      iglesiaIds: ['i1'],
      conUsuario: true,
      delUsuario: false,
    });

    await sincronizarRecordatorios(newClient());

    expect(mockedGuardar).toHaveBeenCalledTimes(1);
    expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', {
      encendido: true,
      iglesiaIds: ['i1'],
    });
  });

  it('offers a pastor the iglesias of their distrito, without a buscador', async () => {
    signIn([{ nivel: 'distrito', distritoId: 'd1' }]);
    mockedGetDispositivo.mockResolvedValue(null);

    const estado = await sincronizarRecordatorios(newClient());

    expect(estado.modo).toBe('eligiendo');
    expect(estado.opciones).toEqual(['i1', 'i2']);
    expect(estado.conBuscador).toBe(false);
  });

  it('offers an admin every iglesia of the asociacion, with a buscador', async () => {
    signIn([{ nivel: 'asociacion', asociacionId: 'a1' }]);
    mockedGetDispositivo.mockResolvedValue(null);

    const estado = await sincronizarRecordatorios(newClient());

    expect(estado.modo).toBe('eligiendo');
    expect(estado.opciones).toEqual(['i1', 'i2', 'i3']);
    expect(estado.conBuscador).toBe(true);
  });

  it('lets the sync of a sign-out win over one that started before it', async () => {
    const queryClient = newClient();
    signIn([{ nivel: 'distrito', distritoId: 'd1' }]);
    // What the server holds for this phone: a pastor's, with none chosen yet.
    let enServidor: RegistroGuardado | null = {
      encendido: false,
      iglesiaIds: [],
      conUsuario: true,
      delUsuario: true,
    };
    mockedGetDispositivo.mockImplementation(async () => enServidor);
    // The pastor's save is slow to reach the server; the next one is not.
    let releasePastor!: () => void;
    const pastorReleased = new Promise<void>((resolve) => {
      releasePastor = resolve;
    });
    mockedGuardar
      .mockImplementationOnce(async (_token, registro) => {
        await pastorReleased;
        enServidor = { ...registro, conUsuario: true, delUsuario: true };
      })
      .mockImplementation(async (_token, registro) => {
        enServidor = { ...registro, conUsuario: false, delUsuario: false };
      });

    const delPastor = sincronizarRecordatorios(queryClient, () => elegirIglesias(['i2']));
    while (mockedGuardar.mock.calls.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    // The pastor signs out while their save is on its way.
    mockHasSesion.current = false;
    queryClient.setQueryData(['sesion'], false);
    const delCierre = actualizarRecordatorios(queryClient);
    await new Promise((resolve) => setTimeout(resolve, 0));
    releasePastor();
    await Promise.all([delPastor, delCierre]);

    expect(enServidor).toEqual({
      encendido: true,
      iglesiaIds: ['i1'],
      conUsuario: false,
      delUsuario: false,
    });
  });

  it('does not let a phone that never gives its token block the next sync', async () => {
    jest.useFakeTimers();
    const queryClient = newClient();
    // The phone never answers the first time it is asked for its token.
    jest.mocked(Notifications.getExpoPushTokenAsync).mockReturnValueOnce(new Promise(() => {}));
    const { getTokenDelTelefono: realGetToken, TOKEN_TIMEOUT_MS } =
      jest.requireActual<typeof import('./telefono')>('./telefono');
    mockedGetToken.mockImplementationOnce(realGetToken);

    try {
      const colgada = sincronizarRecordatorios(queryClient);
      const siguiente = sincronizarRecordatorios(queryClient);
      const fallo = expect(colgada).rejects.toThrow('Network request failed');
      // The clock starts once the sync asks the phone for its token. A sync
      // that never gets there fails here instead of hanging the run.
      const pedidos = jest.mocked(Notifications.getExpoPushTokenAsync).mock.calls;
      for (let vuelta = 0; vuelta < 100 && pedidos.length === 0; vuelta++) {
        await Promise.resolve();
      }
      expect(pedidos).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(TOKEN_TIMEOUT_MS);

      await fallo;
      // The queries of the next sync notify through timers too.
      await jest.runAllTimersAsync();
      await expect(siguiente).resolves.toMatchObject({ modo: 'iglesia-elegida' });
      // Only the next sync had a token to save the phone with.
      expect(mockedGuardar).toHaveBeenCalledTimes(1);
      expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', expect.anything());
    } finally {
      jest.useRealTimers();
    }
  });

  it('applies a change asked for under the session there still is', async () => {
    const queryClient = newClient();
    signIn([{ nivel: 'distrito', distritoId: 'd1' }]);
    queryClient.setQueryData(['sesion'], true);
    mockedGetDispositivo.mockResolvedValue({
      encendido: false,
      iglesiaIds: [],
      conUsuario: true,
      delUsuario: true,
    });

    const estado = await sincronizarRecordatorios(queryClient, () => elegirIglesias(['i2']));

    expect(estado.registro).toEqual({ encendido: true, iglesiaIds: ['i2'] });
    expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', {
      encendido: true,
      iglesiaIds: ['i2'],
    });
  });

  it('drops a change asked for under a session that is gone by the time it runs', async () => {
    const queryClient = newClient();
    signIn([{ nivel: 'distrito', distritoId: 'd1' }]);
    queryClient.setQueryData(['sesion'], true);
    // What the server holds for this phone: the pastor's, on i2.
    let enServidor: RegistroGuardado | null = {
      encendido: true,
      iglesiaIds: ['i2'],
      conUsuario: true,
      delUsuario: true,
    };
    mockedGetDispositivo.mockImplementation(async () => enServidor);
    mockedGuardar.mockImplementation(async (_token, registro) => {
      const conUsuario = mockHasSesion.current;
      enServidor = { ...registro, conUsuario, delUsuario: conUsuario };
    });
    // An earlier sync stays on its way while the pastor taps the switch.
    let releaseToken!: () => void;
    const tokenReleased = new Promise<void>((resolve) => {
      releaseToken = resolve;
    });
    mockedGetToken.mockImplementationOnce(async () => {
      await tokenReleased;
      return 'ExponentPushToken[telefono]';
    });

    const anterior = sincronizarRecordatorios(queryClient);
    const delInterruptor = sincronizarRecordatorios(queryClient, (actual) => ({
      ...actual,
      encendido: !actual.encendido,
    }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    // The pastor signs out before the switch is applied.
    mockHasSesion.current = false;
    queryClient.setQueryData(['sesion'], false);
    const delCierre = actualizarRecordatorios(queryClient);
    releaseToken();
    await Promise.all([anterior, delInterruptor, delCierre]);

    expect(enServidor).toEqual({
      encendido: true,
      iglesiaIds: ['i1'],
      conUsuario: false,
      delUsuario: false,
    });
  });

  it('offers a hermano nothing to choose', async () => {
    mockedGetDispositivo.mockResolvedValue(null);

    const estado = await sincronizarRecordatorios(newClient());

    expect(estado.modo).toBe('iglesia-elegida');
    expect(estado.opciones).toEqual([]);
    expect(estado.conBuscador).toBe(false);
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
    mockedGuardar.mockRejectedValueOnce(sinConexion()).mockResolvedValue(undefined);

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
    mockedGuardar.mockRejectedValueOnce(sinConexion()).mockResolvedValue(undefined);

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

  it('does not try again a failure the connection cannot fix', async () => {
    mockedGuardar
      .mockRejectedValueOnce(
        new Error('Could not save the phone: permission denied for function guardar_dispositivo'),
      )
      .mockResolvedValue(undefined);
    const subscribe = jest.spyOn(onlineManager, 'subscribe');

    await actualizarRecordatorios(newClient());
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(subscribe).not.toHaveBeenCalled();
    expect(mockedGuardar).toHaveBeenCalledTimes(1);
    subscribe.mockRestore();
  });

  it('waits for the connection when the failure is one of the connection', async () => {
    mockedGuardar.mockRejectedValueOnce(sinConexion()).mockResolvedValue(undefined);
    const subscribe = jest.spyOn(onlineManager, 'subscribe');

    await actualizarRecordatorios(newClient());

    expect(subscribe).toHaveBeenCalledTimes(1);
    subscribe.mockRestore();
  });

  it('tries again on its own when the token never came and the phone stays online', async () => {
    jest.useFakeTimers();
    const queryClient = newClient();
    // The phone never answers the first time it is asked for its token.
    jest.mocked(Notifications.getExpoPushTokenAsync).mockReturnValueOnce(new Promise(() => {}));
    const { getTokenDelTelefono: realGetToken, TOKEN_TIMEOUT_MS } =
      jest.requireActual<typeof import('./telefono')>('./telefono');
    mockedGetToken.mockImplementationOnce(realGetToken);

    try {
      const primera = actualizarRecordatorios(queryClient);
      const pedidos = jest.mocked(Notifications.getExpoPushTokenAsync).mock.calls;
      for (let vuelta = 0; vuelta < 100 && pedidos.length === 0; vuelta++) {
        await Promise.resolve();
      }
      expect(pedidos).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(TOKEN_TIMEOUT_MS);
      await primera;
      expect(mockedGuardar).not.toHaveBeenCalled();

      // The connection never changes: only waiting brings the second sync.
      await jest.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
      await jest.runAllTimersAsync();

      expect(mockedGetToken).toHaveBeenCalledTimes(2);
      expect(mockedGuardar).toHaveBeenCalledTimes(1);
      expect(mockedGuardar).toHaveBeenCalledWith('ExponentPushToken[telefono]', {
        encendido: true,
        iglesiaIds: ['i1'],
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('stops trying on its own once every wait is used up', async () => {
    jest.useFakeTimers();
    mockedGuardar.mockRejectedValue(sinConexion());

    try {
      await actualizarRecordatorios(newClient());
      for (const delay of RETRY_DELAYS_MS) {
        await jest.advanceTimersByTimeAsync(delay);
      }
      await jest.runAllTimersAsync();

      // The first try and one more per wait, and nothing after the last.
      expect(mockedGuardar).toHaveBeenCalledTimes(1 + RETRY_DELAYS_MS.length);
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('tries again only the latest of two changes that failed together', async () => {
    jest.useFakeTimers();
    mockedGuardar
      .mockRejectedValueOnce(sinConexion())
      .mockRejectedValueOnce(sinConexion())
      .mockResolvedValue(undefined);

    try {
      const queryClient = newClient();
      // The second change comes while the first is still saving.
      await Promise.all([
        actualizarRecordatorios(queryClient),
        actualizarRecordatorios(queryClient),
      ]);
      expect(mockedGuardar).toHaveBeenCalledTimes(2);
      await jest.advanceTimersByTimeAsync(RETRY_DELAYS_MS[0]);
      await jest.runAllTimersAsync();

      expect(mockedGuardar).toHaveBeenCalledTimes(3);
    } finally {
      jest.useRealTimers();
    }
  });

  it('lets Ajustes read the registro again, whatever the failure', async () => {
    mockedGuardar.mockRejectedValueOnce(new Error('The app has no EAS projectId'));
    const queryClient = newClient();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    await expect(actualizarRecordatorios(queryClient)).resolves.toBeUndefined();

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['recordatorios', 'registro'] });
  });
});
