import type { CargoEnEstructura } from '../../sesion/dominio/puedeGestionarCargo';
import {
  getCorreoDeBienvenida,
  invitarCargo,
  leerPedidoDeInvitacion,
  type CorreoDeBienvenida,
  type LugarDeInvitacion,
  type PuertosDeInvitacion,
} from './invitacion';

const ENLACES = {
  appStore: 'https://apps.apple.com/app/agenda',
  googlePlay: 'https://play.google.com/store/apps/details?id=agenda',
};

const IGLESIA_CENTRAL: CargoEnEstructura = {
  nivel: 'iglesia',
  iglesiaId: '10000000-0000-4000-8000-000000000001',
  distritoId: 'd0000000-0000-4000-8000-000000000001',
  asociacionId: 'asociacion',
  esSecretaria: false,
};

const IGLESIA_VECINA: CargoEnEstructura = {
  ...IGLESIA_CENTRAL,
  iglesiaId: '10000000-0000-4000-8000-000000000002',
};

const IGLESIA_DE_OTRO_DISTRITO: CargoEnEstructura = {
  ...IGLESIA_CENTRAL,
  iglesiaId: '10000000-0000-4000-8000-000000000003',
  distritoId: 'd0000000-0000-4000-8000-000000000002',
};

const SECRETARIA_DE_CENTRAL: CargoEnEstructura = { ...IGLESIA_CENTRAL, esSecretaria: true };

const PASTOR_DE_CENTRO: CargoEnEstructura = {
  nivel: 'distrito',
  distritoId: 'd0000000-0000-4000-8000-000000000001',
  asociacionId: 'asociacion',
};

const ADMIN: CargoEnEstructura = { nivel: 'asociacion', asociacionId: 'asociacion' };

/** The places of the structure the fake knows, by their id. */
const LUGARES: Record<string, { cargo: CargoEnEstructura; nombre: string }> = {
  '10000000-0000-4000-8000-000000000001': { cargo: IGLESIA_CENTRAL, nombre: 'Córdoba Central' },
  '10000000-0000-4000-8000-000000000002': { cargo: IGLESIA_VECINA, nombre: 'Nueva Córdoba' },
  '10000000-0000-4000-8000-000000000003': { cargo: IGLESIA_DE_OTRO_DISTRITO, nombre: 'Argüello' },
  'd0000000-0000-4000-8000-000000000001': { cargo: PASTOR_DE_CENTRO, nombre: 'Córdoba Centro' },
  'd0000000-0000-4000-8000-000000000002': {
    cargo: {
      nivel: 'distrito',
      distritoId: 'd0000000-0000-4000-8000-000000000002',
      asociacionId: 'asociacion',
    },
    nombre: 'Córdoba Norte',
  },
};

type CargoGuardado = { usuarioId: string; lugar: LugarDeInvitacion; funcion: string | null };

/**
 * A fake of the database and of Resend: usuarios by correo, the cargos saved
 * (one per usuario and lugar, as the database keeps them) and the correos sent.
 */
function crearPuertos({
  cargosDelGestor,
  usuarios = {},
  cargos = [],
  correoFalla = false,
}: {
  cargosDelGestor: CargoEnEstructura[];
  usuarios?: Record<string, string>;
  cargos?: (CargoGuardado & { esSecretaria: boolean })[];
  correoFalla?: boolean;
}) {
  const estado = {
    usuarios: { ...usuarios },
    cargos: [...cargos],
    perfiles: {} as Record<string, string>,
    correos: [] as (CorreoDeBienvenida & { para: string })[],
  };

  const idDelLugar = (lugar: LugarDeInvitacion) =>
    lugar.nivel === 'iglesia' ? lugar.iglesiaId : lugar.distritoId;
  const esElCargo = (usuarioId: string, lugar: LugarDeInvitacion) => (cargo: CargoGuardado) =>
    cargo.usuarioId === usuarioId && idDelLugar(cargo.lugar) === idDelLugar(lugar);

  const puertos: PuertosDeInvitacion = {
    leerCargosDelGestor: async () => cargosDelGestor,
    leerLugar: async (lugar) => {
      const encontrado = LUGARES[idDelLugar(lugar)];
      if (!encontrado || encontrado.cargo.nivel !== lugar.nivel) return null;
      return encontrado;
    },
    buscarUsuario: async (correo) => estado.usuarios[correo] ?? null,
    crearUsuario: async (correo) => {
      const id = `usuario-${Object.keys(estado.usuarios).length + 1}`;
      estado.usuarios[correo] = id;
      return id;
    },
    leerCargoExistente: async (usuarioId, lugar) => {
      const cargo = estado.cargos.find(esElCargo(usuarioId, lugar));
      return cargo ? { esSecretaria: cargo.esSecretaria } : null;
    },
    guardarCargo: async ({ usuarioId, nombre, funcion, lugar }) => {
      estado.perfiles[usuarioId] = nombre;
      const esSecretaria = lugar.nivel === 'iglesia' && lugar.esSecretaria;
      const existente = estado.cargos.find(esElCargo(usuarioId, lugar));
      if (existente) {
        Object.assign(existente, { funcion, esSecretaria, lugar });
      } else {
        estado.cargos.push({ usuarioId, lugar, funcion, esSecretaria });
      }
    },
    enviarCorreo: async (correo) => {
      if (correoFalla) throw new Error('Resend is down');
      estado.correos.push(correo);
    },
    informarError: jest.fn(),
  };

  return { puertos, estado };
}

const ENCARGADO_EN_CENTRAL = {
  nombre: 'Ana Gómez',
  correo: 'ana@example.com',
  funcion: 'Tesorera',
  iglesiaId: '10000000-0000-4000-8000-000000000001',
};

describe('leerPedidoDeInvitacion', () => {
  it('reads an encargado of an iglesia, trimming and lowering the correo', () => {
    expect(
      leerPedidoDeInvitacion({
        nombre: '  Ana Gómez ',
        correo: ' Ana@Example.com ',
        funcion: ' Tesorera ',
        iglesiaId: '10000000-0000-4000-8000-000000000001',
      }),
    ).toEqual({
      nombre: 'Ana Gómez',
      correo: 'ana@example.com',
      funcion: 'Tesorera',
      lugar: {
        nivel: 'iglesia',
        iglesiaId: '10000000-0000-4000-8000-000000000001',
        esSecretaria: false,
      },
    });
  });

  it('reads a secretaria de iglesia', () => {
    expect(leerPedidoDeInvitacion({ ...ENCARGADO_EN_CENTRAL, esSecretaria: true })?.lugar).toEqual({
      nivel: 'iglesia',
      iglesiaId: '10000000-0000-4000-8000-000000000001',
      esSecretaria: true,
    });
  });

  it('reads a pastor of a distrito, with no funcion', () => {
    expect(
      leerPedidoDeInvitacion({
        nombre: 'Juan',
        correo: 'juan@example.com',
        distritoId: 'd0000000-0000-4000-8000-000000000009',
      }),
    ).toEqual({
      nombre: 'Juan',
      correo: 'juan@example.com',
      funcion: null,
      lugar: { nivel: 'distrito', distritoId: 'd0000000-0000-4000-8000-000000000009' },
    });
  });

  it('takes a blank funcion as no funcion', () => {
    expect(leerPedidoDeInvitacion({ ...ENCARGADO_EN_CENTRAL, funcion: '   ' })?.funcion).toBeNull();
  });

  it.each([
    ['no body', null],
    ['a blank nombre', { ...ENCARGADO_EN_CENTRAL, nombre: '  ' }],
    ['a correo that is not one', { ...ENCARGADO_EN_CENTRAL, correo: 'ana-at-example' }],
    ['no iglesia nor distrito', { nombre: 'Ana', correo: 'ana@example.com' }],
    [
      'both an iglesia and a distrito',
      { ...ENCARGADO_EN_CENTRAL, distritoId: 'd0000000-0000-4000-8000-000000000009' },
    ],
    [
      'a secretaria on a distrito',
      {
        nombre: 'Ana',
        correo: 'ana@example.com',
        distritoId: 'd0000000-0000-4000-8000-000000000009',
        esSecretaria: true,
      },
    ],
    ['a funcion that is not text', { ...ENCARGADO_EN_CENTRAL, funcion: 3 }],
    ['a nombre too long', { ...ENCARGADO_EN_CENTRAL, nombre: 'a'.repeat(101) }],
    ['an iglesia that is not a UUID', { ...ENCARGADO_EN_CENTRAL, iglesiaId: 'x' }],
    [
      'a distrito that is not a UUID',
      { nombre: 'Juan', correo: 'juan@example.com', distritoId: 'x' },
    ],
  ])('rejects %s', (_caso, body) => {
    expect(leerPedidoDeInvitacion(body)).toBeNull();
  });
});

describe('getCorreoDeBienvenida', () => {
  it('names the cargo of encargado and the iglesia, with the links to the stores', () => {
    const correo = getCorreoDeBienvenida({
      lugar: {
        nivel: 'iglesia',
        iglesiaId: '10000000-0000-4000-8000-000000000001',
        esSecretaria: false,
      },
      nombreDelLugar: 'Córdoba Central',
      enlaces: ENLACES,
    });

    expect(correo.texto).toContain(
      'Te agregaron como encargado de la iglesia Córdoba Central. Descargá la app e ingresá con este correo.',
    );
    expect(correo.texto).toContain(ENLACES.appStore);
    expect(correo.texto).toContain(ENLACES.googlePlay);
    expect(correo.asunto).toBe('Te agregaron a la Agenda de iglesia');
  });

  it('names a secretaria de iglesia', () => {
    const { texto } = getCorreoDeBienvenida({
      lugar: {
        nivel: 'iglesia',
        iglesiaId: '10000000-0000-4000-8000-000000000001',
        esSecretaria: true,
      },
      nombreDelLugar: 'Córdoba Central',
      enlaces: ENLACES,
    });

    expect(texto).toContain('Te agregaron como secretaria de la iglesia Córdoba Central.');
  });

  it('names a pastor and the distrito', () => {
    const { texto } = getCorreoDeBienvenida({
      lugar: { nivel: 'distrito', distritoId: 'd0000000-0000-4000-8000-000000000001' },
      nombreDelLugar: 'Córdoba Centro',
      enlaces: ENLACES,
    });

    expect(texto).toContain('Te agregaron como pastor del distrito Córdoba Centro.');
  });
});

describe('invitarCargo', () => {
  it('allowed: a secretaria invites an encargado of her iglesia, who gets an account and the correo', async () => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor: [SECRETARIA_DE_CENTRAL] });

    const resultado = await invitarCargo(ENCARGADO_EN_CENTRAL, puertos, ENLACES);

    expect(resultado).toEqual({ ok: true, usuarioNuevo: true });
    expect(estado.usuarios).toEqual({ 'ana@example.com': 'usuario-1' });
    expect(estado.perfiles).toEqual({ 'usuario-1': 'Ana Gómez' });
    expect(estado.cargos).toEqual([
      {
        usuarioId: 'usuario-1',
        funcion: 'Tesorera',
        esSecretaria: false,
        lugar: {
          nivel: 'iglesia',
          iglesiaId: '10000000-0000-4000-8000-000000000001',
          esSecretaria: false,
        },
      },
    ]);
    expect(estado.correos).toHaveLength(1);
    expect(estado.correos[0].para).toBe('ana@example.com');
    expect(estado.correos[0].texto).toContain('encargado de la iglesia Córdoba Central');
  });

  it.each([
    [
      'an encargado of another iglesia',
      [SECRETARIA_DE_CENTRAL],
      { iglesiaId: '10000000-0000-4000-8000-000000000002' },
    ],
    [
      'a secretaria, even of her own iglesia',
      [SECRETARIA_DE_CENTRAL],
      { iglesiaId: '10000000-0000-4000-8000-000000000001', esSecretaria: true },
    ],
    [
      'a pastor',
      [SECRETARIA_DE_CENTRAL],
      { iglesiaId: undefined, distritoId: 'd0000000-0000-4000-8000-000000000001' },
    ],
  ])('rejected: a secretaria invites %s', async (_caso, cargosDelGestor, lugar) => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor });

    const resultado = await invitarCargo({ ...ENCARGADO_EN_CENTRAL, ...lugar }, puertos, ENLACES);

    expect(resultado).toEqual({ ok: false, falla: 'sin_permiso' });
    expect(estado.usuarios).toEqual({});
    expect(estado.cargos).toEqual([]);
    expect(estado.correos).toEqual([]);
  });

  it('allowed: a pastor invites a secretaria in their distrito', async () => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor: [PASTOR_DE_CENTRO] });

    const resultado = await invitarCargo(
      {
        ...ENCARGADO_EN_CENTRAL,
        iglesiaId: '10000000-0000-4000-8000-000000000002',
        esSecretaria: true,
      },
      puertos,
      ENLACES,
    );

    expect(resultado).toEqual({ ok: true, usuarioNuevo: true });
    expect(estado.cargos).toEqual([expect.objectContaining({ esSecretaria: true })]);
    expect(estado.correos[0].texto).toContain('secretaria de la iglesia Nueva Córdoba');
  });

  it('rejected: a pastor invites a secretaria in another distrito', async () => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor: [PASTOR_DE_CENTRO] });

    const resultado = await invitarCargo(
      {
        ...ENCARGADO_EN_CENTRAL,
        iglesiaId: '10000000-0000-4000-8000-000000000003',
        esSecretaria: true,
      },
      puertos,
      ENLACES,
    );

    expect(resultado).toEqual({ ok: false, falla: 'sin_permiso' });
    expect(estado.cargos).toEqual([]);
  });

  it('rejected: a pastor invites another pastor', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [PASTOR_DE_CENTRO] });

    const resultado = await invitarCargo(
      {
        nombre: 'Juan',
        correo: 'juan@example.com',
        distritoId: 'd0000000-0000-4000-8000-000000000001',
      },
      puertos,
      ENLACES,
    );

    expect(resultado).toEqual({ ok: false, falla: 'sin_permiso' });
  });

  it('allowed: an admin invites a pastor, and the correo names the distrito', async () => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor: [ADMIN] });

    const resultado = await invitarCargo(
      {
        nombre: 'Juan',
        correo: 'juan@example.com',
        distritoId: 'd0000000-0000-4000-8000-000000000002',
      },
      puertos,
      ENLACES,
    );

    expect(resultado).toEqual({ ok: true, usuarioNuevo: true });
    expect(estado.correos[0].texto).toContain('pastor del distrito Córdoba Norte');
  });

  it('rejected: an encargado común invites nobody', async () => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor: [IGLESIA_CENTRAL] });

    const resultado = await invitarCargo(ENCARGADO_EN_CENTRAL, puertos, ENLACES);

    expect(resultado).toEqual({ ok: false, falla: 'sin_permiso' });
    expect(estado.correos).toEqual([]);
  });

  it('rejected: an iglesia that does not exist answers like one not managed', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [ADMIN] });

    const resultado = await invitarCargo(
      { ...ENCARGADO_EN_CENTRAL, iglesiaId: '10000000-0000-4000-8000-0000000000ff' },
      puertos,
      ENLACES,
    );

    expect(resultado).toEqual({ ok: false, falla: 'sin_permiso' });
  });

  it('rejects a body that is not a pedido', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [ADMIN] });

    expect(await invitarCargo({ nombre: 'Ana' }, puertos, ENLACES)).toEqual({
      ok: false,
      falla: 'pedido_invalido',
    });
  });

  it('a correo that already has an account only gets the cargo added, and the same correo', async () => {
    const otroCargo = {
      usuarioId: 'b0000000-0000-4000-8000-000000000001',
      lugar: {
        nivel: 'iglesia',
        iglesiaId: '10000000-0000-4000-8000-000000000003',
        esSecretaria: false,
      } as const,
      funcion: null,
      esSecretaria: false,
    };
    const { puertos, estado } = crearPuertos({
      cargosDelGestor: [SECRETARIA_DE_CENTRAL],
      usuarios: { 'ana@example.com': 'b0000000-0000-4000-8000-000000000001' },
      cargos: [otroCargo],
    });

    const resultado = await invitarCargo(
      { ...ENCARGADO_EN_CENTRAL, correo: 'ANA@example.com' },
      puertos,
      ENLACES,
    );

    expect(resultado).toEqual({ ok: true, usuarioNuevo: false });
    expect(Object.keys(estado.usuarios)).toEqual(['ana@example.com']);
    expect(estado.cargos.map((cargo) => cargo.usuarioId)).toEqual([
      'b0000000-0000-4000-8000-000000000001',
      'b0000000-0000-4000-8000-000000000001',
    ]);
    expect(estado.correos).toHaveLength(1);
    expect(estado.correos[0].texto).toContain('encargado de la iglesia Córdoba Central');
  });

  it('inviting the same cargo twice does not duplicate it', async () => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor: [SECRETARIA_DE_CENTRAL] });

    await invitarCargo(ENCARGADO_EN_CENTRAL, puertos, ENLACES);
    const segunda = await invitarCargo(
      { ...ENCARGADO_EN_CENTRAL, funcion: 'Anciana' },
      puertos,
      ENLACES,
    );

    expect(segunda).toEqual({ ok: true, usuarioNuevo: false });
    expect(Object.keys(estado.usuarios)).toHaveLength(1);
    expect(estado.cargos).toHaveLength(1);
    expect(estado.cargos[0].funcion).toBe('Anciana');
  });

  it('rejected: a secretaria cannot turn another secretaria into an encargado by inviting her again', async () => {
    const { puertos, estado } = crearPuertos({
      cargosDelGestor: [SECRETARIA_DE_CENTRAL],
      usuarios: { 'ana@example.com': 'b0000000-0000-4000-8000-000000000001' },
      cargos: [
        {
          usuarioId: 'b0000000-0000-4000-8000-000000000001',
          lugar: {
            nivel: 'iglesia',
            iglesiaId: '10000000-0000-4000-8000-000000000001',
            esSecretaria: true,
          },
          funcion: null,
          esSecretaria: true,
        },
      ],
    });

    const resultado = await invitarCargo(ENCARGADO_EN_CENTRAL, puertos, ENLACES);

    expect(resultado).toEqual({ ok: false, falla: 'sin_permiso' });
    expect(estado.cargos[0].esSecretaria).toBe(true);
  });

  it('keeps the cargo and says so when the correo could not be sent', async () => {
    const { puertos, estado } = crearPuertos({
      cargosDelGestor: [SECRETARIA_DE_CENTRAL],
      correoFalla: true,
    });

    const resultado = await invitarCargo(ENCARGADO_EN_CENTRAL, puertos, ENLACES);

    expect(resultado).toEqual({ ok: false, falla: 'correo_no_enviado' });
    expect(estado.cargos).toHaveLength(1);
    expect(puertos.informarError).toHaveBeenCalled();
  });

  it('answers error_servidor when the database fails', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [SECRETARIA_DE_CENTRAL] });
    puertos.guardarCargo = async () => {
      throw new Error('down');
    };

    expect(await invitarCargo(ENCARGADO_EN_CENTRAL, puertos, ENLACES)).toEqual({
      ok: false,
      falla: 'error_servidor',
    });
    expect(puertos.informarError).toHaveBeenCalled();
  });
});
