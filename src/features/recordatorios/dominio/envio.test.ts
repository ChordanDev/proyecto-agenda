import type {
  FechaDeEvento,
  IglesiaEnEstructura,
} from '@/features/calendario/dominio/armarCalendario';
import type { Evento } from '@/features/eventos/dominio/evento';

import { enviarRecordatorios, type Aviso, type PuertosDeEnvio } from './envio';

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
      return avisos.map(() => 'enviado' as const);
    },
    desactivar: async (tokens) => {
      desactivados.push(...tokens);
    },
    ...overrides,
  };

  return { puertos: base, enviados, desactivados, leidas };
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
      enviar: async () => ['enviado', 'invalido'],
    });

    const resultado = await enviarRecordatorios(p);

    expect(desactivados).toEqual(['ExponentPushToken[norte]']);
    expect(resultado).toEqual({ enviados: 1, desactivados: 1, fallidos: 0 });
  });

  it('counts the avisos the push service could not take, and goes on', async () => {
    const { puertos: p, desactivados } = puertos({
      enviar: async () => ['fallido', 'invalido'],
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
});
