import type { DuenioEnEstructura } from '@/features/sesion/dominio/cargosAbarcanDuenio';

import {
  getAvisoDeQuitar,
  getCompartidoDelDetalle,
  getConfirmacionDeQuitar,
  getIglesiasParaQuitar,
  getAvisoDeQuitado,
  type IglesiaSumada,
} from './eventoCompartido';

const central: DuenioEnEstructura = {
  alcance: 'iglesia',
  iglesiaId: 'iglesia-central',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};

const norte: IglesiaSumada = {
  id: 'iglesia-norte',
  nombre: 'Norte',
  distritoId: 'distrito-sur',
  asociacionId: 'asociacion-central',
};

const lasRosas: IglesiaSumada = {
  id: 'iglesia-las-rosas',
  nombre: 'Las Rosas',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};

describe('getIglesiasParaQuitar', () => {
  it('offers Quitar to the encargado of the iglesia sumada', () => {
    const cargos = [{ nivel: 'iglesia', iglesiaId: norte.id }] as const;

    expect(getIglesiasParaQuitar({ cargos }, central, [norte, lasRosas])).toEqual([norte]);
  });

  it('never offers Quitar to the hermano, not even in the iglesia sumada', () => {
    expect(getIglesiasParaQuitar({ iglesiaElegida: norte.id }, central, [norte])).toEqual([]);
  });

  it('does not offer Quitar to a pastor that covers the duenio and the iglesia sumada', () => {
    const cargos = [{ nivel: 'distrito', distritoId: 'distrito-norte' }] as const;

    expect(getIglesiasParaQuitar({ cargos }, central, [lasRosas])).toEqual([]);
  });

  it('offers Quitar to a pastor of the iglesia sumada that does not cover the duenio', () => {
    const cargos = [{ nivel: 'distrito', distritoId: 'distrito-sur' }] as const;

    expect(getIglesiasParaQuitar({ cargos }, central, [norte, lasRosas])).toEqual([norte]);
  });

  it('does not offer Quitar to the encargado of an iglesia that is not sumada', () => {
    const cargos = [{ nivel: 'iglesia', iglesiaId: 'iglesia-oeste' }] as const;

    expect(getIglesiasParaQuitar({ cargos }, central, [norte])).toEqual([]);
  });

  it('does not offer Quitar to an iglesia sumada that also sees the evento by its alcance', () => {
    const delDistrito: DuenioEnEstructura = {
      alcance: 'distrito',
      distritoId: 'distrito-norte',
      asociacionId: 'asociacion-central',
    };
    const cargos = [{ nivel: 'iglesia', iglesiaId: lasRosas.id }] as const;

    expect(getIglesiasParaQuitar({ cargos }, delDistrito, [lasRosas])).toEqual([]);
  });
});

describe('getCompartidoDelDetalle', () => {
  it('shows nothing for an evento that is not shared', () => {
    expect(
      getCompartidoDelDetalle({ iglesiaElegida: null }, central, 'Iglesia Central', []),
    ).toBeNull();
  });

  it('lists the iglesias sumadas by nombre to the duenio, without "Compartido por"', () => {
    const cargos = [{ nivel: 'iglesia', iglesiaId: 'iglesia-central' }] as const;

    expect(
      getCompartidoDelDetalle({ cargos }, central, 'Iglesia Central', [norte, lasRosas]),
    ).toEqual({
      iglesias: [
        { id: lasRosas.id, nombre: 'Iglesia Las Rosas', esMia: false },
        { id: norte.id, nombre: 'Iglesia Norte', esMia: false },
      ],
      compartidoPor: null,
    });
  });

  it('tells the iglesia sumada who shares the evento, with her iglesia first', () => {
    const cargos = [{ nivel: 'iglesia', iglesiaId: norte.id }] as const;

    expect(
      getCompartidoDelDetalle({ cargos }, central, 'Iglesia Central', [lasRosas, norte]),
    ).toEqual({
      iglesias: [
        { id: norte.id, nombre: 'Iglesia Norte', esMia: true },
        { id: lasRosas.id, nombre: 'Iglesia Las Rosas', esMia: false },
      ],
      compartidoPor: 'Iglesia Central',
    });
  });

  it('tells the hermano of an iglesia sumada who shares the evento', () => {
    expect(
      getCompartidoDelDetalle({ iglesiaElegida: norte.id }, central, 'Iglesia Central', [norte]),
    ).toMatchObject({
      iglesias: [{ id: norte.id, esMia: true }],
      compartidoPor: 'Iglesia Central',
    });
  });

  it('does not say "Compartido por" to the hermano of the duenio', () => {
    expect(
      getCompartidoDelDetalle({ iglesiaElegida: central.iglesiaId }, central, 'Iglesia Central', [
        norte,
      ]),
    ).toMatchObject({ compartidoPor: null });
  });

  it('marks no iglesia as mine for a pastor that covers the duenio', () => {
    const cargos = [{ nivel: 'distrito', distritoId: 'distrito-norte' }] as const;

    expect(getCompartidoDelDetalle({ cargos }, central, 'Iglesia Central', [lasRosas])).toEqual({
      iglesias: [{ id: lasRosas.id, nombre: 'Iglesia Las Rosas', esMia: false }],
      compartidoPor: null,
    });
  });

  it('leaves out an iglesia sumada that sees the evento by its alcance', () => {
    const delDistrito: DuenioEnEstructura = {
      alcance: 'distrito',
      distritoId: 'distrito-norte',
      asociacionId: 'asociacion-central',
    };

    expect(
      getCompartidoDelDetalle({ iglesiaElegida: lasRosas.id }, delDistrito, 'Distrito Norte', [
        lasRosas,
      ]),
    ).toBeNull();
  });
});

describe('the texts of Quitar', () => {
  it('asks before quitar, naming the iglesia and the duenio', () => {
    expect(getConfirmacionDeQuitar('Iglesia Norte', 'Iglesia Central')).toEqual({
      titulo: '¿Quitar de tu calendario?',
      mensaje:
        'Este evento ya no se va a ver en el calendario de Iglesia Norte. Iglesia Central lo va a seguir teniendo.',
    });
  });

  it('says under the button that the other iglesias keep it', () => {
    expect(getAvisoDeQuitar('Iglesia Norte')).toBe(
      'Solo lo quita de Iglesia Norte. Las demás iglesias lo siguen viendo.',
    );
  });
});

describe('getAvisoDeQuitado', () => {
  it('says where it was quitado from once the evento read again no longer has the iglesia', () => {
    expect(getAvisoDeQuitado(norte, central, [lasRosas])).toBe(
      'Ya no aparece en el calendario de Iglesia Norte.',
    );
  });

  it('says nothing while the evento read again still has the iglesia sumada', () => {
    expect(getAvisoDeQuitado(norte, central, [norte, lasRosas])).toBeNull();
  });

  it('says nothing when the iglesia still sees the evento by its alcance', () => {
    // Meanwhile the duenio made it an evento of the distrito of Norte, which
    // dropped her as sumada: the quitar found nothing to delete.
    const delDistritoDeNorte: DuenioEnEstructura = {
      alcance: 'distrito',
      distritoId: norte.distritoId,
      asociacionId: norte.asociacionId,
    };

    expect(getAvisoDeQuitado(norte, delDistritoDeNorte, [])).toBeNull();
  });
});
