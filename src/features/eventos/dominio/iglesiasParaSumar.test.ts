import { getIglesiasParaSumar } from './iglesiasParaSumar';

const IGLESIAS = [
  { id: 'i1', distritoId: 'd1' },
  { id: 'i2', distritoId: 'd1' },
  { id: 'i3', distritoId: 'd2' },
  { id: 'i4', distritoId: 'd2' },
];

describe('getIglesiasParaSumar', () => {
  it('offers every iglesia but the duenia for an evento of iglesia', () => {
    expect(getIglesiasParaSumar({ alcance: 'iglesia', iglesiaId: 'i1' }, IGLESIAS)).toEqual([
      { id: 'i2', distritoId: 'd1' },
      { id: 'i3', distritoId: 'd2' },
      { id: 'i4', distritoId: 'd2' },
    ]);
  });

  it('does not offer the iglesias of the distrito for an evento of distrito', () => {
    expect(getIglesiasParaSumar({ alcance: 'distrito', distritoId: 'd1' }, IGLESIAS)).toEqual([
      { id: 'i3', distritoId: 'd2' },
      { id: 'i4', distritoId: 'd2' },
    ]);
  });

  it('offers none for an evento of asociacion', () => {
    expect(getIglesiasParaSumar({ alcance: 'asociacion', asociacionId: 'a1' }, IGLESIAS)).toEqual(
      [],
    );
  });

  it('keeps what else each iglesia carries, in its order', () => {
    const iglesias = [
      { id: 'i4', distritoId: 'd2', nombre: 'Cuarta' },
      { id: 'i3', distritoId: 'd2', nombre: 'Tercera' },
    ];

    expect(getIglesiasParaSumar({ alcance: 'iglesia', iglesiaId: 'i1' }, iglesias)).toEqual(
      iglesias,
    );
  });
});
