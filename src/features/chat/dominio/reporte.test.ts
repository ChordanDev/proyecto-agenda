import type { BorradorDeEvento } from './borrador';
import type { RespuestaDeConsulta } from './consulta';
import {
  crearConversacion,
  reducirConversacion,
  type AccionDeConversacion,
  type Conversacion,
} from './conversacion';
import {
  MOTIVO_INICIAL,
  MOTIVOS_DE_REPORTE,
  REPORTE_INICIAL,
  getMotivoDeLaHoja,
  getReporte,
  isMotivoDeReporte,
  puedeReportar,
} from './reporte';

function respuesta(extra: Partial<RespuestaDeConsulta> = {}): RespuestaDeConsulta {
  return {
    tipo: 'respuesta',
    texto: 'El sábado hay culto.',
    eventos: [],
    aviso: null,
    borrador: null,
    ...extra,
  };
}

const BORRADOR: BorradorDeEvento = {
  titulo: 'Culto joven',
  fecha: '2026-10-24',
  hora: '19:00:00',
  fechaFin: null,
  lugar: 'Templo',
  descripcion: null,
  enfasis: 'nuevas_generaciones',
  duenio: { alcance: 'iglesia', iglesiaId: 'i1' },
  duenioNombre: 'Iglesia Central',
  repeticion: 'ninguna',
  finDeSerie: null,
};
function aplicar(conversacion: Conversacion, ...acciones: AccionDeConversacion[]): Conversacion {
  return acciones.reduce(reducirConversacion, conversacion);
}

/** A conversacion with a pregunta `p1` and its respuesta `r1`. */
function respondida(extra: Partial<RespuestaDeConsulta> = {}): Conversacion {
  return aplicar(
    crearConversacion(1),
    { tipo: 'preguntar', id: 'p1', texto: '¿Qué hay el sábado?' },
    { tipo: 'responder', conversacionId: 1, id: 'r1', respuesta: respuesta(extra) },
  );
}

const reportar: AccionDeConversacion = {
  tipo: 'reportar',
  id: 'r1',
  reporteId: 'reporte-1',
  motivo: 'ofensiva',
};

describe('the motivos of a reporte', () => {
  it('are incorrecta, ofensiva and otro, in the order and words of the hoja', () => {
    expect(MOTIVOS_DE_REPORTE).toEqual([
      { motivo: 'incorrecta', texto: 'Es incorrecta' },
      { motivo: 'ofensiva', texto: 'Es ofensiva' },
      { motivo: 'otro', texto: 'Otro motivo' },
    ]);
  });

  it('start on "Es incorrecta", as the hoja opens', () => {
    expect(MOTIVO_INICIAL).toBe('incorrecta');
  });

  it('accept only those three', () => {
    expect(isMotivoDeReporte('incorrecta')).toBe(true);
    expect(isMotivoDeReporte('ofensiva')).toBe(true);
    expect(isMotivoDeReporte('otro')).toBe(true);
    expect(isMotivoDeReporte('aburrida')).toBe(false);
  });
});

describe('the motivo the hoja opens on', () => {
  it('is "Es incorrecta" for a respuesta never reported', () => {
    expect(getMotivoDeLaHoja(REPORTE_INICIAL)).toBe('incorrecta');
  });

  it('is the one of the try that failed', () => {
    const conversacion = aplicar(respondida(), reportar, {
      tipo: 'fallarReporte',
      id: 'r1',
      error: 'No se pudo enviar el reporte.',
    });

    expect(getMotivoDeLaHoja(getReporte(conversacion, 'r1')!)).toBe('ofensiva');
  });
});

describe('a respuesta', () => {
  it('can be reported once it arrives', () => {
    const conversacion = respondida();

    expect(getReporte(conversacion, 'r1')).toEqual(REPORTE_INICIAL);
    expect(puedeReportar(REPORTE_INICIAL)).toBe(true);
  });

  it('with the borrador of an evento can be reported too', () => {
    const conversacion = respondida({ borrador: BORRADOR });

    expect(conversacion.mensajes[1]?.tipo).toBe('propuesta');
    expect(getReporte(conversacion, 'r1')).toEqual(REPORTE_INICIAL);
  });

  it('is the only kind of mensaje that can be reported: not a pregunta', () => {
    const conversacion = respondida();

    expect(getReporte(conversacion, 'p1')).toBeNull();
    expect(reducirConversacion(conversacion, { ...reportar, id: 'p1' })).toBe(conversacion);
  });
});

describe('reportar', () => {
  it('sends the reporte with its id and cannot be reported again meanwhile', () => {
    const conversacion = aplicar(respondida(), reportar);

    expect(getReporte(conversacion, 'r1')).toEqual({
      estado: 'enviando',
      id: 'reporte-1',
      motivo: 'ofensiva',
      error: null,
    });
    expect(puedeReportar(getReporte(conversacion, 'r1')!)).toBe(false);
    expect(reducirConversacion(conversacion, reportar)).toBe(conversacion);
  });

  it('once sent shows it was sent and does not let it be reported again', () => {
    const conversacion = aplicar(respondida(), reportar, { tipo: 'reporteEnviado', id: 'r1' });

    expect(getReporte(conversacion, 'r1')).toEqual({
      estado: 'enviado',
      id: 'reporte-1',
      motivo: 'ofensiva',
      error: null,
    });
    expect(puedeReportar(getReporte(conversacion, 'r1')!)).toBe(false);
    expect(reducirConversacion(conversacion, { ...reportar, reporteId: 'reporte-2' })).toBe(
      conversacion,
    );
  });

  it('when it fails can be reported again, with the error, the same id and the same motivo', () => {
    const conversacion = aplicar(respondida(), reportar, {
      tipo: 'fallarReporte',
      id: 'r1',
      error: 'No se pudo enviar el reporte.',
    });

    expect(getReporte(conversacion, 'r1')).toEqual({
      estado: 'sin-reportar',
      id: 'reporte-1',
      motivo: 'ofensiva',
      error: 'No se pudo enviar el reporte.',
    });
    expect(puedeReportar(getReporte(conversacion, 'r1')!)).toBe(true);

    // A reporte that did reach the database is not saved twice.
    const otraVez = reducirConversacion(conversacion, { ...reportar, reporteId: 'reporte-2' });
    expect(getReporte(otraVez, 'r1')).toEqual({
      estado: 'enviando',
      id: 'reporte-1',
      motivo: 'ofensiva',
      error: null,
    });
  });

  it('when it fails and is sent again with another motivo, saves it with a new id', () => {
    const conversacion = aplicar(
      respondida(),
      reportar,
      { tipo: 'fallarReporte', id: 'r1', error: 'No se pudo enviar el reporte.' },
      { ...reportar, reporteId: 'reporte-2', motivo: 'incorrecta' },
    );

    // The first try may have been saved: reusing its id would keep its motivo.
    expect(getReporte(conversacion, 'r1')).toEqual({
      estado: 'enviando',
      id: 'reporte-2',
      motivo: 'incorrecta',
      error: null,
    });
  });

  it('a late answer does not change a reporte already sent', () => {
    const enviado = aplicar(respondida(), reportar, { tipo: 'reporteEnviado', id: 'r1' });

    expect(
      reducirConversacion(enviado, { tipo: 'fallarReporte', id: 'r1', error: 'Sin conexión' }),
    ).toBe(enviado);
  });

  it('a late answer of a conversacion started again changes nothing', () => {
    const nueva = aplicar(respondida(), reportar, { tipo: 'nueva', id: 2 });

    expect(reducirConversacion(nueva, { tipo: 'reporteEnviado', id: 'r1' })).toBe(nueva);
  });

  it('does not touch the propuesta of the respuesta reported', () => {
    const conversacion = aplicar(respondida({ borrador: BORRADOR }), reportar, {
      tipo: 'reporteEnviado',
      id: 'r1',
    });

    expect(conversacion.mensajes[1]).toMatchObject({ estado: 'pendiente', error: null });
  });
});
