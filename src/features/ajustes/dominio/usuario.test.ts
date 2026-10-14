import { describeUsuario } from './usuario';

describe('describeUsuario', () => {
  const iglesias = [
    { id: 'i1', nombre: 'Córdoba Central', distritoId: 'd1', distrito: 'Córdoba Centro' },
    { id: 'i2', nombre: 'Barrio Güemes', distritoId: 'd1', distrito: 'Córdoba Centro' },
  ];

  it('names the usuario by their email, with its first letter as initials', () => {
    const usuario = describeUsuario({ email: 'marta@example.com', cargos: [], iglesias });

    expect(usuario.titulo).toBe('marta@example.com');
    expect(usuario.iniciales).toBe('M');
  });

  it('describes the cargo of an encargado with the nombre of their iglesia', () => {
    const usuario = describeUsuario({
      email: 'e@example.com',
      cargos: [{ nivel: 'iglesia', iglesiaId: 'i2' }],
      iglesias,
    });

    expect(usuario.detalle).toBe('Encargado de calendario · Barrio Güemes');
  });

  it('describes the cargo of a pastor with the nombre of their distrito', () => {
    const usuario = describeUsuario({
      email: 'p@example.com',
      cargos: [{ nivel: 'distrito', distritoId: 'd1' }],
      iglesias,
    });

    expect(usuario.detalle).toBe('Pastor · Córdoba Centro');
  });

  it('describes the cargo of an admin', () => {
    const usuario = describeUsuario({
      email: 'a@example.com',
      cargos: [{ nivel: 'asociacion', asociacionId: 'a1' }],
      iglesias,
    });

    expect(usuario.detalle).toBe('Admin de la asociación');
  });

  it('leaves the place out while its nombre is unknown', () => {
    const usuario = describeUsuario({
      email: 'e@example.com',
      cargos: [{ nivel: 'iglesia', iglesiaId: 'i1' }],
      iglesias: undefined,
    });

    expect(usuario.detalle).toBe('Encargado de calendario');
  });

  it('counts several cargos', () => {
    const usuario = describeUsuario({
      email: 'x@example.com',
      cargos: [
        { nivel: 'iglesia', iglesiaId: 'i1' },
        { nivel: 'distrito', distritoId: 'd1' },
      ],
      iglesias,
    });

    expect(usuario.detalle).toBe('2 cargos');
  });

  it('says when the usuario has no cargos', () => {
    const usuario = describeUsuario({ email: 'x@example.com', cargos: [], iglesias });

    expect(usuario.detalle).toBe('Sin cargos asignados');
  });

  it('has no detalle while the cargos are still being read', () => {
    const usuario = describeUsuario({ email: 'x@example.com', cargos: undefined, iglesias });

    expect(usuario.detalle).toBeUndefined();
  });

  it('falls back to a generic title and no initials without an email', () => {
    const usuario = describeUsuario({ email: null, cargos: [], iglesias });

    expect(usuario.titulo).toBe('Tu usuario');
    expect(usuario.iniciales).toBe('');
  });
});
