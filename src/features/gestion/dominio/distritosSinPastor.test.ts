import {
  getAvisoDeDistritosSinPastor,
  getDistritosSinPastor,
  type DistritoDelAdmin,
} from './distritosSinPastor';

function distrito(nombre: string, pastores: string[]): DistritoDelAdmin {
  return { id: nombre, nombre, cantidadDeIglesias: 2, pastores };
}

describe('getDistritosSinPastor', () => {
  it('returns the distritos without any cargo de pastor', () => {
    const distritos = [
      distrito('Distrito Norte', ['Juan Ramírez']),
      distrito('Distrito Sur', []),
      distrito('Distrito Centro', ['Luis Acosta', 'Ana Gómez']),
      distrito('Distrito Oeste', []),
    ];

    expect(getDistritosSinPastor(distritos).map((uno) => uno.nombre)).toEqual([
      'Distrito Sur',
      'Distrito Oeste',
    ]);
  });
});

describe('getAvisoDeDistritosSinPastor', () => {
  it('names the two distritos without pastor', () => {
    const aviso = getAvisoDeDistritosSinPastor([
      distrito('Distrito Norte', ['Juan Ramírez']),
      distrito('Distrito Sur', []),
      distrito('Distrito Oeste', []),
    ]);

    expect(aviso).toEqual({
      titulo: '2 distritos sin pastor',
      texto: 'Distrito Sur y Distrito Oeste no tienen quién gestione sus encargados.',
    });
  });

  it('names a single distrito in the singular', () => {
    const aviso = getAvisoDeDistritosSinPastor([
      distrito('Distrito Norte', ['Juan Ramírez']),
      distrito('Distrito Sur', []),
    ]);

    expect(aviso).toEqual({
      titulo: '1 distrito sin pastor',
      texto: 'Distrito Sur no tiene quién gestione sus encargados.',
    });
  });

  it('names three or more distritos separated by commas', () => {
    const aviso = getAvisoDeDistritosSinPastor([
      distrito('Distrito Norte', []),
      distrito('Distrito Sur', []),
      distrito('Distrito Oeste', []),
    ]);

    expect(aviso?.texto).toBe(
      'Distrito Norte, Distrito Sur y Distrito Oeste no tienen quién gestione sus encargados.',
    );
  });

  it('gives no aviso when every distrito has a pastor', () => {
    expect(getAvisoDeDistritosSinPastor([distrito('Distrito Norte', ['Juan Ramírez'])])).toBeNull();
    expect(getAvisoDeDistritosSinPastor([])).toBeNull();
  });
});
