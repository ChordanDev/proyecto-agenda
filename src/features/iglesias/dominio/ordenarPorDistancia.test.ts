import type { Iglesia } from './buscarIglesias';
import type { Punto } from './distancia';
import { ordenarPorDistancia } from './ordenarPorDistancia';

function iglesia(nombre: string, coordenadas?: Punto): Iglesia {
  return {
    id: 'id-' + nombre,
    nombre,
    direccion: 'Av. Colón 1250',
    localidad: 'Córdoba',
    distrito: 'Córdoba Centro',
    excluidaDelBuscador: false,
    coordenadas,
  };
}

const nombres = (iglesias: Iglesia[]) => iglesias.map((i) => i.nombre);

// Plaza San Martín, Córdoba.
const desde: Punto = { latitud: -31.4167, longitud: -64.1833 };

describe('ordenarPorDistancia', () => {
  it('orders the churches from the nearest to the farthest', () => {
    const iglesias = [
      iglesia('Alta Gracia', { latitud: -31.6577, longitud: -64.4294 }),
      iglesia('Centro', { latitud: -31.4201, longitud: -64.1888 }),
      iglesia('Villa Allende', { latitud: -31.2946, longitud: -64.2953 }),
    ];

    expect(nombres(ordenarPorDistancia(iglesias, desde))).toEqual([
      'Centro',
      'Villa Allende',
      'Alta Gracia',
    ]);
  });

  it('puts the churches without coordinates last, in order by name', () => {
    const iglesias = [
      iglesia('San Martín'),
      iglesia('Lejana', { latitud: -31.6577, longitud: -64.4294 }),
      iglesia('Argüello'),
      iglesia('Cercana', { latitud: -31.4201, longitud: -64.1888 }),
      iglesia('Barrio Norte'),
    ];

    expect(nombres(ordenarPorDistancia(iglesias, desde))).toEqual([
      'Cercana',
      'Lejana',
      'Argüello',
      'Barrio Norte',
      'San Martín',
    ]);
  });

  it('does not modify the list it receives', () => {
    const iglesias = [
      iglesia('Lejana', { latitud: -31.6577, longitud: -64.4294 }),
      iglesia('Cercana', { latitud: -31.4201, longitud: -64.1888 }),
    ];
    const copy = [...iglesias];

    ordenarPorDistancia(iglesias, desde);

    expect(iglesias).toEqual(copy);
  });
});
