import type { Cargo } from './cargo';
import { cargosAbarcanDuenio, type DuenioEnEstructura } from './cargosAbarcanDuenio';

// The structure of the tests:
//
//   asociacion-central
//     distrito-centro: iglesia-cordoba-central, iglesia-nueva-cordoba
//     distrito-norte:  iglesia-arguello
//   otra-asociacion
//     distrito-lejano: iglesia-lejana

const cordobaCentral: DuenioEnEstructura = {
  alcance: 'iglesia',
  iglesiaId: 'iglesia-cordoba-central',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};

const nuevaCordoba: DuenioEnEstructura = {
  alcance: 'iglesia',
  iglesiaId: 'iglesia-nueva-cordoba',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};

const arguello: DuenioEnEstructura = {
  alcance: 'iglesia',
  iglesiaId: 'iglesia-arguello',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};

const distritoCentro: DuenioEnEstructura = {
  alcance: 'distrito',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};

const distritoNorte: DuenioEnEstructura = {
  alcance: 'distrito',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};

const asociacionCentral: DuenioEnEstructura = {
  alcance: 'asociacion',
  asociacionId: 'asociacion-central',
};

const encargadoDeCordobaCentral: Cargo = { nivel: 'iglesia', iglesiaId: 'iglesia-cordoba-central' };
const pastorDeDistritoCentro: Cargo = { nivel: 'distrito', distritoId: 'distrito-centro' };
const adminDeAsociacionCentral: Cargo = { nivel: 'asociacion', asociacionId: 'asociacion-central' };

describe('cargosAbarcanDuenio', () => {
  describe('an encargado', () => {
    const cargos = [encargadoDeCordobaCentral];

    it('covers their iglesia', () => {
      expect(cargosAbarcanDuenio(cargos, cordobaCentral)).toBe(true);
    });

    it('does not cover another iglesia, even of the same distrito', () => {
      expect(cargosAbarcanDuenio(cargos, nuevaCordoba)).toBe(false);
    });

    it('does not cover an iglesia of another distrito', () => {
      expect(cargosAbarcanDuenio(cargos, arguello)).toBe(false);
    });

    it('does not cover the distrito of their iglesia', () => {
      expect(cargosAbarcanDuenio(cargos, distritoCentro)).toBe(false);
    });

    it('does not cover another distrito', () => {
      expect(cargosAbarcanDuenio(cargos, distritoNorte)).toBe(false);
    });

    it('does not cover the asociacion', () => {
      expect(cargosAbarcanDuenio(cargos, asociacionCentral)).toBe(false);
    });
  });

  describe('a pastor', () => {
    const cargos = [pastorDeDistritoCentro];

    it('covers every iglesia of their distrito', () => {
      expect(cargosAbarcanDuenio(cargos, cordobaCentral)).toBe(true);
      expect(cargosAbarcanDuenio(cargos, nuevaCordoba)).toBe(true);
    });

    it('does not cover an iglesia of another distrito', () => {
      expect(cargosAbarcanDuenio(cargos, arguello)).toBe(false);
    });

    it('covers their distrito', () => {
      expect(cargosAbarcanDuenio(cargos, distritoCentro)).toBe(true);
    });

    it('does not cover another distrito', () => {
      expect(cargosAbarcanDuenio(cargos, distritoNorte)).toBe(false);
    });

    it('does not cover the asociacion', () => {
      expect(cargosAbarcanDuenio(cargos, asociacionCentral)).toBe(false);
    });
  });

  describe('an admin', () => {
    const cargos = [adminDeAsociacionCentral];

    it('covers every iglesia of their asociacion', () => {
      expect(cargosAbarcanDuenio(cargos, cordobaCentral)).toBe(true);
      expect(cargosAbarcanDuenio(cargos, nuevaCordoba)).toBe(true);
      expect(cargosAbarcanDuenio(cargos, arguello)).toBe(true);
    });

    it('covers every distrito of their asociacion', () => {
      expect(cargosAbarcanDuenio(cargos, distritoCentro)).toBe(true);
      expect(cargosAbarcanDuenio(cargos, distritoNorte)).toBe(true);
    });

    it('covers their asociacion', () => {
      expect(cargosAbarcanDuenio(cargos, asociacionCentral)).toBe(true);
    });

    it('covers nothing of another asociacion', () => {
      const adminDeOtraAsociacion: Cargo[] = [
        { nivel: 'asociacion', asociacionId: 'otra-asociacion' },
      ];

      expect(cargosAbarcanDuenio(adminDeOtraAsociacion, cordobaCentral)).toBe(false);
      expect(cargosAbarcanDuenio(adminDeOtraAsociacion, distritoCentro)).toBe(false);
      expect(cargosAbarcanDuenio(adminDeOtraAsociacion, asociacionCentral)).toBe(false);
    });
  });

  describe('a usuario without cargos', () => {
    it('covers nothing', () => {
      expect(cargosAbarcanDuenio([], cordobaCentral)).toBe(false);
      expect(cargosAbarcanDuenio([], distritoCentro)).toBe(false);
      expect(cargosAbarcanDuenio([], asociacionCentral)).toBe(false);
    });
  });

  describe('a usuario with several cargos', () => {
    it('covers a duenio when only one of the cargos covers it', () => {
      const cargos: Cargo[] = [
        { nivel: 'iglesia', iglesiaId: 'iglesia-lejana' },
        { nivel: 'distrito', distritoId: 'distrito-lejano' },
        encargadoDeCordobaCentral,
      ];

      expect(cargosAbarcanDuenio(cargos, cordobaCentral)).toBe(true);
    });

    it('covers what each cargo covers and nothing else', () => {
      const cargos: Cargo[] = [
        encargadoDeCordobaCentral,
        { nivel: 'distrito', distritoId: 'distrito-norte' },
      ];

      expect(cargosAbarcanDuenio(cargos, cordobaCentral)).toBe(true);
      expect(cargosAbarcanDuenio(cargos, arguello)).toBe(true);
      expect(cargosAbarcanDuenio(cargos, distritoNorte)).toBe(true);
      expect(cargosAbarcanDuenio(cargos, nuevaCordoba)).toBe(false);
      expect(cargosAbarcanDuenio(cargos, distritoCentro)).toBe(false);
      expect(cargosAbarcanDuenio(cargos, asociacionCentral)).toBe(false);
    });

    it('does not cover a duenio that none of the cargos covers', () => {
      const cargos: Cargo[] = [
        encargadoDeCordobaCentral,
        { nivel: 'distrito', distritoId: 'distrito-lejano' },
        { nivel: 'asociacion', asociacionId: 'otra-asociacion' },
      ];

      expect(cargosAbarcanDuenio(cargos, arguello)).toBe(false);
    });
  });

  it('does not confuse the levels when their ids are equal', () => {
    const iglesia: DuenioEnEstructura = {
      alcance: 'iglesia',
      iglesiaId: 'x',
      distritoId: 'y',
      asociacionId: 'z',
    };
    const distrito: DuenioEnEstructura = {
      alcance: 'distrito',
      distritoId: 'y',
      asociacionId: 'z',
    };
    const asociacion: DuenioEnEstructura = { alcance: 'asociacion', asociacionId: 'z' };

    // Every id below exists in the structure, but at another level.
    expect(cargosAbarcanDuenio([{ nivel: 'iglesia', iglesiaId: 'y' }], iglesia)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'iglesia', iglesiaId: 'y' }], distrito)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'distrito', distritoId: 'x' }], iglesia)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'distrito', distritoId: 'z' }], distrito)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'distrito', distritoId: 'z' }], asociacion)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'asociacion', asociacionId: 'y' }], distrito)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'asociacion', asociacionId: 'x' }], iglesia)).toBe(false);
  });
});
