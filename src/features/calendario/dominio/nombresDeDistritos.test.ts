import { armarNombresDeDistritos } from './nombresDeDistritos';

describe('armarNombresDeDistritos', () => {
  it('names each distrito that owns an evento, by its id', () => {
    expect(
      armarNombresDeDistritos([
        { duenioDistritoId: 'distrito-norte', nombreDeDistrito: 'Distrito Norte' },
        { duenioDistritoId: 'distrito-centro', nombreDeDistrito: 'Distrito Centro' },
      ]),
    ).toEqual({ 'distrito-norte': 'Distrito Norte', 'distrito-centro': 'Distrito Centro' });
  });

  it('ignores an evento that no distrito owns', () => {
    expect(armarNombresDeDistritos([{ duenioDistritoId: null, nombreDeDistrito: null }])).toEqual(
      {},
    );
  });

  it('ignores an owner whose nombre could not be read', () => {
    expect(
      armarNombresDeDistritos([{ duenioDistritoId: 'distrito-norte', nombreDeDistrito: null }]),
    ).toEqual({});
  });

  it('names a distrito once however many eventos it owns', () => {
    const row = { duenioDistritoId: 'distrito-norte', nombreDeDistrito: 'Distrito Norte' };

    expect(armarNombresDeDistritos([row, row])).toEqual({ 'distrito-norte': 'Distrito Norte' });
  });

  it('returns no nombres for no eventos', () => {
    expect(armarNombresDeDistritos([])).toEqual({});
  });
});
