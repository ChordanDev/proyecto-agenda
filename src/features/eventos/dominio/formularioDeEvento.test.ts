import type { Lugar } from '@/features/lugares/dominio/lugar';

import type { Evento } from './evento';
import {
  cambiarDuenio,
  formatFechaDelCampo,
  formularioDesdeEvento,
  formularioVacio,
  parseHora,
  validarFormulario,
  type FormularioDeEvento,
} from './formularioDeEvento';

const IGLESIA = { alcance: 'iglesia', iglesiaId: 'i1' } as const;
const OTRA_IGLESIA = { alcance: 'iglesia', iglesiaId: 'i2' } as const;
const TEMPLO: Lugar = { id: 'l1', nombre: 'Templo', duenio: IGLESIA };

/** Today, for the caps of "Hasta": the rules receive it. */
const HOY = '2026-10-14';

function validar(formulario: FormularioDeEvento, editando = false) {
  return validarFormulario(formulario, { hoy: HOY, editando });
}

/** A form with everything a single-date evento needs. */
function completo(overrides: Partial<FormularioDeEvento> = {}): FormularioDeEvento {
  return {
    titulo: 'Culto joven',
    duenio: IGLESIA,
    fecha: '2026-10-17',
    hora: '19:00',
    fechaFin: null,
    repeticion: 'ninguna',
    finDeSerie: null,
    lugar: { tipo: 'guardado', lugar: TEMPLO },
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
    expect(validar(completo())).toEqual({
      ok: true,
      evento: {
        titulo: 'Culto joven',
        lugar: 'Templo',
        lugarId: 'l1',
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
    const result = validar(completo({ categoria: 'R' }));

    expect(result.ok && result.evento.enfasis).toBeNull();
  });

  it('trims the texts and saves the empty optional ones as missing', () => {
    const result = validar(completo({ titulo: '  Culto joven  ', descripcion: '' }));

    expect(result.ok && result.evento).toMatchObject({
      titulo: 'Culto joven',
      descripcion: null,
    });
  });

  it('saves an evento without lugar, which is optional', () => {
    const result = validar(completo({ lugar: null }));

    expect(result.ok && result.evento).toMatchObject({ lugar: null, lugarId: null });
  });

  it('keeps the lugar an old evento has written by hand', () => {
    const result = validar(completo({ lugar: { tipo: 'escrito', nombre: 'Salon jovenes' } }));

    expect(result.ok && result.evento).toMatchObject({ lugar: 'Salon jovenes', lugarId: null });
  });

  it('cannot save without a titulo', () => {
    expect(validar(completo({ titulo: '   ' }))).toEqual({
      ok: false,
      errores: { titulo: 'Escribí el título del evento.' },
    });
  });

  it('cannot save without a duenio', () => {
    expect(validar(completo({ duenio: null }))).toEqual({
      ok: false,
      errores: { duenio: 'Elegí de quién es el evento.' },
    });
  });

  it('cannot save without a fecha', () => {
    expect(validar(completo({ fecha: null }))).toEqual({
      ok: false,
      errores: { fecha: 'Elegí la fecha del evento.' },
    });
  });

  it('cannot save without a hora, or with one that is not a hora', () => {
    expect(validar(completo({ hora: '' }))).toEqual({
      ok: false,
      errores: { hora: 'Escribí la hora, por ejemplo 19:00.' },
    });
    expect(validar(completo({ hora: '25:00' }))).toEqual({
      ok: false,
      errores: { hora: 'Escribí la hora, por ejemplo 19:00.' },
    });
  });

  it('cannot save without one of the five options of enfasis', () => {
    expect(validar(completo({ categoria: null }))).toEqual({
      ok: false,
      errores: { enfasis: 'Elegí un énfasis o "Actividad regular".' },
    });
  });

  it('tells every missing field at once', () => {
    const result = validar(formularioVacio(null, null));

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

describe('the fecha de fin of an evento of several days', () => {
  it('saves an evento of several days with its single date and its end', () => {
    const result = validar(completo({ fecha: '2026-10-30', fechaFin: '2026-11-01' }));

    expect(result.ok && result.evento).toMatchObject({
      fechas: ['2026-10-30'],
      fechaFin: '2026-11-01',
      repeticion: 'ninguna',
    });
  });

  it('rejects an end before the start', () => {
    expect(validar(completo({ fecha: '2026-10-30', fechaFin: '2026-10-29' }))).toEqual({
      ok: false,
      errores: { fechaFin: 'La fecha de fin no puede ser anterior a la de inicio.' },
    });
  });

  it('saves an end on the same day as an evento of one day', () => {
    const result = validar(completo({ fecha: '2026-10-30', fechaFin: '2026-10-30' }));

    expect(result.ok && result.evento.fechaFin).toBeNull();
  });

  it('loads the end of an evento being edited', () => {
    const formulario = formularioDesdeEvento(
      {
        id: 'e1',
        titulo: 'Congreso',
        lugar: null,
        lugarId: null,
        descripcion: null,
        enfasis: 'nuevas_generaciones',
        duenio: IGLESIA,
        hora: '19:00:00',
        fechaFin: '2026-11-01',
        repeticion: 'ninguna',
        finDeSerie: null,
        iglesiasSumadas: [],
      },
      ['2026-10-30'],
    );

    expect(formulario).toMatchObject({ fecha: '2026-10-30', fechaFin: '2026-11-01' });
  });
});

describe('a weekly series', () => {
  it('saves one date per week up to "Hasta", each its own row', () => {
    const result = validar(
      completo({ fecha: '2026-10-17', repeticion: 'semanal', finDeSerie: '2026-11-07' }),
    );

    expect(result.ok && result.evento).toMatchObject({
      repeticion: 'semanal',
      finDeSerie: '2026-11-07',
      fechaFin: null,
      fechas: ['2026-10-17', '2026-10-24', '2026-10-31', '2026-11-07'],
    });
  });

  it('cannot save a series without "Hasta"', () => {
    expect(validar(completo({ repeticion: 'semanal', finDeSerie: null }))).toEqual({
      ok: false,
      errores: { finDeSerie: 'Elegí hasta cuándo se repite.' },
    });
  });

  it('rejects a "Hasta" before the first date', () => {
    expect(
      validar(completo({ fecha: '2026-10-17', repeticion: 'semanal', finDeSerie: '2026-10-16' })),
    ).toEqual({
      ok: false,
      errores: { finDeSerie: '"Hasta" no puede ser anterior a la primera fecha.' },
    });
  });

  it('caps "Hasta" a year after the first date', () => {
    expect(
      validar(completo({ fecha: '2026-10-17', repeticion: 'semanal', finDeSerie: '2027-10-17' }))
        .ok,
    ).toBe(true);
    expect(
      validar(completo({ fecha: '2026-10-17', repeticion: 'semanal', finDeSerie: '2027-10-18' })),
    ).toEqual({
      ok: false,
      errores: { finDeSerie: '"Hasta" puede ser, como máximo, el 17 de octubre de 2027.' },
    });
  });

  it('lets an edited series be renewed up to a year after the day of the edit', () => {
    const renovada = completo({
      fecha: '2026-01-07',
      repeticion: 'semanal',
      finDeSerie: '2027-10-14',
    });

    expect(validar(renovada, true).ok).toBe(true);
    expect(validar({ ...renovada, finDeSerie: '2027-10-15' }, true)).toEqual({
      ok: false,
      errores: { finDeSerie: '"Hasta" puede ser, como máximo, el 14 de octubre de 2027.' },
    });
  });

  it('cannot also last several days', () => {
    expect(
      validar(
        completo({
          fecha: '2026-10-17',
          fechaFin: '2026-10-18',
          repeticion: 'semanal',
          finDeSerie: '2026-12-26',
        }),
      ),
    ).toEqual({
      ok: false,
      errores: { repeticion: 'Un evento que se repite no puede durar varios días.' },
    });
  });

  it('forgets "Hasta" when the evento does not repeat', () => {
    const result = validar(completo({ repeticion: 'ninguna', finDeSerie: '2026-12-26' }));

    expect(result.ok && result.evento).toMatchObject({ finDeSerie: null, fechas: ['2026-10-17'] });
  });

  it('loads the series of an evento being edited from its first date', () => {
    const formulario = formularioDesdeEvento(
      {
        id: 'e1',
        titulo: 'Culto de oración',
        lugar: null,
        lugarId: null,
        descripcion: null,
        enfasis: null,
        duenio: IGLESIA,
        hora: '20:00:00',
        fechaFin: null,
        repeticion: 'semanal',
        finDeSerie: '2027-01-27',
        iglesiasSumadas: [],
      },
      ['2026-10-07', '2026-10-14', '2026-10-21'],
    );

    expect(formulario).toMatchObject({
      fecha: '2026-10-07',
      repeticion: 'semanal',
      finDeSerie: '2027-01-27',
    });
  });
});

describe('a monthly series', () => {
  it('saves one date per month, with the same rules of "Hasta" as a weekly one', () => {
    const result = validar(
      completo({ fecha: '2026-10-17', repeticion: 'mensual', finDeSerie: '2026-12-31' }),
    );

    expect(result.ok && result.evento).toMatchObject({
      repeticion: 'mensual',
      finDeSerie: '2026-12-31',
      fechas: ['2026-10-17', '2026-11-21', '2026-12-19'],
    });
    expect(
      validar(completo({ fecha: '2026-10-17', repeticion: 'mensual', finDeSerie: '2027-10-18' })),
    ).toEqual({
      ok: false,
      errores: { finDeSerie: '"Hasta" puede ser, como máximo, el 17 de octubre de 2027.' },
    });
  });
});

describe('formularioVacio', () => {
  it('starts with no enfasis chosen, and the duenio and fecha it is given', () => {
    expect(formularioVacio(IGLESIA, '2026-10-17')).toEqual({
      titulo: '',
      duenio: IGLESIA,
      fecha: '2026-10-17',
      hora: '',
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      lugar: null,
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
    lugarId: null,
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
      fechaFin: null,
      repeticion: 'ninguna',
      finDeSerie: null,
      lugar: null,
      descripcion: 'Con merienda',
      categoria: 'R',
    });
  });

  it('loads the lugar of the list of the evento', () => {
    const formulario = formularioDesdeEvento({ ...evento, lugar: 'Templo', lugarId: 'l1' }, [
      '2026-10-17',
    ]);

    expect(formulario.lugar).toEqual({ tipo: 'guardado', lugar: TEMPLO });
  });

  it('loads the lugar an old evento has written by hand', () => {
    const formulario = formularioDesdeEvento({ ...evento, lugar: 'Salon jovenes', lugarId: null }, [
      '2026-10-17',
    ]);

    expect(formulario.lugar).toEqual({ tipo: 'escrito', nombre: 'Salon jovenes' });
  });

  it('keeps the written lugar of an evento saved on the phone before lugarId existed', () => {
    // The cache of the phone can hold an evento read before this field: it has no lugarId.
    const { lugarId: _lugarId, ...sinLugarId } = { ...evento, lugar: 'Salon jovenes' };
    const formulario = formularioDesdeEvento(sinLugarId as Evento, ['2026-10-17']);

    expect(formulario.lugar).toEqual({ tipo: 'escrito', nombre: 'Salon jovenes' });
    const result = validar(formulario);
    expect(result.ok && result.evento).toMatchObject({ lugar: 'Salon jovenes', lugarId: null });
  });

  it('saves back the same evento when nothing is changed', () => {
    const result = validar(formularioDesdeEvento(evento, ['2026-10-17']));

    expect(result.ok && result.evento).toMatchObject({
      titulo: evento.titulo,
      lugar: null,
      lugarId: null,
      descripcion: evento.descripcion,
      enfasis: null,
      hora: '19:30:00',
      fechas: ['2026-10-17'],
    });
  });
});

describe('cambiarDuenio', () => {
  it('changes the duenio and keeps a lugar of that same duenio', () => {
    const formulario = cambiarDuenio(completo({ duenio: null }), IGLESIA);

    expect(formulario).toMatchObject({
      duenio: IGLESIA,
      lugar: { tipo: 'guardado', lugar: TEMPLO },
    });
  });

  it('empties the lugar when it is not one of the new duenio', () => {
    const formulario = cambiarDuenio(completo(), OTRA_IGLESIA);

    expect(formulario).toMatchObject({ duenio: OTRA_IGLESIA, lugar: null });
  });

  it('keeps the lugar written by hand, which is of no list', () => {
    const escrito = { tipo: 'escrito', nombre: 'Salon jovenes' } as const;
    const formulario = cambiarDuenio(completo({ lugar: escrito }), OTRA_IGLESIA);

    expect(formulario.lugar).toEqual(escrito);
  });

  it('keeps everything else of the form', () => {
    const { duenio: _duenio, lugar: _lugar, ...resto } = cambiarDuenio(completo(), OTRA_IGLESIA);
    const { duenio: _before, lugar: _l, ...antes } = completo();

    expect(resto).toEqual(antes);
  });
});

describe('formatFechaDelCampo', () => {
  it('writes the fecha short, as the field of the design', () => {
    expect(formatFechaDelCampo('2026-10-17')).toBe('Sáb 17 oct 2026');
    expect(formatFechaDelCampo('2027-01-04')).toBe('Lun 4 ene 2027');
  });
});
