import {
  buscarIglesiasDelAdmin,
  getDireccionParaElMapa,
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
    ciudad: 'San Luis',
    provincia: 'San Luis',
    coordenadas: null,
    distritoId: distritoNombre,
    distritoNombre,
    cantidadDeEncargados: 0,
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

  it('matches the ciudad, the provincia and the distrito too', () => {
    expect(buscarIglesiasDelAdmin(iglesias, 'distrito sur').map((una) => una.nombre)).toEqual([
      'Iglesia El Trapiche',
    ]);
    expect(buscarIglesiasDelAdmin(iglesias, 'san luis')).toHaveLength(2);
    expect(
      buscarIglesiasDelAdmin(
        [{ ...iglesia('Iglesia Merlo'), ciudad: 'Merlo', provincia: 'San Luis' }],
        'luis',
      ),
    ).toHaveLength(1);
  });

  it('matches an iglesia that still has no provincia by its ciudad', () => {
    const sinProvincia = { ...iglesia('Iglesia Merlo'), ciudad: 'Merlo', provincia: null };
    expect(buscarIglesiasDelAdmin([sinProvincia], 'merlo')).toEqual([sinProvincia]);
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
  const punto = { latitud: -33.2885, longitud: -66.2459 };
  const datos = {
    nombre: ' Iglesia Juana Koslay ',
    direccion: 'Av. Los Fresnos 1450',
    ciudad: 'Juana Koslay ',
    provincia: ' San Luis',
    distritoId: 'd1',
    coordenadas: punto,
  };

  it('trims every text', () => {
    expect(validarIglesia(datos)).toEqual({
      ok: true,
      valores: {
        nombre: 'Iglesia Juana Koslay',
        direccion: 'Av. Los Fresnos 1450',
        ciudad: 'Juana Koslay',
        provincia: 'San Luis',
        distritoId: 'd1',
        coordenadas: punto,
      },
    });
  });

  it('asks for every field that is missing', () => {
    expect(
      validarIglesia({
        nombre: '',
        direccion: ' ',
        ciudad: '',
        provincia: '  ',
        distritoId: null,
        coordenadas: null,
      }),
    ).toEqual({
      ok: false,
      errores: {
        nombre: 'Escribí el nombre de la iglesia.',
        direccion: 'Escribí la dirección.',
        ciudad: 'Escribí la ciudad.',
        provincia: 'Escribí la provincia.',
        distritoId: 'Elegí el distrito.',
        coordenadas: 'Marcá en el mapa dónde está la iglesia.',
      },
    });
  });

  it.each(['direccion', 'ciudad', 'provincia'] as const)(
    'does not save without the %s',
    (campo) => {
      const resultado = validarIglesia({ ...datos, [campo]: '' });
      expect(resultado.ok).toBe(false);
      expect(resultado.ok ? null : Object.keys(resultado.errores)).toEqual([campo]);
    },
  );

  it('does not save without the point of the map', () => {
    expect(validarIglesia({ ...datos, coordenadas: null })).toEqual({
      ok: false,
      errores: { coordenadas: 'Marcá en el mapa dónde está la iglesia.' },
    });
  });

  it('rejects a text that is too long', () => {
    const resultado = validarIglesia({ ...datos, direccion: 'x'.repeat(201) });
    expect(resultado).toEqual({
      ok: false,
      errores: { direccion: 'Es demasiado larga: usá hasta 200 letras.' },
    });
    expect(
      validarIglesia({ ...datos, ciudad: 'x'.repeat(101), provincia: 'x'.repeat(101) }),
    ).toEqual({
      ok: false,
      errores: {
        ciudad: 'Es demasiado larga: usá hasta 100 letras.',
        provincia: 'Es demasiado larga: usá hasta 100 letras.',
      },
    });
  });
});

describe('getDireccionParaElMapa', () => {
  it('joins the direccion, the ciudad and the provincia, in Argentina', () => {
    expect(
      getDireccionParaElMapa({
        direccion: ' Av. Los Fresnos 1450 ',
        ciudad: 'Juana Koslay',
        provincia: 'San Luis ',
      }),
    ).toBe('Av. Los Fresnos 1450, Juana Koslay, San Luis, Argentina');
  });

  it.each(['direccion', 'ciudad', 'provincia'] as const)(
    'has nothing to look for without the %s',
    (campo) => {
      expect(
        getDireccionParaElMapa({
          direccion: 'Av. Los Fresnos 1450',
          ciudad: 'Juana Koslay',
          provincia: 'San Luis',
          [campo]: '  ',
        }),
      ).toBeNull();
    },
  );
});
