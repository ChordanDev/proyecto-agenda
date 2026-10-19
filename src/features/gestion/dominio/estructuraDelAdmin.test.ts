import {
  buscarIglesiasDelAdmin,
  getAvisoDeCambioDeDistrito,
  getEtiquetaDePastores,
  getSubtituloDeAsociacion,
  getTextoDeIglesias,
  ordenarPorNombre,
  validarDistrito,
  validarIglesia,
  type IglesiaDelAdmin,
} from './estructuraDelAdmin';

function iglesia(nombre: string, distritoNombre = 'Distrito Norte'): IglesiaDelAdmin {
  return {
    id: nombre,
    nombre,
    direccion: 'Calle 1',
    localidad: 'San Luis',
    distritoId: distritoNombre,
    distritoNombre,
  };
}

describe('getSubtituloDeAsociacion', () => {
  it('counts the distritos and the iglesias', () => {
    expect(getSubtituloDeAsociacion('Asociación', 4, 14)).toBe(
      'Asociación · 4 distritos · 14 iglesias',
    );
  });

  it('uses the singular for one', () => {
    expect(getSubtituloDeAsociacion('Asociación', 1, 1)).toBe(
      'Asociación · 1 distrito · 1 iglesia',
    );
  });
});

describe('getTextoDeIglesias', () => {
  it('counts the iglesias of a distrito', () => {
    expect(getTextoDeIglesias(4)).toBe('4 iglesias');
    expect(getTextoDeIglesias(1)).toBe('1 iglesia');
    expect(getTextoDeIglesias(0)).toBe('Sin iglesias');
  });
});

describe('getEtiquetaDePastores', () => {
  it('names the pastor', () => {
    expect(getEtiquetaDePastores(['Juan Ramírez'])).toBe('Pr. Juan Ramírez');
  });

  it('names every pastor of a distrito with several', () => {
    expect(getEtiquetaDePastores(['Luis Acosta', 'Ana Gómez'])).toBe(
      'Pr. Luis Acosta y Pr. Ana Gómez',
    );
  });

  it('is null without a pastor', () => {
    expect(getEtiquetaDePastores([])).toBeNull();
  });
});

describe('ordenarPorNombre', () => {
  it('orders by nombre, ignoring accents and case', () => {
    const ordenadas = ordenarPorNombre([
      iglesia('iglesia Las Rosas'),
      iglesia('Iglesia Central'),
      iglesia('Iglesia Ábaco'),
    ]);

    expect(ordenadas.map((una) => una.nombre)).toEqual([
      'Iglesia Ábaco',
      'Iglesia Central',
      'iglesia Las Rosas',
    ]);
  });
});

describe('buscarIglesiasDelAdmin', () => {
  const iglesias = [iglesia('Iglesia Central'), iglesia('Iglesia El Trapiche', 'Distrito Sur')];

  it('returns every iglesia without a text', () => {
    expect(buscarIglesiasDelAdmin(iglesias, '  ')).toHaveLength(2);
  });

  it('matches a part of the nombre, ignoring accents and case', () => {
    expect(buscarIglesiasDelAdmin(iglesias, 'TRAPÍCHE').map((una) => una.nombre)).toEqual([
      'Iglesia El Trapiche',
    ]);
  });

  it('matches the localidad and the distrito too', () => {
    expect(buscarIglesiasDelAdmin(iglesias, 'distrito sur').map((una) => una.nombre)).toEqual([
      'Iglesia El Trapiche',
    ]);
    expect(buscarIglesiasDelAdmin(iglesias, 'san luis')).toHaveLength(2);
  });
});

describe('getAvisoDeCambioDeDistrito', () => {
  it('explains what a move does', () => {
    expect(getAvisoDeCambioDeDistrito('Distrito Norte', 'Distrito Centro')).toBe(
      'Pasa del Distrito Norte al Distrito Centro. Su calendario va a mostrar los eventos ' +
        'del Distrito Centro. Sus eventos, lugares y encargados se quedan con ella.',
    );
  });
});

describe('validarDistrito', () => {
  it('trims the nombre', () => {
    expect(validarDistrito({ nombre: '  Distrito Centro ' })).toEqual({
      ok: true,
      valores: { nombre: 'Distrito Centro' },
    });
  });

  it('asks for a nombre', () => {
    expect(validarDistrito({ nombre: '   ' })).toEqual({
      ok: false,
      errores: { nombre: 'Escribí el nombre del distrito.' },
    });
  });

  it('rejects a nombre that is too long', () => {
    const resultado = validarDistrito({ nombre: 'D'.repeat(101) });
    expect(resultado.ok).toBe(false);
  });
});

describe('validarIglesia', () => {
  const datos = {
    nombre: ' Iglesia Juana Koslay ',
    direccion: 'Av. Los Fresnos 1450',
    localidad: 'Juana Koslay ',
    distritoId: 'd1',
  };

  it('trims every text', () => {
    expect(validarIglesia(datos)).toEqual({
      ok: true,
      valores: {
        nombre: 'Iglesia Juana Koslay',
        direccion: 'Av. Los Fresnos 1450',
        localidad: 'Juana Koslay',
        distritoId: 'd1',
      },
    });
  });

  it('asks for every field that is missing', () => {
    expect(validarIglesia({ nombre: '', direccion: ' ', localidad: '', distritoId: null })).toEqual(
      {
        ok: false,
        errores: {
          nombre: 'Escribí el nombre de la iglesia.',
          direccion: 'Escribí la dirección.',
          localidad: 'Escribí la localidad.',
          distritoId: 'Elegí el distrito.',
        },
      },
    );
  });

  it('rejects a text that is too long', () => {
    const resultado = validarIglesia({ ...datos, direccion: 'x'.repeat(201) });
    expect(resultado).toEqual({
      ok: false,
      errores: { direccion: 'Es demasiado larga: usá hasta 200 letras.' },
    });
  });
});
