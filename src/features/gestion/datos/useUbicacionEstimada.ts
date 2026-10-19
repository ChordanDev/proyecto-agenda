import * as Location from 'expo-location';
import { useEffect, useEffectEvent, useState } from 'react';

import type { Punto } from '@/features/iglesias/dominio/distancia';

import type { EstadoDelMapa } from '../dominio/estructuraDelAdmin';

/**
 * Where the map of "Nueva iglesia" and "Editar iglesia" stands with the
 * direccion it looks for:
 * - `idle`: nothing to look for.
 * - `buscando`: the phone is looking for it.
 * - `encontrada`: the estimated location, already handed to `onEncontrada`.
 * - `noEncontrada`: the phone could not find it; the admin places the marker.
 */
export type UbicacionEstimada = { status: EstadoDelMapa };

// Looks for the direccion once the admin stops typing, not on every letter:
// the geocoder of the phone rejects too many requests.
export const ESPERA_MS = 800;
// A phone without a connection would otherwise leave "Buscando…" with no end.
export const TIMEOUT_MS = 15_000;

/** The point of a direccion, with the geocoder of the phone; null when it is not found. */
async function ubicarDireccion(direccion: string): Promise<Punto | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const resultado = await Promise.race([
    Location.geocodeAsync(direccion),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('Geocoding timed out')), TIMEOUT_MS);
    }),
  ]).finally(() => clearTimeout(timeout));
  const [primero] = resultado;

  return primero ? { latitud: primero.latitude, longitud: primero.longitude } : null;
}

/**
 * Estimates where a direccion is (getDireccionParaElMapa), and hands the point
 * to `onEncontrada`. Null: nothing to look for. A direccion that changes while
 * it is being looked for drops the earlier answer, and every new search shows
 * as `buscando`, also for a direccion that was already answered.
 */
export function useUbicacionEstimada(
  direccion: string | null,
  onEncontrada: (punto: Punto, direccion: string) => void,
): UbicacionEstimada {
  const [respuesta, setRespuesta] = useState<{
    direccion: string;
    status: 'encontrada' | 'noEncontrada';
  } | null>(null);
  const entregar = useEffectEvent(onEncontrada);

  // An answer is only for the search it came from: leaving its direccion
  // forgets it, so coming back to it searches again.
  const [buscada, setBuscada] = useState(direccion);
  if (buscada !== direccion) {
    setBuscada(direccion);
    setRespuesta(null);
  }

  useEffect(() => {
    if (direccion === null) {
      return;
    }

    let vigente = true;
    const timer = setTimeout(() => {
      ubicarDireccion(direccion)
        .catch(() => null)
        .then((punto) => {
          if (!vigente) return;
          if (punto !== null) entregar(punto, direccion);
          setRespuesta({ direccion, status: punto === null ? 'noEncontrada' : 'encontrada' });
        });
    }, ESPERA_MS);

    return () => {
      vigente = false;
      clearTimeout(timer);
    };
  }, [direccion]);

  if (direccion === null) {
    return { status: 'idle' };
  }

  return respuesta?.direccion === direccion ? { status: respuesta.status } : { status: 'buscando' };
}
