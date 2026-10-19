import type {
  FechaDeEvento,
  IglesiaEnEstructura,
} from '@/features/calendario/dominio/armarCalendario';
import type { Evento } from '@/features/eventos/dominio/evento';

import { armarAvisoDeManiana, esHoraDelAviso, getManiana } from './avisoDeManiana';

const BUENOS_AIRES = 'America/Argentina/Buenos_Aires';

const central: IglesiaEnEstructura = {
  id: 'iglesia-central',
  distritoId: 'distrito-centro',
  asociacionId: 'asociacion-central',
};

const norte: IglesiaEnEstructura = {
  id: 'iglesia-norte',
  distritoId: 'distrito-norte',
  asociacionId: 'asociacion-central',
};

function evento(overrides: Partial<Evento>): Evento {
  return {
    id: 'evento-' + (overrides.titulo ?? 'sin-titulo'),
    titulo: 'Congreso de Jóvenes',
    lugar: null,
    lugarId: null,
    descripcion: null,
    enfasis: 'nuevas_generaciones',
    duenio: { alcance: 'iglesia', iglesiaId: central.id },
    hora: '19:00:00',
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

const MANIANA = '2026-10-24';

describe('armarAvisoDeManiana', () => {
  describe('actividades regulares', () => {
    it('gives no aviso for a day with only actividades regulares', () => {
      const fechas = [
        fecha(MANIANA, { titulo: 'Escuela Sabática', enfasis: null }),
        fecha(MANIANA, { titulo: 'Culto de oración', enfasis: null }),
      ];

      expect(armarAvisoDeManiana([central], fechas, MANIANA)).toBeNull();
    });

    it('does not count an actividad regular next to an evento with enfasis', () => {
      const fechas = [
        fecha(MANIANA, { titulo: 'Escuela Sabática', enfasis: null, hora: '09:00:00' }),
        fecha(MANIANA, { titulo: 'Congreso de Jóvenes', hora: '19:00:00' }),
      ];

      expect(armarAvisoDeManiana([central], fechas, MANIANA)).toBe('Mañana: Congreso de Jóvenes');
    });
  });

  describe('the text', () => {
    it('names a single evento', () => {
      const fechas = [fecha(MANIANA, { titulo: 'Congreso de Jóvenes' })];

      expect(armarAvisoDeManiana([central], fechas, MANIANA)).toBe('Mañana: Congreso de Jóvenes');
    });

    it('names the first of two eventos and counts the other', () => {
      const fechas = [
        fecha(MANIANA, { titulo: 'Culto joven', hora: '19:00:00' }),
        fecha(MANIANA, { titulo: 'Cena de líderes', hora: '21:00:00', enfasis: 'liderazgo' }),
      ];

      expect(armarAvisoDeManiana([central], fechas, MANIANA)).toBe(
        'Mañana: Culto joven y 1 evento más',
      );
    });

    it('names the first of three eventos and counts the others', () => {
      // Given out of order: the first is the earliest of the day.
      const fechas = [
        fecha(MANIANA, { titulo: 'Cena de líderes', hora: '21:00:00', enfasis: 'liderazgo' }),
        fecha(MANIANA, { titulo: 'Bautismo', hora: '20:00:00', enfasis: 'discipulado' }),
        fecha(MANIANA, { titulo: 'Culto joven', hora: '19:00:00' }),
      ];

      expect(armarAvisoDeManiana([central], fechas, MANIANA)).toBe(
        'Mañana: Culto joven y 2 eventos más',
      );
    });
  });

  describe('which dates warn', () => {
    it('gives no aviso when no evento is tomorrow', () => {
      const fechas = [fecha('2026-10-25', { titulo: 'Congreso de Jóvenes' })];

      expect(armarAvisoDeManiana([central], fechas, MANIANA)).toBeNull();
    });

    it('warns of an evento of several days only before its first day', () => {
      const campamento = fecha('2026-10-24', { titulo: 'Campamento', fechaFin: '2026-10-26' });

      expect(armarAvisoDeManiana([central], [campamento], '2026-10-24')).toBe('Mañana: Campamento');
      expect(armarAvisoDeManiana([central], [campamento], '2026-10-25')).toBeNull();
      expect(armarAvisoDeManiana([central], [campamento], '2026-10-26')).toBeNull();
    });

    it('warns of a repeated evento before each of its dates', () => {
      const serie = {
        titulo: 'Culto joven',
        repeticion: 'semanal',
        finDeSerie: '2027-10-24',
      } as const;
      const fechas = [fecha('2026-10-24', serie), fecha('2026-10-31', serie)];

      expect(armarAvisoDeManiana([central], fechas, '2026-10-24')).toBe('Mañana: Culto joven');
      expect(armarAvisoDeManiana([central], fechas, '2026-10-31')).toBe('Mañana: Culto joven');
    });
  });

  describe('the iglesias the phone follows', () => {
    it('counts once an evento seen in two iglesias it follows', () => {
      const sumado = fecha(MANIANA, {
        titulo: 'Congreso de Jóvenes',
        duenio: { alcance: 'iglesia', iglesiaId: central.id },
        iglesiasSumadas: [norte.id],
      });
      // The same date may also come twice from the reading.
      const fechas = [sumado, sumado];

      expect(armarAvisoDeManiana([central, norte], fechas, MANIANA)).toBe(
        'Mañana: Congreso de Jóvenes',
      );
    });

    it('leaves out the eventos of iglesias it does not follow', () => {
      const ajeno = fecha(MANIANA, {
        titulo: 'Culto joven',
        duenio: { alcance: 'iglesia', iglesiaId: norte.id },
      });

      expect(armarAvisoDeManiana([central], [ajeno], MANIANA)).toBeNull();
    });

    it('gives no aviso to a phone that follows no iglesia', () => {
      expect(armarAvisoDeManiana([], [fecha(MANIANA)], MANIANA)).toBeNull();
    });
  });
});

describe('getManiana', () => {
  it('is the day after today in the zona horaria of the asociacion', () => {
    // 20:00 in Buenos Aires (UTC-3) on 23 October.
    expect(getManiana(new Date('2026-10-23T23:00:00Z'), BUENOS_AIRES)).toBe('2026-10-24');
  });

  it('is counted in the zona horaria even when UTC is already another day', () => {
    // 22:30 in Buenos Aires on 23 October is already 24 October in UTC.
    expect(getManiana(new Date('2026-10-24T01:30:00Z'), BUENOS_AIRES)).toBe('2026-10-24');
  });

  it('crosses the end of a month and of a year', () => {
    expect(getManiana(new Date('2026-12-31T23:00:00Z'), BUENOS_AIRES)).toBe('2027-01-01');
  });
});

describe('esHoraDelAviso', () => {
  it('is 20 h in the zona horaria of the asociacion', () => {
    expect(esHoraDelAviso(new Date('2026-10-23T23:00:00Z'), BUENOS_AIRES)).toBe(true);
    expect(esHoraDelAviso(new Date('2026-10-23T23:59:00Z'), BUENOS_AIRES)).toBe(true);
  });

  it('is not any other hour', () => {
    // 20:00 UTC is 17:00 in Buenos Aires.
    expect(esHoraDelAviso(new Date('2026-10-23T20:00:00Z'), BUENOS_AIRES)).toBe(false);
    expect(esHoraDelAviso(new Date('2026-10-24T00:00:00Z'), BUENOS_AIRES)).toBe(false);
  });

  it('follows the zona horaria of each asociacion', () => {
    // 20:00 in Madrid (UTC+2 in October).
    expect(esHoraDelAviso(new Date('2026-10-23T18:00:00Z'), 'Europe/Madrid')).toBe(true);
  });
});
