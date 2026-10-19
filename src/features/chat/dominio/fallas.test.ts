import { getEstadoDeFalla, getVueltaDelChat, leerFalla, type Falla } from './fallas';

describe('getEstadoDeFalla', () => {
  it('shows each typed falla with its own estado', () => {
    expect(getEstadoDeFalla('sin_conexion')).toBe('sin-conexion');
    expect(getEstadoDeFalla('proveedor_caido')).toBe('caido');
    expect(getEstadoDeFalla('limite_diario')).toBe('limite-diario');
    expect(getEstadoDeFalla('presupuesto_agotado')).toBe('presupuesto-agotado');
  });

  it('shows any other falla as the asistente caído, which offers to retry', () => {
    const otras: Falla[] = [
      'sin_sesion',
      'pedido_invalido',
      'mensaje_largo',
      'sin_consentimiento',
      'error_servidor',
    ];

    expect(otras.map(getEstadoDeFalla)).toEqual(otras.map(() => 'caido'));
  });
});

describe('leerFalla', () => {
  it('reads the falla the server function answers', () => {
    expect(leerFalla({ falla: 'limite_diario' })).toBe('limite_diario');
    expect(leerFalla({ falla: 'presupuesto_agotado' })).toBe('presupuesto_agotado');
  });

  it('takes an unknown or missing falla as an error of the server', () => {
    expect(leerFalla({ falla: 'otra' })).toBe('error_servidor');
    expect(leerFalla({})).toBe('error_servidor');
    expect(leerFalla(null)).toBe('error_servidor');
    expect(leerFalla('limite_diario')).toBe('error_servidor');
  });
});

describe('getVueltaDelChat', () => {
  const zona = 'America/Argentina/Buenos_Aires';

  it('is the first day of the next mes of the asociacion', () => {
    expect(getVueltaDelChat(new Date('2026-10-19T15:00:00Z'), zona)).toBe('1 de noviembre');
  });

  it('counts the mes in the zona horaria of the asociacion, not in UTC', () => {
    // 1 November 01:00 UTC is still 31 October 22:00 in Buenos Aires.
    expect(getVueltaDelChat(new Date('2026-11-01T01:00:00Z'), zona)).toBe('1 de noviembre');
  });

  it('turns December into the 1 of January', () => {
    expect(getVueltaDelChat(new Date('2026-12-15T15:00:00Z'), zona)).toBe('1 de enero');
  });
});
