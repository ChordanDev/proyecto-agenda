import type { Cargo } from './cargo';
import { cargosAbarcanDuenio, type DuenioEnEstructura } from './cargosAbarcanDuenio';
import tabla from './cargosAbarcanDuenio.casos.json';

// The cases of the rule live in cargosAbarcanDuenio.casos.json, which is also
// the source of supabase/tests/cargos_regla.test.sql (npm run db:casos-cargos).
// The same table is asserted against `public.cargos_abarcan_duenio`, so the
// domain and the database cannot drift apart without a check failing.
//
// The ids are unique across levels in the table, so a cargo or a duenio is
// named by its id alone and its level and place in the structure are looked up.

type Estructura = {
  asociaciones: string[];
  distritos: Record<string, string>;
  iglesias: Record<string, string>;
};

const estructura: Estructura = tabla.estructura;

function cargoDe(id: string): Cargo {
  if (id in estructura.iglesias) return { nivel: 'iglesia', iglesiaId: id };
  if (id in estructura.distritos) return { nivel: 'distrito', distritoId: id };
  return { nivel: 'asociacion', asociacionId: id };
}

function duenioDe(id: string): DuenioEnEstructura {
  const distritoDeIglesia = estructura.iglesias[id];
  if (distritoDeIglesia !== undefined) {
    return {
      alcance: 'iglesia',
      iglesiaId: id,
      distritoId: distritoDeIglesia,
      asociacionId: estructura.distritos[distritoDeIglesia],
    };
  }
  const asociacionDeDistrito = estructura.distritos[id];
  if (asociacionDeDistrito !== undefined) {
    return { alcance: 'distrito', distritoId: id, asociacionId: asociacionDeDistrito };
  }
  return { alcance: 'asociacion', asociacionId: id };
}

describe('cargosAbarcanDuenio', () => {
  it.each(tabla.casos)('$usuario, duenio $duenio: abarca $abarca', (caso) => {
    const cargos = (tabla.usuarios as Record<string, string[]>)[caso.usuario].map(cargoDe);

    expect(cargosAbarcanDuenio(cargos, duenioDe(caso.duenio))).toBe(caso.abarca);
  });

  it('has a case for every usuario and every duenio of the structure', () => {
    const duenios = [
      ...Object.keys(estructura.iglesias),
      ...Object.keys(estructura.distritos),
      ...estructura.asociaciones,
    ];

    for (const usuario of Object.keys(tabla.usuarios)) {
      const delUsuario = tabla.casos.filter((caso) => caso.usuario === usuario);

      expect(delUsuario.map((caso) => caso.duenio).sort()).toEqual([...duenios].sort());
    }
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

    // Every id below exists in the structure, but at another level. The table
    // cannot say this (its ids are unique), so it stays a hand-written case.
    expect(cargosAbarcanDuenio([{ nivel: 'iglesia', iglesiaId: 'y' }], iglesia)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'iglesia', iglesiaId: 'y' }], distrito)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'distrito', distritoId: 'x' }], iglesia)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'distrito', distritoId: 'z' }], distrito)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'distrito', distritoId: 'z' }], asociacion)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'asociacion', asociacionId: 'y' }], distrito)).toBe(false);
    expect(cargosAbarcanDuenio([{ nivel: 'asociacion', asociacionId: 'x' }], iglesia)).toBe(false);
  });
});
