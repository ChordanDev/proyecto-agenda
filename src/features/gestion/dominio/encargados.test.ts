import {
  getDatosIniciales,
  getDatosTrasFalla,
  getIniciales,
  getMensajeDeError,
  getSubtituloDeIglesia,
  getTextosDelFormulario,
  getTextosDeQuitar,
  nombreDeEncargado,
  ordenarEncargados,
  puedeEditarEncargado,
  validarEncargado,
  validarIglesia,
  type Encargado,
} from './encargados';

function encargado(datos: Partial<Encargado> & Pick<Encargado, 'nombre'>): Encargado {
  return {
    cargoId: `cargo-${datos.nombre}`,
    usuarioId: `usuario-${datos.nombre}`,
    nombreDelPerfil: datos.nombre,
    correo: null,
    funcion: null,
    esSecretaria: false,
    ...datos,
  };
}

describe('getIniciales', () => {
  it('takes the first letter of the first two words, in upper case', () => {
    expect(getIniciales('Marta Gómez')).toBe('MG');
    expect(getIniciales('raúl fernández benítez')).toBe('RF');
  });

  it('takes one letter from a single word, and keeps its accent', () => {
    expect(getIniciales('Ángel')).toBe('Á');
  });

  it('ignores the spaces around and between the words', () => {
    expect(getIniciales('  Laura   Sosa ')).toBe('LS');
  });

  it('gives nothing for a blank nombre', () => {
    expect(getIniciales('   ')).toBe('');
  });
});

describe('nombreDeEncargado', () => {
  it('is the nombre of the perfil', () => {
    expect(nombreDeEncargado('Raúl Fernández', 'raul@example.com')).toBe('Raúl Fernández');
  });

  it('is the correo when the usuario has no perfil yet', () => {
    expect(nombreDeEncargado(null, 'raul@example.com')).toBe('raul@example.com');
  });

  it('is a placeholder when neither is known', () => {
    expect(nombreDeEncargado(null, null)).toBe('Sin nombre');
  });
});

describe('getDatosIniciales', () => {
  it('starts adding with every field empty', () => {
    expect(getDatosIniciales(null)).toEqual({ nombre: '', correo: '', funcion: '' });
  });

  it('starts editing with the nombre of the perfil, the correo and the funcion', () => {
    expect(
      getDatosIniciales(
        encargado({ nombre: 'Raúl Fernández', correo: 'raul@example.com', funcion: 'Tesorero' }),
      ),
    ).toEqual({ nombre: 'Raúl Fernández', correo: 'raul@example.com', funcion: 'Tesorero' });
  });

  it('leaves the nombre empty when the usuario has no perfil, never the correo the list shows', () => {
    expect(
      getDatosIniciales(
        encargado({
          nombre: 'raul@example.com',
          nombreDelPerfil: null,
          correo: 'raul@example.com',
          funcion: null,
        }),
      ),
    ).toEqual({ nombre: '', correo: 'raul@example.com', funcion: '' });
  });

  it('leaves the nombre empty when neither the perfil nor the correo is known', () => {
    expect(
      getDatosIniciales(encargado({ nombre: 'Sin nombre', nombreDelPerfil: null })).nombre,
    ).toBe('');
  });
});

describe('getDatosTrasFalla', () => {
  const iniciales = { nombre: 'Raúl Fernández', correo: 'raul@example.com', funcion: 'Tesorero' };
  const escritos = { nombre: 'Raúl F.', correo: 'raul@example.com', funcion: 'Anciano' };

  it('puts the nombre back when it could not change, and keeps the funcion written', () => {
    expect(getDatosTrasFalla(escritos, iniciales, 'nombre_compartido')).toEqual({
      nombre: 'Raúl Fernández',
      correo: 'raul@example.com',
      funcion: 'Anciano',
    });
  });

  it('keeps everything written after any other falla', () => {
    expect(getDatosTrasFalla(escritos, iniciales, 'error_servidor')).toBe(escritos);
    expect(getDatosTrasFalla(escritos, iniciales, 'sin_permiso')).toBe(escritos);
  });
});

describe('ordenarEncargados', () => {
  it('puts the usuario first, then the secretarias, then the rest by nombre', () => {
    const carlos = encargado({ nombre: 'Carlos Benítez' });
    const raul = encargado({ nombre: 'Raúl Fernández' });
    const laura = encargado({ nombre: 'Laura Sosa', esSecretaria: true });
    const marta = encargado({ nombre: 'Marta Gómez', esSecretaria: true });
    const angel = encargado({ nombre: 'Ángel Díaz' });

    expect(
      ordenarEncargados([raul, laura, carlos, marta, angel], marta.usuarioId).map((e) => e.nombre),
    ).toEqual(['Marta Gómez', 'Laura Sosa', 'Ángel Díaz', 'Carlos Benítez', 'Raúl Fernández']);
  });

  it('does not change the list it receives', () => {
    const lista = [encargado({ nombre: 'B' }), encargado({ nombre: 'A' })];
    ordenarEncargados(lista, 'nadie');
    expect(lista.map((e) => e.nombre)).toEqual(['B', 'A']);
  });
});

describe('puedeEditarEncargado', () => {
  it('lets the secretaria edit a common encargado', () => {
    expect(puedeEditarEncargado(encargado({ nombre: 'Raúl' }))).toBe(true);
  });

  it('never lets her edit a secretaria, herself included', () => {
    expect(puedeEditarEncargado(encargado({ nombre: 'Laura', esSecretaria: true }))).toBe(false);
  });

  it('lets the pastor edit a common encargado and a secretaria', () => {
    expect(puedeEditarEncargado(encargado({ nombre: 'Raúl' }), 'pastor')).toBe(true);
    expect(puedeEditarEncargado(encargado({ nombre: 'Laura', esSecretaria: true }), 'pastor')).toBe(
      true,
    );
  });
});

describe('validarIglesia', () => {
  it('asks the pastor to choose the iglesia', () => {
    expect(validarIglesia(null)).toBe('Elegí la iglesia.');
  });

  it('accepts a chosen iglesia', () => {
    expect(validarIglesia('central')).toBeUndefined();
  });
});

describe('getSubtituloDeIglesia', () => {
  it('says the iglesia and how many encargados it has', () => {
    expect(getSubtituloDeIglesia('Iglesia Central', 4)).toBe('Iglesia Central · 4 encargados');
  });

  it('says one encargado in singular', () => {
    expect(getSubtituloDeIglesia('Iglesia Central', 1)).toBe('Iglesia Central · 1 encargado');
  });
});

describe('validarEncargado', () => {
  it('accepts a new encargado, trimmed, with the correo in lower case', () => {
    expect(
      validarEncargado(
        { nombre: ' Lucía Martínez ', correo: ' Lucia@Gmail.com ', funcion: ' Tesorera ' },
        'agregar',
      ),
    ).toEqual({
      ok: true,
      valores: { nombre: 'Lucía Martínez', correo: 'lucia@gmail.com', funcion: 'Tesorera' },
    });
  });

  it('takes a blank funcion as no funcion', () => {
    expect(
      validarEncargado({ nombre: 'Lucía', correo: 'lucia@gmail.com', funcion: '  ' }, 'agregar'),
    ).toEqual({ ok: true, valores: { nombre: 'Lucía', correo: 'lucia@gmail.com', funcion: null } });
  });

  it('asks for the nombre and a valid correo', () => {
    expect(validarEncargado({ nombre: ' ', correo: 'lucia', funcion: '' }, 'agregar')).toEqual({
      ok: false,
      errores: {
        nombre: 'Escribí el nombre.',
        correo: 'Escribí un correo válido, por ejemplo nombre@gmail.com.',
      },
    });
  });

  it('does not ask for the correo when editing: it cannot change', () => {
    expect(validarEncargado({ nombre: 'Raúl', correo: '', funcion: 'Tesorero' }, 'editar')).toEqual(
      { ok: true, valores: { nombre: 'Raúl', correo: '', funcion: 'Tesorero' } },
    );
  });

  it('rejects a nombre or a funcion longer than the database takes', () => {
    expect(
      validarEncargado({ nombre: 'a'.repeat(101), correo: '', funcion: 'b'.repeat(61) }, 'editar'),
    ).toEqual({
      ok: false,
      errores: {
        nombre: 'El nombre puede tener hasta 100 letras.',
        funcion: 'La función puede tener hasta 60 letras.',
      },
    });
  });
});

describe('getTextosDelFormulario', () => {
  it('has the texts of adding', () => {
    expect(getTextosDelFormulario('agregar', false)).toEqual({
      titulo: 'Agregar encargado',
      boton: 'Agregar encargado',
      sinConexion: 'Para agregar un encargado hace falta conexión.',
    });
  });

  it('has the texts of editing', () => {
    expect(getTextosDelFormulario('editar', false)).toEqual({
      titulo: 'Editar encargado',
      boton: 'Guardar cambios',
      sinConexion: 'Para guardar cambios hace falta conexión.',
    });
  });

  it('offers to try again after an error', () => {
    expect(getTextosDelFormulario('agregar', true).boton).toBe('Probar de nuevo');
    expect(getTextosDelFormulario('editar', true).boton).toBe('Probar de nuevo');
  });
});

describe('getTextosDeQuitar', () => {
  it('names the person and the iglesia, and says the account stays', () => {
    expect(getTextosDeQuitar('Raúl Fernández', 'Iglesia Central')).toEqual({
      titulo: '¿Quitarle el cargo a Raúl Fernández?',
      texto: 'Deja de poder cargar eventos de Iglesia Central desde ahora. Su cuenta no se borra.',
    });
  });
});

describe('getMensajeDeError', () => {
  it('says what failed and that what was written stays', () => {
    expect(getMensajeDeError('agregar', 'error_servidor')).toEqual({
      titulo: 'No se pudo agregar.',
      texto: 'Lo que escribiste sigue acá. Probá de nuevo en un rato.',
    });
    expect(getMensajeDeError('editar', 'error_servidor')).toEqual({
      titulo: 'No se pudieron guardar los cambios.',
      texto: 'Lo que escribiste sigue acá. Probá de nuevo en un rato.',
    });
    expect(getMensajeDeError('quitar', 'error_servidor')).toEqual({
      titulo: 'No se pudo quitar el cargo.',
      texto: 'Probá de nuevo en un rato.',
    });
  });

  it('says the cargo was given when only the correo de bienvenida failed', () => {
    expect(getMensajeDeError('agregar', 'correo_no_enviado')).toEqual({
      titulo: 'No se pudo enviar el correo de bienvenida.',
      texto: 'El encargado ya quedó agregado. Probá de nuevo en un rato para reenviarlo.',
    });
  });

  it('says the cargo cannot be given when the server does not allow it', () => {
    expect(getMensajeDeError('agregar', 'sin_permiso')).toEqual({
      titulo: 'No se pudo agregar.',
      texto: 'Esa persona ya tiene en esta iglesia un cargo que no podés cambiar.',
    });
  });

  it('says the nombre is shared when it cannot change', () => {
    expect(getMensajeDeError('editar', 'nombre_compartido')).toEqual({
      titulo: 'No se pudo cambiar el nombre.',
      texto:
        'Esta persona también tiene un cargo en otro lugar, así que su nombre no se puede cambiar desde acá. Volvimos a poner el nombre que tenía: tocá "Probar de nuevo" para guardar la función.',
    });
  });
});
