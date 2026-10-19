import { getEstructuraDelAdmin } from './getEstructuraDelAdmin';

type Llamada = [metodo: string, ...argumentos: unknown[]];

// The rows each query answers, by table, given the calls that built it.
let mockResponder: (tabla: string, llamadas: Llamada[]) => unknown[] | object;

// A builder like the one of supabase-js: every method returns the same query,
// which answers once awaited.
jest.mock('@/shared/supabase', () => {
  const consulta = (tabla: string) => {
    const llamadas: Llamada[] = [];
    const query: object = new Proxy(
      {},
      {
        get: (_objeto, metodo: string) =>
          metodo === 'then'
            ? (resolver: (respuesta: unknown) => unknown) =>
                resolver({ data: mockResponder(tabla, llamadas), error: null })
            : (...argumentos: unknown[]) => {
                llamadas.push([metodo, ...argumentos]);
                return query;
              },
      },
    );
    return query;
  };

  return {
    supabase: {
      auth: {
        getSession: () =>
          Promise.resolve({ data: { session: { user: { id: 'admin' } } }, error: null }),
      },
      from: consulta,
      rpc: () => Promise.resolve({ data: [], error: null }),
    },
  };
});

const ASOCIACION = { id: 'a1', nombre: 'Asociación' };

beforeEach(() => {
  mockResponder = (tabla, llamadas) => {
    switch (tabla) {
      case 'cargos':
        // The cargo de admin of the usuario; no pastores.
        return llamadas.some(([metodo]) => metodo === 'limit') ? [{ asociacion_id: 'a1' }] : [];
      case 'asociaciones':
        return ASOCIACION;
      case 'distritos':
        return [
          { id: 'norte', nombre: 'Distrito Norte', de_baja: false },
          { id: 'oeste', nombre: 'Distrito Oeste', de_baja: true },
        ];
      case 'iglesias':
        return [
          {
            id: 'rosas',
            nombre: 'Iglesia Las Rosas',
            direccion: 'Pringles 820',
            localidad: 'San Luis',
            distrito_id: 'norte',
            de_baja: false,
            cargos: [{ count: 1200 }],
          },
          {
            id: 'molles',
            nombre: 'Iglesia Los Molles',
            direccion: 'Calle 1',
            localidad: 'Los Molles',
            distrito_id: 'oeste',
            de_baja: true,
            cargos: [{ count: 0 }],
          },
        ];
      default:
        return [];
    }
  };
});

describe('getEstructuraDelAdmin', () => {
  it('counts every encargado of an iglesia, however many cargos the asociacion has', async () => {
    const estructura = await getEstructuraDelAdmin();

    expect(estructura?.iglesias.map((iglesia) => iglesia.cantidadDeEncargados)).toEqual([1200]);
  });

  it('lists apart the distritos and iglesias dados de baja', async () => {
    const estructura = await getEstructuraDelAdmin();

    expect(estructura?.distritos.map((distrito) => distrito.nombre)).toEqual(['Distrito Norte']);
    expect(estructura?.iglesias.map((iglesia) => iglesia.nombre)).toEqual(['Iglesia Las Rosas']);
    expect(estructura?.distritosDeBaja).toEqual([{ id: 'oeste', nombre: 'Distrito Oeste' }]);
    expect(estructura?.iglesiasDeBaja).toEqual([
      {
        id: 'molles',
        nombre: 'Iglesia Los Molles',
        distritoNombre: 'Distrito Oeste',
        distritoDeBaja: true,
      },
    ]);
  });
});
