import { aceptaCambios, puedeConfirmar } from './puedeConfirmar';

describe('puedeConfirmar', () => {
  const visibles = [{ id: 'a' }, { id: 'b' }];

  it('allows confirming a marked iglesia that is among the visible results', () => {
    expect(puedeConfirmar('b', visibles)).toBe(true);
  });

  it('rejects when nothing is marked', () => {
    expect(puedeConfirmar(null, visibles)).toBe(false);
  });

  it('rejects when the marked iglesia is hidden by the search', () => {
    expect(puedeConfirmar('z', visibles)).toBe(false);
  });

  it('rejects when there are no visible results', () => {
    expect(puedeConfirmar('a', [])).toBe(false);
  });
});

describe('aceptaCambios', () => {
  it('accepts marking a row and going back before saving and after an error', () => {
    expect(aceptaCambios('idle')).toBe(true);
    expect(aceptaCambios('error')).toBe(true);
  });

  it('rejects changes while saving and once saved', () => {
    expect(aceptaCambios('pending')).toBe(false);
    expect(aceptaCambios('success')).toBe(false);
  });
});
