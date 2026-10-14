import type { Evento } from './evento';
import {
  formatFechaDelCampo,
  formularioDesdeEvento,
  formularioVacio,
  seEditaEnElFormulario,
  parseHora,
  validarFormulario,
  type FormularioDeEvento,
} from './formularioDeEvento';

const IGLESIA = { alcance: 'iglesia', iglesiaId: 'i1' } as const;

/** A form with everything a single-date evento needs. */
function completo(overrides: Partial<FormularioDeEvento> = {}): FormularioDeEvento {
  return {
    titulo: 'Culto joven',
    duenio: IGLESIA,
    fecha: '2026-10-17',
    hora: '19:00',
    lugar: 'Templo',
    descripcion: 'Con merienda',
    categoria: 'I',
    ...overrides,
  };
}

describe('parseHora', () => {
  it('reads the hora as it is usually written', () => {
    expect(parseHora('19:00')).toBe('19:00:00');
    expect(parseHora('9:30')).toBe('09:30:00');
    expect(parseHora('09.30')).toBe('09:30:00');
  });

  it('reads a hora without minutes or without a separator', () => {
    expect(parseHora('19')).toBe('19:00:00');
    expect(parseHora('7')).toBe('07:00:00');
    expect(parseHora('1930')).toBe('19:30:00');
    expect(parseHora('930')).toBe('09:30:00');
  });

  it('ignores the spaces around it', () => {
    expect(parseHora(' 19:00 ')).toBe('19:00:00');
  });

  it('rejects what is not a hora of the day', () => {
    expect(parseHora('')).toBeNull();
    expect(parseHora('24:00')).toBeNull();
    expect(parseHora('19:60')).toBeNull();
    expect(parseHora('19:5')).toBeNull();
    expect(parseHora('a las 7')).toBeNull();
  });
});

describe('validarFormulario', () => {
  it('turns a complete form into the evento to save, with its single date', () => {
    expect(validarFormulario(completo())).toEqual({
      ok: true,
      evento: {
        titulo: 'Culto joven',
        lugar: 'Templo',
        descripcion: 'Con merienda',
        enfasis: 'nuevas_generaciones',
        duenio: IGLESIA,
        hora: '19:00:00',
        fechaFin: null,
        repeticion: 'ninguna',
        finDeSerie: null,
        fechas: ['2026-10-17'],
      },
    });
  });

  it('saves the actividad regular as an evento without enfasis', () => {
    const result = validarFormulario(completo({ categoria: 'R' }));

    expect(result.ok && result.evento.enfasis).toBeNull();
  });

  it('trims the texts and saves the empty optional ones as missing', () => {
    const result = validarFormulario(
      completo({ titulo: '  Culto joven  ', lugar: '   ', descripcion: '' }),
    );

    expect(result.ok && result.evento).toMatchObject({
      titulo: 'Culto joven',
      lugar: null,
      descripcion: null,
    });
  });

  it('cannot save without a titulo', () => {
    expect(validarFormulario(completo({ titulo: '   ' }))).toEqual({
      ok: false,
      errores: { titulo: 'Escribí el título del evento.' },
    });
  });

  it('cannot save without a duenio', () => {
    expect(validarFormulario(completo({ duenio: null }))).toEqual({
      ok: false,
      errores: { duenio: 'Elegí de quién es el evento.' },
    });
  });

  it('cannot save without a fecha', () => {
    expect(validarFormulario(completo({ fecha: null }))).toEqual({
      ok: false,
      errores: { fecha: 'Elegí la fecha del evento.' },
    });
  });

  it('cannot save without a hora, or with one that is not a hora', () => {
    expect(validarFormulario(completo({ hora: '' }))).toEqual({
      ok: false,
      errores: { hora: 'Escribí la hora, por ejemplo 19:00.' },
    });
    expect(validarFormulario(completo({ hora: '25:00' }))).toEqual({
      ok: false,
      errores: { hora: 'Escribí la hora, por ejemplo 19:00.' },
    });
  });

  it('cannot save without one of the five options of enfasis', () => {
    expect(validarFormulario(completo({ categoria: null }))).toEqual({
      ok: false,
      errores: { enfasis: 'Elegí un énfasis o "Actividad regular".' },
    });
  });

  it('tells every missing field at once', () => {
    const result = validarFormulario(formularioVacio(null, null));

    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errores).sort()).toEqual([
      'duenio',
      'enfasis',
      'fecha',
      'hora',
      'titulo',
    ]);
  });
});

describe('formularioVacio', () => {
  it('starts with no enfasis chosen, and the duenio and fecha it is given', () => {
    expect(formularioVacio(IGLESIA, '2026-10-17')).toEqual({
      titulo: '',
      duenio: IGLESIA,
      fecha: '2026-10-17',
      hora: '',
      lugar: '',
      descripcion: '',
      categoria: null,
    });
  });
});

describe('formularioDesdeEvento', () => {
  const evento: Evento = {
    id: 'e1',
    titulo: 'Culto joven',
    lugar: null,
    descripcion: 'Con merienda',
    enfasis: null,
    duenio: IGLESIA,
    hora: '19:30:00',
    fechaFin: null,
    repeticion: 'ninguna',
    finDeSerie: null,
    iglesiasSumadas: [],
  };

  it('loads the evento into the form, the empty fields included', () => {
    expect(formularioDesdeEvento(evento, ['2026-10-17'])).toEqual({
      titulo: 'Culto joven',
      duenio: IGLESIA,
      fecha: '2026-10-17',
      hora: '19:30',
      lugar: '',
      descripcion: 'Con merienda',
      categoria: 'R',
    });
  });

  it('saves back the same evento when nothing is changed', () => {
    const result = validarFormulario(formularioDesdeEvento(evento, ['2026-10-17']));

    expect(result.ok && result.evento).toMatchObject({
      titulo: evento.titulo,
      lugar: null,
      descripcion: evento.descripcion,
      enfasis: null,
      hora: '19:30:00',
      fechas: ['2026-10-17'],
    });
  });
});

describe('formatFechaDelCampo', () => {
  it('writes the fecha short, as the field of the design', () => {
    expect(formatFechaDelCampo('2026-10-17')).toBe('Sáb 17 oct 2026');
    expect(formatFechaDelCampo('2027-01-04')).toBe('Lun 4 ene 2027');
  });
});

describe('seEditaEnElFormulario', () => {
  it('edits only eventos of one date: it would save a series or several days as one', () => {
    const base = { repeticion: 'ninguna', fechaFin: null } as Evento;

    expect(seEditaEnElFormulario(base)).toBe(true);
    expect(seEditaEnElFormulario({ ...base, repeticion: 'semanal' })).toBe(false);
    expect(seEditaEnElFormulario({ ...base, fechaFin: '2026-11-01' })).toBe(false);
  });
});
