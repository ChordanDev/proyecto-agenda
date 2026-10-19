import type { CargoEnEstructura } from '../../sesion/dominio/puedeGestionarCargo';
import { cambiarCorreo, type PuertosDeCambioDeCorreo } from './cambioDeCorreo';

const ENCARGADO: CargoEnEstructura = {
  nivel: 'iglesia',
  iglesiaId: 'iglesia-central',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion',
  esSecretaria: false,
};

const PASTOR: CargoEnEstructura = {
  nivel: 'distrito',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion',
};

const ADMIN: CargoEnEstructura = { nivel: 'asociacion', asociacionId: 'asociacion' };

const OTRO_ADMIN: CargoEnEstructura = { nivel: 'asociacion', asociacionId: 'otra-asociacion' };

const PEDIDO = { usuarioId: 'usuario-ana', correo: ' Ana.Nueva@Example.com ' };

function crearPuertos({
  cargosDelGestor,
  cargosDelUsuario = [ENCARGADO],
  usuarios = { 'ana@example.com': 'usuario-ana' },
}: {
  cargosDelGestor: CargoEnEstructura[];
  cargosDelUsuario?: CargoEnEstructura[];
  usuarios?: Record<string, string>;
}) {
  const estado = { usuarios: { ...usuarios } };
  const puertos: PuertosDeCambioDeCorreo = {
    leerCargosDelGestor: async () => cargosDelGestor,
    leerCargosDelUsuario: async () => cargosDelUsuario,
    buscarUsuario: async (correo) => estado.usuarios[correo] ?? null,
    actualizarCorreo: async (usuarioId, correo) => {
      for (const [actual, id] of Object.entries(estado.usuarios)) {
        if (id === usuarioId) delete estado.usuarios[actual];
      }
      estado.usuarios[correo] = usuarioId;
    },
    informarError: jest.fn(),
  };
  return { puertos, estado };
}

describe('cambiarCorreo', () => {
  it('allowed: the admin changes the correo of a usuario of their asociacion', async () => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor: [ADMIN] });

    expect(await cambiarCorreo(PEDIDO, puertos)).toEqual({ ok: true });
    expect(estado.usuarios).toEqual({ 'ana.nueva@example.com': 'usuario-ana' });
  });

  it.each([
    ['a pastor, even of the iglesia of the usuario', [PASTOR]],
    ['an admin of another asociacion', [OTRO_ADMIN]],
    ['an encargado común', [ENCARGADO]],
  ])('rejected: %s', async (_caso, cargosDelGestor) => {
    const { puertos, estado } = crearPuertos({ cargosDelGestor });

    expect(await cambiarCorreo(PEDIDO, puertos)).toEqual({ ok: false, falla: 'sin_permiso' });
    expect(estado.usuarios).toEqual({ 'ana@example.com': 'usuario-ana' });
  });

  it('rejected: the admin cannot change the correo of a usuario without cargos', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [ADMIN], cargosDelUsuario: [] });

    expect(await cambiarCorreo(PEDIDO, puertos)).toEqual({ ok: false, falla: 'sin_permiso' });
  });

  it('rejected: the admin cannot change the correo of another admin', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [ADMIN], cargosDelUsuario: [ADMIN] });

    expect(await cambiarCorreo(PEDIDO, puertos)).toEqual({ ok: false, falla: 'sin_permiso' });
  });

  it('rejects a correo that belongs to another usuario, without changing anything', async () => {
    const { puertos, estado } = crearPuertos({
      cargosDelGestor: [ADMIN],
      usuarios: { 'ana@example.com': 'usuario-ana', 'ana.nueva@example.com': 'usuario-otro' },
    });

    expect(await cambiarCorreo(PEDIDO, puertos)).toEqual({ ok: false, falla: 'correo_en_uso' });
    expect(estado.usuarios['ana@example.com']).toBe('usuario-ana');
  });

  it('accepts the correo the usuario already has', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [ADMIN] });

    expect(
      await cambiarCorreo({ usuarioId: 'usuario-ana', correo: 'ana@example.com' }, puertos),
    ).toEqual({ ok: true });
  });

  it.each([
    ['no body', null],
    ['no usuario', { correo: 'ana@example.com' }],
    ['a correo that is not one', { usuarioId: 'usuario-ana', correo: 'ana' }],
  ])('rejects %s', async (_caso, body) => {
    const { puertos } = crearPuertos({ cargosDelGestor: [ADMIN] });

    expect(await cambiarCorreo(body, puertos)).toEqual({ ok: false, falla: 'pedido_invalido' });
  });

  it('answers error_servidor when the database fails', async () => {
    const { puertos } = crearPuertos({ cargosDelGestor: [ADMIN] });
    puertos.actualizarCorreo = async () => {
      throw new Error('down');
    };

    expect(await cambiarCorreo(PEDIDO, puertos)).toEqual({ ok: false, falla: 'error_servidor' });
    expect(puertos.informarError).toHaveBeenCalled();
  });
});
