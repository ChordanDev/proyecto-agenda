import type { Evento } from './evento';
import {
  getAvisoDePerdidas,
  getConfirmacionDeBorrarFecha,
  getHojaDeSerie,
  getLeyendaDeUnaFecha,
  getVistaAbierta,
  formularioDeFecha,
  muestraHojaDeBorrar,
  muestraHojaDeSerie,
  validarFormularioDeFecha,
  type EdicionDeFecha,
} from './edicionDeFecha';
import type { Excepcion, FechaDeSerie } from './excepcion';

const serie: Evento = {
  id: 'culto-joven',
  titulo: 'Culto joven',
  lugar: 'Templo',
  lugarId: 'templo',
  descripcion: null,
  enfasis: 'nuevas_generaciones',
  duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-central' },
  hora: '19:00:00',
  fechaFin: null,
  repeticion: 'mensual',
  finDeSerie: '2027-10-16',
  iglesiasSumadas: ['iglesia-norte'],
};

// The third Saturday of each month, from 2026-10-17.
const FECHAS = ['2026-10-17', '2026-11-21', '2026-12-19'];

function excepcion(fecha: string, cambios: Partial<Excepcion> = {}): Excepcion {
  return { fecha, fechaNueva: null, borrada: false, cambios: {}, ...cambios };
}

const edicion: EdicionDeFecha = {
  fechaOriginal: '2026-11-21',
  serie,
  fechas: FECHAS,
  excepciones: [],
};

const HOY = '2026-10-19';

describe('muestraHojaDeSerie', () => {
  it('asks which dates for an evento that repeats, to whoever can edit it', () => {
    expect(muestraHojaDeSerie(serie, true)).toBe(true);
  });

  it('does not ask for an evento that does not repeat', () => {
    expect(muestraHojaDeSerie({ ...serie, repeticion: 'ninguna' }, true)).toBe(false);
  });

  it('never shows to whoever cannot edit, such as an iglesia sumada', () => {
    expect(muestraHojaDeSerie(serie, false)).toBe(false);
  });
});

describe('muestraHojaDeBorrar', () => {
  it('offers to delete a single date while the series has others', () => {
    expect(muestraHojaDeBorrar(serie, true, 2)).toBe(true);
  });

  it('deletes the last date left with the whole series, without asking which', () => {
    expect(muestraHojaDeBorrar(serie, true, 1)).toBe(false);
  });

  it('never shows to whoever cannot edit', () => {
    expect(muestraHojaDeBorrar(serie, false, 3)).toBe(false);
  });
});

describe('getHojaDeSerie', () => {
  it('names the date and reminds how the evento repeats', () => {
    expect(getHojaDeSerie('editar', '2026-10-17', serie.repeticion, '2026-10-17')).toEqual({
      pregunta: '¿Qué querés cambiar?',
      recordatorio: 'Este evento se repite el tercer sábado de cada mes.',
      soloEsta: 'Solo el sábado 17 de octubre',
    });
  });

  it('asks what to delete on Borrar', () => {
    expect(getHojaDeSerie('borrar', '2026-10-24', 'semanal', '2026-10-17')).toEqual({
      pregunta: '¿Qué querés borrar?',
      recordatorio: 'Este evento se repite todos los sábados.',
      soloEsta: 'Solo el sábado 24 de octubre',
    });
  });
});

describe('getConfirmacionDeBorrarFecha', () => {
  it('says only that date goes', () => {
    expect(getConfirmacionDeBorrarFecha('2026-10-17')).toEqual({
      titulo: '¿Borrar esta fecha?',
      mensaje: 'Se borra solo el sábado 17 de octubre. Las demás fechas siguen.',
      boton: 'Borrar el sábado 17',
    });
  });
});

describe('getLeyendaDeUnaFecha', () => {
  it('says which date is being changed', () => {
    expect(getLeyendaDeUnaFecha('2026-10-17')).toBe(
      'Estás cambiando solo el sábado 17 de octubre.',
    );
  });
});

describe('formularioDeFecha', () => {
  it('loads the date as it is seen, without the fields of the series', () => {
    const vista = { ...serie, hora: '20:30:00' };

    expect(formularioDeFecha(vista, '2026-11-22')).toMatchObject({
      titulo: 'Culto joven',
      fecha: '2026-11-22',
      hora: '20:30',
      repeticion: 'ninguna',
      finDeSerie: null,
      fechaFin: null,
    });
  });
});

describe('validarFormularioDeFecha', () => {
  const formulario = formularioDeFecha(serie, '2026-11-21');

  it('sends only the fields that changed', () => {
    const result = validarFormularioDeFecha(
      { ...formulario, hora: '20:30' },
      { hoy: HOY, ...edicion },
    );

    expect(result).toEqual({
      ok: true,
      excepcion: { fecha: '2026-11-21', fechaNueva: null, cambios: { hora: '20:30:00' } },
    });
  });

  it('sends the new day of a moved date', () => {
    const result = validarFormularioDeFecha(
      { ...formulario, fecha: '2026-11-22' },
      { hoy: HOY, ...edicion },
    );

    expect(result).toEqual({
      ok: true,
      excepcion: { fecha: '2026-11-21', fechaNueva: '2026-11-22', cambios: {} },
    });
  });

  it('sends an emptied lugar and the actividad regular as changes', () => {
    const result = validarFormularioDeFecha(
      { ...formulario, lugar: null, categoria: 'R' },
      { hoy: HOY, ...edicion },
    );

    expect(result).toEqual({
      ok: true,
      excepcion: {
        fecha: '2026-11-21',
        fechaNueva: null,
        cambios: { lugar: null, lugarId: null, enfasis: null },
      },
    });
  });

  it('keeps sending what the date already had of its own', () => {
    // The form is loaded with the hora of the date, not the one of the series.
    const conHora = formularioDeFecha({ ...serie, hora: '20:30:00' }, '2026-11-21');
    const result = validarFormularioDeFecha(
      { ...conHora, titulo: 'Culto especial' },
      { hoy: HOY, ...edicion },
    );

    expect(result).toEqual({
      ok: true,
      excepcion: {
        fecha: '2026-11-21',
        fechaNueva: null,
        cambios: { titulo: 'Culto especial', hora: '20:30:00' },
      },
    });
  });

  it('rejects moving the date onto another date of the series', () => {
    const result = validarFormularioDeFecha(
      { ...formulario, fecha: '2026-12-19' },
      { hoy: HOY, ...edicion },
    );

    expect(result).toEqual({
      ok: false,
      errores: { fecha: 'Ese día ya tiene otra fecha de esta serie.' },
    });
  });

  it('still asks for what every evento needs', () => {
    const result = validarFormularioDeFecha(
      { ...formulario, titulo: ' ' },
      { hoy: HOY, ...edicion },
    );

    expect(result).toEqual({ ok: false, errores: { titulo: 'Escribí el título del evento.' } });
  });
});

describe('getAvisoDePerdidas', () => {
  const mayo = excepcion('2027-05-15', { cambios: { hora: '20:00:00' } });
  const junio = excepcion('2027-06-19', { cambios: { titulo: 'Especial' } });

  it('says nothing when no date with changes of its own is lost', () => {
    expect(getAvisoDePerdidas([mayo], { ...serie, fechas: ['2027-05-15'] }, HOY)).toBeNull();
  });

  it('counts and names the dates left out of a shorter "Hasta"', () => {
    const nueva = { ...serie, finDeSerie: '2027-04-17', fechas: ['2027-04-17'] };

    expect(getAvisoDePerdidas([mayo, junio], nueva, HOY)).toEqual({
      titulo: '¿Guardar los cambios de la serie?',
      cantidad: '2 fechas con cambios propios se van a perder.',
      cuales:
        'Son el sábado 15 de mayo y el sábado 19 de junio de 2027, que quedan fuera del nuevo "Hasta".',
    });
  });

  it('speaks of a single date in the singular', () => {
    const nueva = { ...serie, finDeSerie: '2027-06-01', fechas: ['2027-05-15'] };

    expect(getAvisoDePerdidas([mayo, junio], nueva, HOY)).toEqual({
      titulo: '¿Guardar los cambios de la serie?',
      cantidad: '1 fecha con cambios propios se va a perder.',
      cuales: 'Es el sábado 19 de junio de 2027, que queda fuera del nuevo "Hasta".',
    });
  });

  it('says the dates stop being of the series when its day changes', () => {
    // Moved to the third Sunday: no Saturday is a date any more.
    const nueva = { ...serie, fechas: ['2027-05-16', '2027-06-20'] };

    expect(getAvisoDePerdidas([mayo], nueva, HOY)?.cuales).toBe(
      'Es el sábado 15 de mayo de 2027, que deja de ser una fecha de la serie.',
    );
  });

  it('says the evento stops repeating', () => {
    const nueva = {
      ...serie,
      repeticion: 'ninguna' as const,
      finDeSerie: null,
      fechas: ['2027-05-15'],
    };

    expect(getAvisoDePerdidas([mayo], nueva, HOY)?.cuales).toBe(
      'Es el sábado 15 de mayo de 2027, porque el evento deja de repetirse.',
    );
  });

  it('says a date loses its lugar when the duenio changes', () => {
    const lugar = excepcion('2027-05-15', { cambios: { lugar: 'Salón', lugarId: 'salon' } });
    const nueva = {
      ...serie,
      duenio: { alcance: 'distrito' as const, distritoId: 'distrito-norte' },
      fechas: ['2027-05-15'],
    };

    expect(getAvisoDePerdidas([lugar], nueva, HOY, serie)?.cuales).toBe(
      'Es el sábado 15 de mayo de 2027, que tiene un lugar del dueño anterior.',
    );
    expect(getAvisoDePerdidas([lugar], { ...nueva, duenio: serie.duenio }, HOY, serie)).toBeNull();
  });

  it('leaves out the year of the dates of this year', () => {
    const octubre = excepcion('2026-10-24', { cambios: { hora: '20:00:00' } });
    const nueva = { ...serie, finDeSerie: '2026-10-20', fechas: ['2026-10-17'] };

    expect(getAvisoDePerdidas([octubre], nueva, HOY)?.cuales).toBe(
      'Es el sábado 24 de octubre, que queda fuera del nuevo "Hasta".',
    );
  });
});

describe('getVistaAbierta', () => {
  function vista(fecha: string, fechaOriginal = fecha): FechaDeSerie {
    return { fecha, fechaOriginal, evento: serie, tieneCambios: fecha !== fechaOriginal };
  }

  // 11-21 moved to 11-14, whose own date moved to 11-15.
  const vistas = [
    vista('2026-10-17'),
    vista('2026-11-14', '2026-11-21'),
    vista('2026-11-15', '2026-11-14'),
  ];

  it('opens the date seen on the day of the calendario', () => {
    expect(getVistaAbierta(vistas, '2026-11-14')).toBe(vistas[1]);
  });

  it('follows a date that moved since the detail was opened', () => {
    expect(getVistaAbierta(vistas, '2026-11-21')).toBe(vistas[1]);
  });

  it('opens the first date when the day is not one of the evento', () => {
    expect(getVistaAbierta(vistas, '2026-12-01')).toBe(vistas[0]);
    expect(getVistaAbierta(vistas, undefined)).toBe(vistas[0]);
  });
});
