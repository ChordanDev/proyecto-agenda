import { getChatEstado } from './getChatEstado';

describe('getChatEstado', () => {
  it('waits while the consentimiento is being read', () => {
    expect(getChatEstado({ consentimiento: 'leyendo', avisoRechazado: false })).toBe('cargando');
  });

  it('says so when the consentimiento could not be read', () => {
    expect(getChatEstado({ consentimiento: 'error', avisoRechazado: false })).toBe('error');
  });

  it('shows the aviso to a usuario who has not accepted it', () => {
    expect(getChatEstado({ consentimiento: 'no', avisoRechazado: false })).toBe('aviso');
  });

  it('shows the no aceptado estado once the aviso was turned down', () => {
    expect(getChatEstado({ consentimiento: 'no', avisoRechazado: true })).toBe('no-aceptado');
  });

  it('opens the conversacion to a usuario who accepted', () => {
    expect(getChatEstado({ consentimiento: 'si', avisoRechazado: false })).toBe('conversacion');
  });

  it('never shows the conversacion without consentimiento', () => {
    const sinAceptar = (['leyendo', 'error', 'no'] as const).flatMap((consentimiento) =>
      [false, true].map((avisoRechazado) => getChatEstado({ consentimiento, avisoRechazado })),
    );

    expect(sinAceptar).not.toContain('conversacion');
  });
});
