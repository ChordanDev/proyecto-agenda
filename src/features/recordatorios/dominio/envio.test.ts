import type {
  FechaDeEvento,
  IglesiaEnEstructura,
} from '@/features/calendario/dominio/armarCalendario';
import type { Evento } from '@/features/eventos/dominio/evento';

import {
  enviarRecordatorios,
  revisarRecibos,
  type Aviso,
  type EstadoDeRecibo,
  type PuertosDeEnvio,
  type PuertosDeRecibos,
  type ReciboGuardado,
  type ReciboPendiente,
} from './envio';

const central: IglesiaEnEstructura = {
  id: 'iglesia-central',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};

const norte: IglesiaEnEstructura = { ...central, id: 'iglesia-norte' };

function fecha(fechaLocal: string, overrides: Partial<Evento>): FechaDeEvento {
  return {
    fecha: fechaLocal,
    evento: {
      id: 'evento-' + (overrides.titulo ?? 'sin-titulo'),
      titulo: 'Congreso de Jóvenes',
      lugar: null,
      lugarId: null,
      descripcion: null,
      enfasis: 'identidad',
      duenio: { alcance: 'iglesia', iglesiaId: central.id },
      hora: '19:00:00',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      iglesiasSumadas: [],
      ...overrides,
    },
  };
}

/** 20:00 in Buenos Aires on 23 October. */
const A_LAS_20 = new Date('2026-10-23T23:00:00Z');

function puertos(overrides: Partial<PuertosDeEnvio> = {}) {
  const enviados: Aviso[] = [];
  const desactivados: string[] = [];
  const leidas: string[] = [];
  const recibos: ReciboPendiente[] = [];

  const base: PuertosDeEnvio = {
    ahora: () => A_LAS_20,
    leerAsociaciones: async () => [
      { id: 'asociacion-central', zonaHoraria: 'America/Argentina/Buenos_Aires' },
    ],
    leerDispositivos: async () => [
      { token: 'ExponentPushToken[central]', iglesias: [central] },
      { token: 'ExponentPushToken[norte]', iglesias: [norte] },
    ],
    leerFechas: async (maniana) => {
      leidas.push(maniana);
      return [
        fecha('2026-10-24', { titulo: 'Congreso de Jóvenes' }),
        fecha('2026-10-24', {
          titulo: 'Culto joven',
          duenio: { alcance: 'iglesia', iglesiaId: norte.id },
        }),
      ];
    },
    enviar: async (avisos) => {
      enviados.push(...avisos);
      return avisos.map(({ token }) => ({ estado: 'enviado' as const, ticket: `ticket-${token}` }));
    },
    desactivar: async (tokens) => {
      desactivados.push(...tokens);
    },
    guardarRecibos: async (nuevos) => {
      recibos.push(...nuevos);
    },
    ...overrides,
  };

  return { puertos: base, enviados, desactivados, leidas, recibos };
}

describe('enviarRecordatorios', () => {
  it('sends each phone the aviso of the iglesias it follows, for tomorrow', async () => {
    const { puertos: p, enviados, leidas } = puertos();

    const resultado = await enviarRecordatorios(p);

    expect(leidas).toEqual(['2026-10-24']);
    expect(enviados).toEqual([
      { token: 'ExponentPushToken[central]', texto: 'Mañana: Congreso de Jóvenes' },
      { token: 'ExponentPushToken[norte]', texto: 'Mañana: Culto joven' },
    ]);
    expect(resultado).toEqual({ enviados: 2, desactivados: 0, fallidos: 0 });
  });

  it('sends nothing to a phone with nothing tomorrow', async () => {
    const { puertos: p, enviados } = puertos({
      leerFechas: async () => [fecha('2026-10-24', { titulo: 'Congreso de Jóvenes' })],
    });

    await enviarRecordatorios(p);

    expect(enviados).toEqual([
      { token: 'ExponentPushToken[central]', texto: 'Mañana: Congreso de Jóvenes' },
    ]);
  });

  it('does not call the push service when no phone has an aviso', async () => {
    const enviar = jest.fn(async () => []);
    const { puertos: p } = puertos({ leerFechas: async () => [], enviar });

    const resultado = await enviarRecordatorios(p);

    expect(enviar).not.toHaveBeenCalled();
    expect(resultado).toEqual({ enviados: 0, desactivados: 0, fallidos: 0 });
  });

  it('sends nothing outside 20 h in the zona horaria of the asociacion', async () => {
    const leerDispositivos = jest.fn(async () => []);
    const { puertos: p, enviados } = puertos({
      // 20:00 UTC is 17:00 in Buenos Aires.
      ahora: () => new Date('2026-10-23T20:00:00Z'),
      leerDispositivos,
    });

    const resultado = await enviarRecordatorios(p);

    expect(leerDispositivos).not.toHaveBeenCalled();
    expect(enviados).toEqual([]);
    expect(resultado).toEqual({ enviados: 0, desactivados: 0, fallidos: 0 });
  });

  it('reads the phones of each asociacion at its own 20 h', async () => {
    const leerDispositivos = jest.fn(async () => []);
    const { puertos: p } = puertos({
      leerAsociaciones: async () => [
        { id: 'asociacion-central', zonaHoraria: 'America/Argentina/Buenos_Aires' },
        { id: 'asociacion-madrid', zonaHoraria: 'Europe/Madrid' },
      ],
      leerDispositivos,
    });

    await enviarRecordatorios(p);

    expect(leerDispositivos.mock.calls).toEqual([['asociacion-central']]);
  });

  it('deactivates the tokens the push service reports as invalid', async () => {
    const { puertos: p, desactivados } = puertos({
      enviar: async () => [{ estado: 'enviado', ticket: 't1' }, { estado: 'invalido' }],
    });

    const resultado = await enviarRecordatorios(p);

    expect(desactivados).toEqual(['ExponentPushToken[norte]']);
    expect(resultado).toEqual({ enviados: 1, desactivados: 1, fallidos: 0 });
  });

  it('counts the avisos the push service could not take, and goes on', async () => {
    const { puertos: p, desactivados } = puertos({
      enviar: async () => [{ estado: 'fallido' }, { estado: 'invalido' }],
    });

    const resultado = await enviarRecordatorios(p);

    expect(desactivados).toEqual(['ExponentPushToken[norte]']);
    expect(resultado).toEqual({ enviados: 0, desactivados: 1, fallidos: 1 });
  });

  it('does not deactivate anything when every token is valid', async () => {
    const desactivar = jest.fn(async () => {});
    const { puertos: p } = puertos({ desactivar });

    await enviarRecordatorios(p);

    expect(desactivar).not.toHaveBeenCalled();
  });

  it('keeps the ticket of each aviso the push service took, with its token', async () => {
    const { puertos: p, recibos } = puertos({
      enviar: async () => [{ estado: 'invalido' }, { estado: 'enviado', ticket: 'ticket-norte' }],
    });

    await enviarRecordatorios(p);

    expect(recibos).toEqual([{ ticket: 'ticket-norte', token: 'ExponentPushToken[norte]' }]);
  });

  it('keeps no ticket when the push service took no aviso', async () => {
    const guardarRecibos = jest.fn(async () => {});
    const { puertos: p } = puertos({
      enviar: async () => [{ estado: 'fallido' }, { estado: 'invalido' }],
      guardarRecibos,
    });

    await enviarRecordatorios(p);

    expect(guardarRecibos).not.toHaveBeenCalled();
  });

  it('goes on sending when the tickets of an asociacion cannot be kept', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const leerDispositivos = jest.fn(async (asociacionId: string) => [
      { token: `ExponentPushToken[${asociacionId}]`, iglesias: [central] },
    ]);
    const guardarRecibos = jest
      .fn<Promise<void>, [ReciboPendiente[]]>()
      .mockRejectedValueOnce(new Error('the database is down'))
      .mockResolvedValue();
    const { puertos: p, enviados } = puertos({
      leerAsociaciones: async () => [
        { id: 'asociacion-central', zonaHoraria: 'America/Argentina/Buenos_Aires' },
        { id: 'asociacion-litoral', zonaHoraria: 'America/Argentina/Cordoba' },
      ],
      leerDispositivos,
      guardarRecibos,
    });

    const resultado = await enviarRecordatorios(p);

    expect(enviados.map(({ token }) => token)).toEqual([
      'ExponentPushToken[asociacion-central]',
      'ExponentPushToken[asociacion-litoral]',
    ]);
    expect(guardarRecibos).toHaveBeenLastCalledWith([
      {
        ticket: 'ticket-ExponentPushToken[asociacion-litoral]',
        token: 'ExponentPushToken[asociacion-litoral]',
      },
    ]);
    expect(resultado).toEqual({ enviados: 2, desactivados: 0, fallidos: 0 });
    // Neither a token nor a ticket reaches the logs.
    expect(JSON.stringify(error.mock.calls)).not.toMatch(/ExponentPushToken|ticket-/);
    error.mockRestore();
  });
});

/** 21:00 in Buenos Aires on 23 October: an hour after the sending. */
const A_LAS_21 = new Date('2026-10-24T00:00:00Z');

function guardado(ticket: string, token: string, enviadoAt = A_LAS_20): ReciboGuardado {
  return { ticket, token, enviadoAt };
}

function puertosDeRecibos(
  guardados: ReciboGuardado[],
  estados: Record<string, EstadoDeRecibo>,
  overrides: Partial<PuertosDeRecibos> = {},
) {
  const desactivados: { token: string; enviadoAt: Date }[] = [];
  const borrados: string[] = [];
  const leidosHasta: Date[] = [];
  const consultados: string[][] = [];

  const base: PuertosDeRecibos = {
    ahora: () => A_LAS_21,
    leerRecibos: async (hasta) => {
      leidosHasta.push(hasta);
      return guardados;
    },
    consultarRecibos: async (tickets) => {
      consultados.push(tickets);
      return new Map(
        tickets.flatMap((ticket) =>
          ticket in estados ? [[ticket, estados[ticket]] as const] : [],
        ),
      );
    },
    desactivarPorRecibos: async (invalidos) => {
      desactivados.push(...invalidos);
      return invalidos.length;
    },
    borrarRecibos: async (tickets) => {
      borrados.push(...tickets);
    },
    ...overrides,
  };

  return { puertos: base, desactivados, borrados, leidosHasta, consultados };
}

describe('revisarRecibos', () => {
  it('reads only the tickets kept at least 15 minutes ago', async () => {
    const { puertos: p, leidosHasta } = puertosDeRecibos([], {});

    await revisarRecibos(p);

    expect(leidosHasta).toEqual([new Date('2026-10-23T23:45:00Z')]);
  });

  it('turns off the phone whose receipt is DeviceNotRegistered, and forgets its ticket', async () => {
    const {
      puertos: p,
      desactivados,
      borrados,
    } = puertosDeRecibos([guardado('ticket-viejo', 'ExponentPushToken[viejo]')], {
      'ticket-viejo': 'invalido',
    });

    const resultado = await revisarRecibos(p);

    expect(desactivados).toEqual([{ token: 'ExponentPushToken[viejo]', enviadoAt: A_LAS_20 }]);
    expect(borrados).toEqual(['ticket-viejo']);
    expect(resultado).toEqual({ revisados: 1, desactivados: 1 });
  });

  it('turns nothing off for an ok receipt, and forgets its ticket', async () => {
    const desactivarPorRecibos = jest.fn(async () => 0);
    const { puertos: p, borrados } = puertosDeRecibos(
      [guardado('ticket-ok', 'ExponentPushToken[ok]')],
      { 'ticket-ok': 'ok' },
      { desactivarPorRecibos },
    );

    const resultado = await revisarRecibos(p);

    expect(desactivarPorRecibos).not.toHaveBeenCalled();
    expect(borrados).toEqual(['ticket-ok']);
    expect(resultado).toEqual({ revisados: 1, desactivados: 0 });
  });

  it('turns nothing off for a receipt with another error, and forgets its ticket', async () => {
    const desactivarPorRecibos = jest.fn(async () => 0);
    const { puertos: p, borrados } = puertosDeRecibos(
      [guardado('ticket-limite', 'ExponentPushToken[limite]')],
      { 'ticket-limite': 'fallido' },
      { desactivarPorRecibos },
    );

    await revisarRecibos(p);

    expect(desactivarPorRecibos).not.toHaveBeenCalled();
    expect(borrados).toEqual(['ticket-limite']);
  });

  it('keeps the ticket whose receipt is not ready yet, for the next hour', async () => {
    const { puertos: p, borrados } = puertosDeRecibos(
      [
        guardado('ticket-ok', 'ExponentPushToken[ok]'),
        guardado('ticket-espera', 'ExponentPushToken[espera]'),
      ],
      { 'ticket-ok': 'ok' },
    );

    const resultado = await revisarRecibos(p);

    expect(borrados).toEqual(['ticket-ok']);
    expect(resultado).toEqual({ revisados: 1, desactivados: 0 });
  });

  it('forgets a ticket kept a day ago that never got a receipt', async () => {
    const { puertos: p, borrados } = puertosDeRecibos(
      [
        // 24 hours before 21:00 on 23 October.
        guardado('ticket-de-ayer', 'ExponentPushToken[ayer]', new Date('2026-10-23T00:00:00Z')),
        guardado('ticket-de-hoy', 'ExponentPushToken[hoy]', new Date('2026-10-23T00:00:01Z')),
      ],
      {},
    );

    await revisarRecibos(p);

    expect(borrados).toEqual(['ticket-de-ayer']);
  });

  it('turns a phone off once when several of its receipts are DeviceNotRegistered, from the last aviso', async () => {
    const despues = new Date(A_LAS_20.getTime() + 60_000);
    const { puertos: p, desactivados } = puertosDeRecibos(
      [
        guardado('ticket-1', 'ExponentPushToken[viejo]', despues),
        guardado('ticket-2', 'ExponentPushToken[viejo]'),
      ],
      { 'ticket-1': 'invalido', 'ticket-2': 'invalido' },
    );

    const resultado = await revisarRecibos(p);

    expect(desactivados).toEqual([{ token: 'ExponentPushToken[viejo]', enviadoAt: despues }]);
    expect(resultado).toEqual({ revisados: 2, desactivados: 1 });
  });

  it('counts only the phones that were turned off, not those saved again after the aviso', async () => {
    const { puertos: p, borrados } = puertosDeRecibos(
      [guardado('ticket-viejo', 'ExponentPushToken[reinstalado]')],
      { 'ticket-viejo': 'invalido' },
      { desactivarPorRecibos: async () => 0 },
    );

    const resultado = await revisarRecibos(p);

    expect(borrados).toEqual(['ticket-viejo']);
    expect(resultado).toEqual({ revisados: 1, desactivados: 0 });
  });

  it('asks the push service nothing when no ticket is kept', async () => {
    const consultarRecibos = jest.fn(async () => new Map<string, EstadoDeRecibo>());
    const borrarRecibos = jest.fn(async () => {});
    const { puertos: p } = puertosDeRecibos([], {}, { consultarRecibos, borrarRecibos });

    const resultado = await revisarRecibos(p);

    expect(consultarRecibos).not.toHaveBeenCalled();
    expect(borrarRecibos).not.toHaveBeenCalled();
    expect(resultado).toEqual({ revisados: 0, desactivados: 0 });
  });
});
