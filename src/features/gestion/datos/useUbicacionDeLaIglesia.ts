import { useState } from 'react';

import type { Punto } from '@/features/iglesias/dominio/distancia';

import {
  getClaveDeUbicacion,
  getDireccionABuscar,
  type ClaveDeUbicacion,
  type DatosDeLaIglesia,
} from '../dominio/estructuraDelAdmin';
import { useUbicacionEstimada, type UbicacionEstimada } from './useUbicacionEstimada';

type TextosDeUbicacion = Pick<DatosDeLaIglesia, 'direccion' | 'ciudad' | 'provincia'>;

/**
 * The marker of the map of "Nueva iglesia" and "Editar iglesia":
 * - it starts at the saved point, if any;
 * - it goes to the estimated location of a direccion it does not stand for yet
 *   (getDireccionABuscar);
 * - the admin moves it by hand, and then it stands for the texts it was moved
 *   for: an estimate still on its way is dropped.
 *
 * `marcadorAlDia`: the marker stands for the direccion written. Not while the
 * map looks for a new one, nor after it was not found, until the admin moves
 * the marker by hand.
 */
export function useUbicacionDeLaIglesia(
  textos: TextosDeUbicacion,
  guardada: Punto | null,
): {
  coordenadas: Punto | null;
  estimada: UbicacionEstimada;
  marcadorAlDia: boolean;
  moverMarcador: (punto: Punto) => void;
} {
  const [coordenadas, setCoordenadas] = useState(guardada);
  // A saved point stands for the texts the iglesia was saved with.
  const [ubicadaPara, setUbicadaPara] = useState<ClaveDeUbicacion | null>(() =>
    guardada === null ? null : getClaveDeUbicacion(textos),
  );
  const pedido = getDireccionABuscar(textos, ubicadaPara);

  const estimada = useUbicacionEstimada(pedido?.direccion ?? null, (punto, direccion) => {
    if (pedido === null || pedido.direccion !== direccion) return;
    setCoordenadas(punto);
    setUbicadaPara(pedido.para);
  });

  const moverMarcador = (punto: Punto) => {
    setCoordenadas(punto);
    setUbicadaPara(getClaveDeUbicacion(textos));
  };

  return { coordenadas, estimada, marcadorAlDia: pedido === null, moverMarcador };
}
