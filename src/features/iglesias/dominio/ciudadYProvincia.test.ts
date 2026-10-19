import { getCiudadYProvincia } from './ciudadYProvincia';

describe('getCiudadYProvincia', () => {
  it('shows the ciudad and the provincia', () => {
    expect(getCiudadYProvincia({ ciudad: 'Villa Mercedes', provincia: 'San Luis' })).toBe(
      'Villa Mercedes, San Luis',
    );
  });

  it('shows only the ciudad of an iglesia that still has no provincia', () => {
    expect(getCiudadYProvincia({ ciudad: 'Merlo', provincia: null })).toBe('Merlo');
  });
});
