import {
  agruparUsuarios,
  buscarUsuarios,
  describirCargo,
  getAvisoDeCambioDeCorreo,
  getMensajeDeEdicion,
  getMensajeDeAlta,
  getMensajeDeCambioDeCorreo,
  getResumenDeCargos,
  OPCIONES_DE_CARGO,
  validarAlta,
  validarCorreoNuevo,
  validarFuncion,
  type CargoDelUsuario,
  type FilaDeCargo,
  type UsuarioDelAdmin,
} from './usuariosDelAdmin';

const fila = (
  datos: Partial<FilaDeCargo> & Pick<FilaDeCargo, 'cargoId' | 'usuarioId'>,
): FilaDeCargo => ({
  iglesiaId: null,
  distritoId: null,
  asociacionId: null,
  esSecretaria: false,
  funcion: null,
  ...datos,
});

const LUGARES = {
  iglesias: new Map([
    ['trapiche', 'El Trapiche'],
    ['central', 'Central'],
  ]),
  distritos: new Map([['centro', 'Distrito Centro']]),
};

describe('agruparUsuarios', () => {
  it('gives each usuario their nombre, correo and cargos, ordered by nombre', () => {
    const usuarios = agruparUsuarios({
      cargos: [
        fila({ cargoId: 'c1', usuarioId: 'luis', distritoId: 'centro' }),
        fila({ cargoId: 'c2', usuarioId: 'ana', iglesiaId: 'central', esSecretaria: true }),
        fila({ cargoId: 'c3', usuarioId: 'luis', iglesiaId: 'trapiche', funcion: 'Anciano' }),
      ],
      perfiles: new Map([
        ['luis', 'Luis Acosta'],
        ['ana', 'Ana Ruiz'],
      ]),
      correos: new Map([
        ['luis', 'luis@gmail.com'],
        ['ana', 'ana@gmail.com'],
      ]),
      ...LUGARES,
    });

    expect(usuarios).toEqual<UsuarioDelAdmin[]>([
      {
        usuarioId: 'ana',
        nombre: 'Ana Ruiz',
        nombreDelPerfil: 'Ana Ruiz',
        correo: 'ana@gmail.com',
        cargos: [
          {
            cargoId: 'c2',
            tipo: 'secretaria',
            funcion: null,
            lugar: { nivel: 'iglesia', id: 'central', nombre: 'Central' },
          },
        ],
      },
      {
        usuarioId: 'luis',
        nombre: 'Luis Acosta',
        nombreDelPerfil: 'Luis Acosta',
        correo: 'luis@gmail.com',
        cargos: [
          {
            cargoId: 'c1',
            tipo: 'pastor',
            funcion: null,
            lugar: { nivel: 'distrito', id: 'centro', nombre: 'Distrito Centro' },
          },
          {
            cargoId: 'c3',
            tipo: 'encargado',
            funcion: 'Anciano',
            lugar: { nivel: 'iglesia', id: 'trapiche', nombre: 'El Trapiche' },
          },
        ],
      },
    ]);
  });

  it('never lists the cargo of admin, nor a usuario who only holds that one', () => {
    const usuarios = agruparUsuarios({
      cargos: [
        fila({ cargoId: 'c1', usuarioId: 'admin', asociacionId: 'asociacion' }),
        fila({ cargoId: 'c2', usuarioId: 'luis', asociacionId: 'asociacion' }),
        fila({ cargoId: 'c3', usuarioId: 'luis', distritoId: 'centro' }),
      ],
      perfiles: new Map([['luis', 'Luis Acosta']]),
      correos: new Map(),
      ...LUGARES,
    });

    expect(usuarios.map((usuario) => usuario.usuarioId)).toEqual(['luis']);
    expect(usuarios[0].cargos.map((cargo) => cargo.cargoId)).toEqual(['c3']);
  });

  it('shows the correo, or a stand-in, while the usuario has no perfil', () => {
    const usuarios = agruparUsuarios({
      cargos: [
        fila({ cargoId: 'c1', usuarioId: 'sin-perfil', iglesiaId: 'central' }),
        fila({ cargoId: 'c2', usuarioId: 'nadie', iglesiaId: 'central' }),
      ],
      perfiles: new Map(),
      correos: new Map([['sin-perfil', 'sin.perfil@gmail.com']]),
      ...LUGARES,
    });

    expect(usuarios.map(({ nombre, nombreDelPerfil }) => ({ nombre, nombreDelPerfil }))).toEqual([
      { nombre: 'Sin nombre', nombreDelPerfil: null },
      { nombre: 'sin.perfil@gmail.com', nombreDelPerfil: null },
    ]);
  });

  it('leaves out a cargo whose iglesia or distrito it cannot name', () => {
    const usuarios = agruparUsuarios({
      cargos: [fila({ cargoId: 'c1', usuarioId: 'luis', iglesiaId: 'otra' })],
      perfiles: new Map([['luis', 'Luis Acosta']]),
      correos: new Map(),
      ...LUGARES,
    });

    expect(usuarios).toEqual([]);
  });
});

const PASTOR: CargoDelUsuario = {
  cargoId: 'c1',
  tipo: 'pastor',
  funcion: null,
  lugar: { nivel: 'distrito', id: 'centro', nombre: 'Distrito Centro' },
};
const ENCARGADO: CargoDelUsuario = {
  cargoId: 'c2',
  tipo: 'encargado',
  funcion: 'Anciano',
  lugar: { nivel: 'iglesia', id: 'trapiche', nombre: 'El Trapiche' },
};
const SECRETARIA: CargoDelUsuario = {
  cargoId: 'c3',
  tipo: 'secretaria',
  funcion: null,
  lugar: { nivel: 'iglesia', id: 'central', nombre: 'Central' },
};

describe('describirCargo', () => {
  it('names the cargo with its funcion, and where it is', () => {
    expect(describirCargo(PASTOR)).toEqual({ cargo: 'Pastor', donde: 'Distrito Centro' });
    expect(describirCargo(ENCARGADO)).toEqual({
      cargo: 'Encargado · Anciano',
      donde: 'El Trapiche',
    });
    expect(describirCargo(SECRETARIA)).toEqual({
      cargo: 'Secretaria de iglesia',
      donde: 'Central',
    });
  });
});

describe('getResumenDeCargos', () => {
  it('shows the first cargo and how many more', () => {
    expect(getResumenDeCargos([ENCARGADO])).toBe('Encargado · El Trapiche');
    expect(getResumenDeCargos([PASTOR, ENCARGADO])).toBe('Pastor · Distrito Centro y 1 cargo más');
    expect(getResumenDeCargos([PASTOR, ENCARGADO, SECRETARIA])).toBe(
      'Pastor · Distrito Centro y 2 cargos más',
    );
  });
});

describe('buscarUsuarios', () => {
  const usuarios: UsuarioDelAdmin[] = [
    {
      usuarioId: 'luis',
      nombre: 'Luis Acosta',
      nombreDelPerfil: 'Luis Acosta',
      correo: 'luis.acosta@gmail.com',
      cargos: [PASTOR],
    },
    {
      usuarioId: 'raul',
      nombre: 'Raúl Fernández',
      nombreDelPerfil: 'Raúl Fernández',
      correo: null,
      cargos: [ENCARGADO],
    },
  ];

  it('finds by a part of the nombre or the correo, ignoring accents and case', () => {
    expect(buscarUsuarios(usuarios, 'RAUL').map((u) => u.usuarioId)).toEqual(['raul']);
    expect(buscarUsuarios(usuarios, 'acosta@gm').map((u) => u.usuarioId)).toEqual(['luis']);
    expect(buscarUsuarios(usuarios, 'pereyra').map((u) => u.usuarioId)).toEqual([]);
    expect(buscarUsuarios(usuarios, '  ').map((u) => u.usuarioId)).toEqual(['luis', 'raul']);
  });
});

describe('OPCIONES_DE_CARGO', () => {
  it('offers encargado, secretaria and pastor, never admin', () => {
    expect(OPCIONES_DE_CARGO).toEqual([
      { valor: 'encargado', label: 'Encargado de iglesia' },
      { valor: 'secretaria', label: 'Secretaria de iglesia' },
      { valor: 'pastor', label: 'Pastor de distrito' },
    ]);
  });
});

describe('validarAlta', () => {
  const datos = { nombre: ' Pablo Ortiz ', correo: ' Pablo.Ortiz@Gmail.com ', funcion: '' };

  it('names a pastor of the chosen distrito', () => {
    expect(validarAlta(datos, 'pastor', 'centro')).toEqual({
      ok: true,
      invitacion: {
        nombre: 'Pablo Ortiz',
        correo: 'pablo.ortiz@gmail.com',
        funcion: null,
        lugar: { nivel: 'distrito', distritoId: 'centro' },
      },
    });
  });

  it('gives an encargado or a secretaria on the chosen iglesia', () => {
    expect(validarAlta(datos, 'encargado', 'central')).toMatchObject({
      ok: true,
      invitacion: { lugar: { nivel: 'iglesia', iglesiaId: 'central', esSecretaria: false } },
    });
    expect(validarAlta(datos, 'secretaria', 'central')).toMatchObject({
      ok: true,
      invitacion: { lugar: { nivel: 'iglesia', iglesiaId: 'central', esSecretaria: true } },
    });
  });

  it('asks for the cargo, and then for its iglesia or distrito', () => {
    expect(validarAlta(datos, null, null)).toEqual({
      ok: false,
      errores: { cargo: 'Elegí el cargo.' },
    });
    expect(validarAlta(datos, 'pastor', null)).toEqual({
      ok: false,
      errores: { lugar: 'Elegí el distrito.' },
    });
    expect(validarAlta(datos, 'secretaria', null)).toEqual({
      ok: false,
      errores: { lugar: 'Elegí la iglesia.' },
    });
  });

  it('checks the nombre and the correo as Agregar encargado does', () => {
    expect(validarAlta({ nombre: '', correo: 'no', funcion: '' }, 'pastor', 'centro')).toEqual({
      ok: false,
      errores: {
        nombre: 'Escribí el nombre.',
        correo: 'Escribí un correo válido, por ejemplo nombre@gmail.com.',
      },
    });
  });
});

describe('validarFuncion', () => {
  it('trims it, and an empty one is no funcion', () => {
    expect(validarFuncion(' Tesorero ')).toEqual({ ok: true, funcion: 'Tesorero' });
    expect(validarFuncion('  ')).toEqual({ ok: true, funcion: null });
  });

  it('rejects one longer than 60 letters', () => {
    expect(validarFuncion('a'.repeat(61))).toEqual({
      ok: false,
      error: 'La función puede tener hasta 60 letras.',
    });
  });
});

describe('validarCorreoNuevo', () => {
  it('reads the correo trimmed and in lower case', () => {
    expect(validarCorreoNuevo(' Luis.Pastor@Gmail.com ', 'luis@gmail.com')).toEqual({
      ok: true,
      correo: 'luis.pastor@gmail.com',
    });
  });

  it('rejects one that is not a correo, or the same one', () => {
    expect(validarCorreoNuevo('luis', 'luis@gmail.com')).toEqual({
      ok: false,
      error: 'Escribí un correo válido, por ejemplo nombre@gmail.com.',
    });
    expect(validarCorreoNuevo('LUIS@gmail.com', 'luis@gmail.com')).toEqual({
      ok: false,
      error: 'Es el correo que ya tiene.',
    });
  });
});

describe('getAvisoDeCambioDeCorreo', () => {
  it('says the old correo stops working, with the first nombre', () => {
    expect(getAvisoDeCambioDeCorreo('Luis Acosta')).toBe(
      'El correo actual deja de servir para entrar. Luis va a entrar con el código que le llegue al correo nuevo.',
    );
  });
});

describe('getMensajeDeCambioDeCorreo', () => {
  it('says when the correo is of another usuario', () => {
    expect(getMensajeDeCambioDeCorreo('correo_en_uso')).toEqual({
      titulo: 'No se pudo cambiar el correo.',
      texto: 'Ese correo ya es de otro usuario. Escribí otro.',
    });
  });

  it('says when the usuario holds a cargo the admin does not manage', () => {
    expect(getMensajeDeCambioDeCorreo('sin_permiso')).toEqual({
      titulo: 'No se pudo cambiar el correo.',
      texto: 'Esta persona tiene un cargo que no administrás.',
    });
  });

  it('asks to try again for anything else', () => {
    expect(getMensajeDeCambioDeCorreo('error_servidor')).toEqual({
      titulo: 'No se pudo cambiar el correo.',
      texto: 'Revisá la conexión y probá de nuevo.',
    });
  });
});

describe('getMensajeDeAlta', () => {
  it('says the cargo was given when only the correo de bienvenida failed', () => {
    expect(getMensajeDeAlta('correo_no_enviado')).toEqual({
      titulo: 'No se pudo enviar el correo de bienvenida.',
      texto: 'El cargo ya quedó dado. Probá de nuevo en un rato para reenviarlo.',
    });
  });

  it('says when the cargo cannot be given', () => {
    expect(getMensajeDeAlta('sin_permiso')).toEqual({
      titulo: 'No se pudo agregar.',
      texto: 'No podés dar ese cargo.',
    });
  });

  it('keeps what was written for anything else', () => {
    expect(getMensajeDeAlta('error_servidor')).toEqual({
      titulo: 'No se pudo agregar.',
      texto: 'Lo que escribiste sigue acá. Probá de nuevo en un rato.',
    });
  });
});

describe('getMensajeDeEdicion', () => {
  it('says when the nombre is shared with a cargo the admin does not manage', () => {
    expect(getMensajeDeEdicion('nombre_compartido')).toEqual({
      titulo: 'No se pudo cambiar el nombre.',
      texto:
        'Esta persona también tiene un cargo que no administrás, así que su nombre no se puede cambiar desde acá.',
    });
  });

  it('keeps what was written for anything else', () => {
    expect(getMensajeDeEdicion('error_servidor')).toEqual({
      titulo: 'No se pudieron guardar los cambios.',
      texto: 'Lo que escribiste sigue acá. Probá de nuevo en un rato.',
    });
  });
});
