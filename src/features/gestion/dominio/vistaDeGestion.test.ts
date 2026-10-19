import { getVistaDeGestion, type CargoDelGestor } from './vistaDeGestion';

const ENCARGADO: CargoDelGestor = { nivel: 'iglesia', iglesiaId: 'central', esSecretaria: false };
const SECRETARIA: CargoDelGestor = { nivel: 'iglesia', iglesiaId: 'central', esSecretaria: true };
const OTRA_SECRETARIA: CargoDelGestor = {
  nivel: 'iglesia',
  iglesiaId: 'las-rosas',
  esSecretaria: true,
};
const PASTOR: CargoDelGestor = { nivel: 'distrito', distritoId: 'norte' };
const ADMIN: CargoDelGestor = { nivel: 'asociacion', asociacionId: 'centro' };

describe('getVistaDeGestion', () => {
  it('gives no vista to a usuario without cargos', () => {
    expect(getVistaDeGestion([])).toBeNull();
  });

  it('gives no vista to a common encargado', () => {
    expect(getVistaDeGestion([ENCARGADO])).toBeNull();
  });

  it('gives the secretaria the vista of her iglesia', () => {
    expect(getVistaDeGestion([SECRETARIA])).toEqual({
      tipo: 'secretaria',
      iglesiaIds: ['central'],
    });
  });

  it('gives a secretaria of two iglesias both, without the ones she is only encargado of', () => {
    expect(
      getVistaDeGestion([
        SECRETARIA,
        { ...ENCARGADO, iglesiaId: 'vecina' },
        OTRA_SECRETARIA,
        SECRETARIA,
      ]),
    ).toEqual({ tipo: 'secretaria', iglesiaIds: ['central', 'las-rosas'] });
  });

  it('gives the pastor the vista of the pastor', () => {
    expect(getVistaDeGestion([PASTOR])).toEqual({ tipo: 'pastor', distritoIds: ['norte'] });
  });

  it('gives a pastor of two distritos both', () => {
    expect(getVistaDeGestion([PASTOR, { nivel: 'distrito', distritoId: 'sur' }, PASTOR])).toEqual({
      tipo: 'pastor',
      distritoIds: ['norte', 'sur'],
    });
  });

  it('gives the admin the vista of the admin', () => {
    expect(getVistaDeGestion([ADMIN])).toEqual({ tipo: 'admin' });
  });

  it('gives a pastor who is also a secretaria the vista of the pastor', () => {
    expect(getVistaDeGestion([SECRETARIA, PASTOR])).toEqual({
      tipo: 'pastor',
      distritoIds: ['norte'],
    });
  });

  it('gives an admin who is also a pastor and a secretaria the vista of the admin', () => {
    expect(getVistaDeGestion([SECRETARIA, PASTOR, ADMIN])).toEqual({ tipo: 'admin' });
  });
});
