import { cuantasIglesias, listaDeNombres, textoDeRecordatorios } from './textos';

describe('listaDeNombres', () => {
  it('joins the nombres as a sentence', () => {
    expect(listaDeNombres(['Iglesia Central'])).toBe('Iglesia Central');
    expect(listaDeNombres(['Iglesia Central', 'Iglesia Las Rosas'])).toBe(
      'Iglesia Central y Iglesia Las Rosas',
    );
    expect(listaDeNombres(['A', 'B', 'C'])).toBe('A, B y C');
  });
});

describe('cuantasIglesias', () => {
  it('counts the iglesias in words', () => {
    expect(cuantasIglesias(1)).toBe('1 iglesia');
    expect(cuantasIglesias(2)).toBe('2 iglesias');
  });
});

describe('textoDeRecordatorios', () => {
  it('names the iglesias a hermano or an encargado receives', () => {
    expect(textoDeRecordatorios({ modo: 'iglesia-elegida', nombres: ['Iglesia Central'] })).toBe(
      'Te avisamos a las 20 h del día anterior a cada evento de Iglesia Central. Las actividades regulares no avisan.',
    );
    expect(
      textoDeRecordatorios({ modo: 'sus-iglesias', nombres: ['Iglesia Central', 'Las Rosas'] }),
    ).toBe(
      'Te avisamos a las 20 h del día anterior a cada evento de Iglesia Central y Las Rosas. Las actividades regulares no avisan.',
    );
  });

  it('asks a pastor or an admin to choose while none is chosen', () => {
    expect(textoDeRecordatorios({ modo: 'eligiendo', nombres: [] })).toBe(
      'Elegí de qué iglesias querés que te avisemos, a las 20 h del día anterior a cada evento.',
    );
  });

  it('speaks of the iglesias chosen by a pastor or an admin', () => {
    expect(textoDeRecordatorios({ modo: 'eligiendo', nombres: ['Iglesia Central'] })).toBe(
      'Te avisamos a las 20 h del día anterior a cada evento de estas iglesias. Las actividades regulares no avisan.',
    );
  });

  it('speaks of their iglesia to a hermano who has not chosen one yet', () => {
    expect(textoDeRecordatorios({ modo: 'iglesia-elegida', nombres: [] })).toBe(
      'Te avisamos a las 20 h del día anterior a cada evento de tu iglesia. Las actividades regulares no avisan.',
    );
  });
});
