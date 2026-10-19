import type { Evento } from './evento';
import {
  aplicarExcepciones,
  combinarConExcepcion,
  getExcepcionesPerdidas,
  puedeMoverFecha,
  type Excepcion,
} from './excepcion';

const serie: Evento = {
  id: 'culto-joven',
  titulo: 'Culto joven',
  lugar: 'Templo',
  lugarId: 'templo',
  descripcion: 'Para toda la iglesia',
  enfasis: 'nuevas_generaciones',
  duenio: { alcance: 'iglesia', iglesiaId: 'iglesia-central' },
  hora: '19:00:00',
  fechaFin: null,
  repeticion: 'semanal',
  finDeSerie: '2026-11-28',
  iglesiasSumadas: [],
};

const FECHAS = ['2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28'];

function excepcion(fecha: string, cambios: Partial<Excepcion> = {}): Excepcion {
  return { fecha, fechaNueva: null, borrada: false, cambios: {}, ...cambios };
}

describe('combinarConExcepcion', () => {
  it('takes the new titulo of the series and keeps the hora of the date', () => {
    const conTituloNuevo = { ...serie, titulo: 'Culto de jóvenes' };
    const horaPropia = excepcion('2026-11-14', { cambios: { hora: '20:30:00' } });

    expect(combinarConExcepcion(conTituloNuevo, horaPropia)).toEqual({
      ...serie,
      titulo: 'Culto de jóvenes',
      hora: '20:30:00',
    });
  });

  it('empties a field the date emptied, unlike one it never changed', () => {
    const sinEnfasis = excepcion('2026-11-14', {
      cambios: { enfasis: null, lugar: null, lugarId: null },
    });

    expect(combinarConExcepcion(serie, sinEnfasis)).toEqual({
      ...serie,
      enfasis: null,
      lugar: null,
      lugarId: null,
    });
  });

  it('leaves the series as it is for a date with no excepcion', () => {
    expect(combinarConExcepcion(serie, undefined)).toBe(serie);
  });
});

describe('aplicarExcepciones', () => {
  it('puts a moved date on its new day and not on the original one', () => {
    const movida = excepcion('2026-11-14', { fechaNueva: '2026-11-15' });

    expect(aplicarExcepciones(serie, ['2026-11-07', '2026-11-14'], [movida])).toEqual([
      { fecha: '2026-11-07', fechaOriginal: '2026-11-07', evento: serie, tieneCambios: false },
      { fecha: '2026-11-15', fechaOriginal: '2026-11-14', evento: serie, tieneCambios: true },
    ]);
  });

  it('orders the dates by the day they are seen on', () => {
    const adelantada = excepcion('2026-11-14', { fechaNueva: '2026-11-01' });

    expect(
      aplicarExcepciones(serie, ['2026-11-07', '2026-11-14'], [adelantada]).map(
        ({ fecha }) => fecha,
      ),
    ).toEqual(['2026-11-01', '2026-11-07']);
  });

  it('leaves out a deleted date even if the dates still have it', () => {
    const borrada = excepcion('2026-11-14', { borrada: true });

    expect(aplicarExcepciones(serie, ['2026-11-07', '2026-11-14'], [borrada])).toEqual([
      { fecha: '2026-11-07', fechaOriginal: '2026-11-07', evento: serie, tieneCambios: false },
    ]);
  });

  it('combines each date with its own excepcion only', () => {
    const titulo = excepcion('2026-11-07', { cambios: { titulo: 'Culto joven especial' } });

    expect(aplicarExcepciones(serie, ['2026-11-07', '2026-11-14'], [titulo])).toEqual([
      {
        fecha: '2026-11-07',
        fechaOriginal: '2026-11-07',
        evento: { ...serie, titulo: 'Culto joven especial' },
        tieneCambios: true,
      },
      { fecha: '2026-11-14', fechaOriginal: '2026-11-14', evento: serie, tieneCambios: false },
    ]);
  });
});

describe('getExcepcionesPerdidas', () => {
  const hora = excepcion('2026-11-14', { cambios: { hora: '20:00:00' } });
  const titulo = excepcion('2026-11-21', { cambios: { titulo: 'Especial' } });
  const ultima = excepcion('2026-11-28', { cambios: { titulo: 'Cierre' } });

  it('counts as lost the excepciones after a shorter "Hasta"', () => {
    const hastaEl14 = ['2026-11-07', '2026-11-14'];

    expect(getExcepcionesPerdidas([hora, titulo, ultima], hastaEl14, true)).toEqual([
      titulo,
      ultima,
    ]);
  });

  it('loses nothing when every date with an excepcion stays', () => {
    expect(getExcepcionesPerdidas([hora, titulo, ultima], FECHAS, true)).toEqual([]);
  });

  it('never counts a deleted date: nothing of it is lost', () => {
    const borrada = excepcion('2026-11-28', { borrada: true });

    expect(getExcepcionesPerdidas([borrada], ['2026-11-07'], true)).toEqual([]);
  });

  it('loses every excepcion when the evento stops repeating', () => {
    expect(getExcepcionesPerdidas([hora, titulo], ['2026-11-14'], false)).toEqual([hora, titulo]);
  });

  it('loses a date whose only change is a lugar of the list when the duenio changes', () => {
    const lugar = excepcion('2026-11-14', { cambios: { lugar: 'Salón', lugarId: 'salon' } });
    const escrito = excepcion('2026-11-21', { cambios: { lugar: 'Plaza', lugarId: null } });
    const conHora = excepcion('2026-11-28', {
      cambios: { lugar: 'Salón', lugarId: 'salon', hora: '20:00:00' },
    });

    expect(
      getExcepcionesPerdidas([lugar, escrito, conHora], FECHAS, true, { cambiaDuenio: true }),
    ).toEqual([lugar]);
    expect(getExcepcionesPerdidas([lugar, escrito, conHora], FECHAS, true)).toEqual([]);
  });

  it('loses a date moved onto a day the series now has', () => {
    const movida = excepcion('2026-11-07', { fechaNueva: '2026-11-10' });

    expect(getExcepcionesPerdidas([movida], ['2026-11-07', '2026-11-10'], true)).toEqual([movida]);
  });

  it('keeps a date moved onto a day whose own date moved away', () => {
    const primera = excepcion('2026-11-07', { fechaNueva: '2026-11-14' });
    const segunda = excepcion('2026-11-14', { fechaNueva: '2026-11-15' });

    expect(getExcepcionesPerdidas([primera, segunda], FECHAS, true)).toEqual([]);
  });

  it('loses a date moved onto a day that comes back when its own move is lost', () => {
    // 11-10 joins the series, so the move of 11-07 to it is lost; 11-07 comes
    // back, so the move of 11-14 onto 11-07 is lost too.
    const primera = excepcion('2026-11-07', { fechaNueva: '2026-11-10' });
    const segunda = excepcion('2026-11-14', { fechaNueva: '2026-11-07' });

    expect(
      getExcepcionesPerdidas([primera, segunda], ['2026-11-07', '2026-11-10', '2026-11-14'], true),
    ).toEqual([primera, segunda]);
  });
});

describe('puedeMoverFecha', () => {
  it('rejects moving a date onto another date of the series', () => {
    expect(puedeMoverFecha('2026-11-07', '2026-11-14', FECHAS, [])).toBe(false);
  });

  it('accepts a day with no date of the series', () => {
    expect(puedeMoverFecha('2026-11-07', '2026-11-10', FECHAS, [])).toBe(true);
  });

  it('rejects coming back to its own day once another date moved there', () => {
    const lejos = excepcion('2026-11-14', { fechaNueva: '2026-11-15' });
    const encima = excepcion('2026-11-07', { fechaNueva: '2026-11-14' });

    expect(puedeMoverFecha('2026-11-14', '2026-11-14', FECHAS, [lejos, encima])).toBe(false);
  });

  it('accepts the own day of the date, which is not moving it', () => {
    const movida = excepcion('2026-11-07', { fechaNueva: '2026-11-10' });

    expect(puedeMoverFecha('2026-11-07', '2026-11-07', FECHAS, [movida])).toBe(true);
  });

  it('rejects the day another date moved to', () => {
    const movida = excepcion('2026-11-14', { fechaNueva: '2026-11-10' });

    expect(puedeMoverFecha('2026-11-07', '2026-11-10', FECHAS, [movida])).toBe(false);
  });

  it('accepts the day of a date that moved away or was deleted', () => {
    const movida = excepcion('2026-11-14', { fechaNueva: '2026-11-15' });
    const borrada = excepcion('2026-11-21', { borrada: true });
    const sinLa21 = ['2026-11-07', '2026-11-14', '2026-11-28'];

    expect(puedeMoverFecha('2026-11-07', '2026-11-14', sinLa21, [movida, borrada])).toBe(true);
    expect(puedeMoverFecha('2026-11-07', '2026-11-21', sinLa21, [movida, borrada])).toBe(true);
  });
});
