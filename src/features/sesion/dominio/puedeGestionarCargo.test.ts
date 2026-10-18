import {
  puedeCambiarCorreo,
  puedeGestionarCargo,
  type CargoEnEstructura,
} from './puedeGestionarCargo';

// The structure of the cases:
//
//   asociacion a1
//     distrito d1: iglesias i1 and i2
//     distrito d2: iglesia i3
//   asociacion a2
//     distrito d3: iglesia i4

const DISTRITO_DE_IGLESIA: Record<string, string> = { i1: 'd1', i2: 'd1', i3: 'd2', i4: 'd3' };

function asociacionDe(distritoId: string): string {
  return distritoId === 'd3' ? 'a2' : 'a1';
}

function deIglesia(iglesiaId: string, esSecretaria: boolean): CargoEnEstructura {
  const distritoId = DISTRITO_DE_IGLESIA[iglesiaId];
  return {
    nivel: 'iglesia',
    iglesiaId,
    distritoId,
    asociacionId: asociacionDe(distritoId),
    esSecretaria,
  };
}

const encargado = (iglesiaId: string) => deIglesia(iglesiaId, false);
const secretaria = (iglesiaId: string) => deIglesia(iglesiaId, true);

function pastor(distritoId: string): CargoEnEstructura {
  return { nivel: 'distrito', distritoId, asociacionId: asociacionDe(distritoId) };
}

function admin(asociacionId: string): CargoEnEstructura {
  return { nivel: 'asociacion', asociacionId };
}

describe('puedeGestionarCargo', () => {
  describe('the secretaria de iglesia', () => {
    const gestor = [secretaria('i1')];

    it('manages the encargados of her iglesia', () => {
      expect(puedeGestionarCargo(gestor, encargado('i1'))).toBe(true);
    });

    it('does not manage the secretarias of her iglesia, herself included', () => {
      expect(puedeGestionarCargo(gestor, secretaria('i1'))).toBe(false);
    });

    it('does not manage the encargados of another iglesia, even of her distrito', () => {
      expect(puedeGestionarCargo(gestor, encargado('i2'))).toBe(false);
      expect(puedeGestionarCargo(gestor, encargado('i3'))).toBe(false);
    });

    it('does not manage pastores or admins', () => {
      expect(puedeGestionarCargo(gestor, pastor('d1'))).toBe(false);
      expect(puedeGestionarCargo(gestor, admin('a1'))).toBe(false);
    });
  });

  describe('a common encargado', () => {
    it('manages no cargo, not even of their own iglesia', () => {
      const gestor = [encargado('i1')];

      expect(puedeGestionarCargo(gestor, encargado('i1'))).toBe(false);
      expect(puedeGestionarCargo(gestor, secretaria('i1'))).toBe(false);
    });
  });

  describe('the pastor', () => {
    const gestor = [pastor('d1')];

    it('manages the encargados and secretarias of every iglesia of their distrito', () => {
      expect(puedeGestionarCargo(gestor, encargado('i1'))).toBe(true);
      expect(puedeGestionarCargo(gestor, encargado('i2'))).toBe(true);
      expect(puedeGestionarCargo(gestor, secretaria('i1'))).toBe(true);
      expect(puedeGestionarCargo(gestor, secretaria('i2'))).toBe(true);
    });

    it('does not manage the cargos of iglesias of another distrito', () => {
      expect(puedeGestionarCargo(gestor, encargado('i3'))).toBe(false);
      expect(puedeGestionarCargo(gestor, secretaria('i3'))).toBe(false);
      expect(puedeGestionarCargo(gestor, encargado('i4'))).toBe(false);
    });

    it('does not manage pastores, of their distrito or another, nor admins', () => {
      expect(puedeGestionarCargo(gestor, pastor('d1'))).toBe(false);
      expect(puedeGestionarCargo(gestor, pastor('d2'))).toBe(false);
      expect(puedeGestionarCargo(gestor, admin('a1'))).toBe(false);
    });
  });

  describe('the admin', () => {
    const gestor = [admin('a1')];

    it('manages encargados, secretarias and pastores of their asociacion', () => {
      expect(puedeGestionarCargo(gestor, encargado('i3'))).toBe(true);
      expect(puedeGestionarCargo(gestor, secretaria('i1'))).toBe(true);
      expect(puedeGestionarCargo(gestor, pastor('d1'))).toBe(true);
      expect(puedeGestionarCargo(gestor, pastor('d2'))).toBe(true);
    });

    it('never manages admins, of their asociacion or another', () => {
      expect(puedeGestionarCargo(gestor, admin('a1'))).toBe(false);
      expect(puedeGestionarCargo(gestor, admin('a2'))).toBe(false);
    });

    it('does not manage the cargos of another asociacion', () => {
      expect(puedeGestionarCargo(gestor, encargado('i4'))).toBe(false);
      expect(puedeGestionarCargo(gestor, pastor('d3'))).toBe(false);
    });
  });

  it('is enough that one of several cargos manages the cargo', () => {
    const gestor = [encargado('i3'), pastor('d1')];

    expect(puedeGestionarCargo(gestor, secretaria('i2'))).toBe(true);
    expect(puedeGestionarCargo(gestor, encargado('i3'))).toBe(false);
  });

  it('a usuario without cargos manages nothing', () => {
    expect(puedeGestionarCargo([], encargado('i1'))).toBe(false);
  });
});

describe('puedeCambiarCorreo', () => {
  it('lets the admin change the correo of the cargos they manage', () => {
    expect(puedeCambiarCorreo([admin('a1')], encargado('i1'))).toBe(true);
    expect(puedeCambiarCorreo([admin('a1')], secretaria('i1'))).toBe(true);
    expect(puedeCambiarCorreo([admin('a1')], pastor('d2'))).toBe(true);
  });

  it('does not let the admin change the correo of another admin or of another asociacion', () => {
    expect(puedeCambiarCorreo([admin('a1')], admin('a1'))).toBe(false);
    expect(puedeCambiarCorreo([admin('a1')], encargado('i4'))).toBe(false);
  });

  it('does not let the pastor or the secretaria change a correo, even of cargos they manage', () => {
    expect(puedeCambiarCorreo([pastor('d1')], encargado('i1'))).toBe(false);
    expect(puedeCambiarCorreo([pastor('d1')], secretaria('i1'))).toBe(false);
    expect(puedeCambiarCorreo([secretaria('i1')], encargado('i1'))).toBe(false);
  });
});
