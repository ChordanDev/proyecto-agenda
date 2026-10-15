import { estadoSinIglesias } from './estadoSinIglesias';

describe('estadoSinIglesias', () => {
  it('shows the loading text only while the iglesias are really being read', () => {
    expect(estadoSinIglesias('fetching')).toBe('cargando');
  });

  it('shows the error with "Reintentar" while waiting for the connection', () => {
    expect(estadoSinIglesias('paused')).toBe('error');
  });

  it('shows the error with "Reintentar" when the reading failed and is over', () => {
    expect(estadoSinIglesias('idle')).toBe('error');
  });
});
