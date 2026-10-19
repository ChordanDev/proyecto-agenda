import type { Cargo } from '@/features/sesion/dominio/cargo';
import type { Evento } from '@/features/eventos/dominio/evento';

import type { FechaDeEvento, IglesiaEnEstructura } from './armarCalendario';
import { armarCalendarioDeUsuario, getIglesiasDeCargos } from './armarCalendarioDeUsuario';

// The structure of the tests:
//
//   asociacion-central
//     distrito-centro: iglesia-central, iglesia-nueva
//     distrito-norte:  iglesia-arguello
//   otra-asociacion
//     distrito-lejano: iglesia-lejana

const central: IglesiaEnEstructura = {
  id: 'iglesia-central',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};
const nueva: IglesiaEnEstructura = {
  id: 'iglesia-nueva',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};
const arguello: IglesiaEnEstructura = {
  id: 'iglesia-arguello',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};
const lejana: IglesiaEnEstructura = {
  id: 'iglesia-lejana',
  distritoId: 'distrito-lejano',
  asociacionId: 'otra-asociacion',
};
const todas = [central, nueva, arguello, lejana];

const ids = (iglesias: readonly IglesiaEnEstructura[]) => iglesias.map((iglesia) => iglesia.id);

describe('getIglesiasDeCargos', () => {
  it('gives the iglesia of an encargado', () => {
    const cargos: Cargo[] = [{ nivel: 'iglesia', iglesiaId: central.id }];

    expect(ids(getIglesiasDeCargos(cargos, todas))).toEqual(['iglesia-central']);
  });

  it('gives every iglesia of the distrito of a pastor, and no other', () => {
    const cargos: Cargo[] = [{ nivel: 'distrito', distritoId: 'distrito-centro' }];

    expect(ids(getIglesiasDeCargos(cargos, todas))).toEqual(['iglesia-central', 'iglesia-nueva']);
  });

  it('gives every iglesia of the asociacion of an admin, and no other', () => {
    const cargos: Cargo[] = [{ nivel: 'asociacion', asociacionId: 'asociacion-central' }];

    expect(ids(getIglesiasDeCargos(cargos, todas))).toEqual([
      'iglesia-central',
      'iglesia-nueva',
      'iglesia-arguello',
    ]);
  });

  it('gives each iglesia once when several cargos cover it', () => {
    const cargos: Cargo[] = [
      { nivel: 'iglesia', iglesiaId: central.id },
      { nivel: 'distrito', distritoId: 'distrito-centro' },
      { nivel: 'asociacion', asociacionId: 'asociacion-central' },
    ];

    expect(ids(getIglesiasDeCargos(cargos, todas))).toEqual([
      'iglesia-central',
      'iglesia-nueva',
      'iglesia-arguello',
    ]);
  });

  it('joins the iglesias of cargos on different levels', () => {
    const cargos: Cargo[] = [
      { nivel: 'iglesia', iglesiaId: arguello.id },
      { nivel: 'distrito', distritoId: 'distrito-centro' },
    ];

    expect(ids(getIglesiasDeCargos(cargos, todas))).toEqual([
      'iglesia-central',
      'iglesia-nueva',
      'iglesia-arguello',
    ]);
  });

  it('gives none for a cargo on a level that has no iglesias, or for no cargos', () => {
    expect(getIglesiasDeCargos([], todas)).toEqual([]);
    expect(
      getIglesiasDeCargos([{ nivel: 'distrito', distritoId: 'distrito-vacio' }], todas),
    ).toEqual([]);
  });

  it('leaves out an iglesia dada de baja, and gives it again once reactivada', () => {
    const admin: Cargo[] = [{ nivel: 'asociacion', asociacionId: 'asociacion-central' }];

    expect(ids(getIglesiasDeCargos(admin, [central, { ...nueva, deBaja: true }]))).toEqual([
      'iglesia-central',
    ]);
    expect(ids(getIglesiasDeCargos(admin, [central, { ...nueva, deBaja: false }]))).toEqual([
      'iglesia-central',
      'iglesia-nueva',
    ]);
  });

  it('keeps whatever else the iglesias carry', () => {
    const conNombre = [{ ...central, nombre: 'Córdoba Central' }];

    expect(getIglesiasDeCargos([{ nivel: 'iglesia', iglesiaId: central.id }], conNombre)).toEqual(
      conNombre,
    );
  });
});

function evento(overrides: Partial<Evento>): Evento {
  return {
    id: 'evento-' + (overrides.titulo ?? 'sin-titulo'),
    titulo: 'Culto de oración',
    lugar: null,
    lugarId: null,
    descripcion: null,
    enfasis: null,
    duenio: { alcance: 'iglesia', iglesiaId: central.id },
    hora: '20:00:00',
    fechaFin: null,
    repeticion: 'ninguna',
    finDeSerie: null,
    iglesiasSumadas: [],
    ...overrides,
  };
}

function fecha(fechaLocal: string, overrides: Partial<Evento> = {}): FechaDeEvento {
  return { fecha: fechaLocal, evento: evento(overrides) };
}

const titulos = (fechas: FechaDeEvento[]) => fechas.map((f) => f.evento.titulo);

describe('armarCalendarioDeUsuario', () => {
  const encargado: Cargo[] = [{ nivel: 'iglesia', iglesiaId: central.id }];
  const pastor: Cargo[] = [{ nivel: 'distrito', distritoId: 'distrito-centro' }];
  const admin: Cargo[] = [{ nivel: 'asociacion', asociacionId: 'asociacion-central' }];

  const deCentral = fecha('2026-10-07', { titulo: 'Culto de Central' });
  const deNueva = fecha('2026-10-08', {
    titulo: 'Culto de Nueva',
    duenio: { alcance: 'iglesia', iglesiaId: nueva.id },
  });
  const deArguello = fecha('2026-10-09', {
    titulo: 'Culto de Argüello',
    duenio: { alcance: 'iglesia', iglesiaId: arguello.id },
  });
  const deLejana = fecha('2026-10-10', {
    titulo: 'Culto de Lejana',
    duenio: { alcance: 'iglesia', iglesiaId: lejana.id },
  });
  const deDistritoCentro = fecha('2026-10-24', {
    titulo: 'Encuentro del distrito',
    duenio: { alcance: 'distrito', distritoId: 'distrito-centro' },
  });
  const deAsociacion = fecha('2026-10-30', {
    titulo: 'Congreso',
    duenio: { alcance: 'asociacion', asociacionId: 'asociacion-central' },
  });
  const fechas = [deCentral, deNueva, deArguello, deLejana, deDistritoCentro, deAsociacion];

  it('shows an encargado the calendario of their iglesia, with the eventos above it', () => {
    expect(titulos(armarCalendarioDeUsuario(encargado, todas, fechas))).toEqual([
      'Culto de Central',
      'Encuentro del distrito',
      'Congreso',
    ]);
  });

  it('shows a pastor the iglesias of their distrito together', () => {
    expect(titulos(armarCalendarioDeUsuario(pastor, todas, fechas))).toEqual([
      'Culto de Central',
      'Culto de Nueva',
      'Encuentro del distrito',
      'Congreso',
    ]);
  });

  it('shows an admin every iglesia of the asociacion, and nothing of another one', () => {
    expect(titulos(armarCalendarioDeUsuario(admin, todas, fechas))).toEqual([
      'Culto de Central',
      'Culto de Nueva',
      'Culto de Argüello',
      'Encuentro del distrito',
      'Congreso',
    ]);
  });

  it('does not show the eventos of an iglesia dada de baja, and shows them again once reactivada', () => {
    const conNuevaDeBaja = [central, { ...nueva, deBaja: true }, arguello, lejana];
    const conNuevaReactivada = [central, { ...nueva, deBaja: false }, arguello, lejana];

    expect(titulos(armarCalendarioDeUsuario(pastor, conNuevaDeBaja, fechas))).toEqual([
      'Culto de Central',
      'Encuentro del distrito',
      'Congreso',
    ]);
    expect(titulos(armarCalendarioDeUsuario(pastor, conNuevaReactivada, fechas))).toEqual([
      'Culto de Central',
      'Culto de Nueva',
      'Encuentro del distrito',
      'Congreso',
    ]);
  });

  it('shows an evento of the distrito or the asociacion once, however many iglesias see it', () => {
    const calendario = armarCalendarioDeUsuario(admin, todas, [deDistritoCentro, deAsociacion]);

    expect(titulos(calendario)).toEqual(['Encuentro del distrito', 'Congreso']);
  });

  it('shows an evento once when two of the iglesias are sumadas to it', () => {
    const compartido = fecha('2026-11-01', {
      titulo: 'Compartido',
      duenio: { alcance: 'iglesia', iglesiaId: lejana.id },
      iglesiasSumadas: [central.id, nueva.id],
    });

    expect(titulos(armarCalendarioDeUsuario(pastor, todas, [compartido]))).toEqual(['Compartido']);
  });

  it('shows an evento once when the input repeats its row', () => {
    expect(armarCalendarioDeUsuario(pastor, todas, [deDistritoCentro, deDistritoCentro])).toEqual([
      deDistritoCentro,
    ]);
  });

  it('keeps each date of a series as its own entry', () => {
    const primera = fecha('2026-10-07', { id: 'serie', titulo: 'Culto semanal' });
    const segunda = fecha('2026-10-14', { id: 'serie', titulo: 'Culto semanal' });

    expect(armarCalendarioDeUsuario(pastor, todas, [segunda, primera, segunda])).toEqual([
      primera,
      segunda,
    ]);
  });

  it('orders by date, then hora, then titulo', () => {
    const tarde = fecha('2026-10-07', { titulo: 'Tarde', hora: '18:00:00' });
    const manana = fecha('2026-10-07', { titulo: 'Mañana', hora: '09:00:00' });
    const otroDia = fecha('2026-10-06', {
      titulo: 'Antes',
      duenio: { alcance: 'iglesia', iglesiaId: nueva.id },
    });

    expect(titulos(armarCalendarioDeUsuario(pastor, todas, [tarde, manana, otroDia]))).toEqual([
      'Antes',
      'Mañana',
      'Tarde',
    ]);
  });

  it('is empty for a usuario whose cargos cover no iglesia', () => {
    expect(armarCalendarioDeUsuario([], todas, fechas)).toEqual([]);
  });
});
