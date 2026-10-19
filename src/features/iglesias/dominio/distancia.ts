/** A position on Earth, in decimal degrees. */
export type Punto = {
  latitud: number;
  longitud: number;
};

/** Mean radius of the Earth, in metres. */
const EARTH_RADIUS_METRES = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Straight-line distance in metres between two points, over the surface of
 * the Earth (haversine formula).
 */
export function distanciaEnMetros(desde: Punto, hasta: Punto): number {
  const deltaLatitud = toRadians(hasta.latitud - desde.latitud);
  const deltaLongitud = toRadians(hasta.longitud - desde.longitud);

  const haversine =
    Math.sin(deltaLatitud / 2) ** 2 +
    Math.cos(toRadians(desde.latitud)) *
      Math.cos(toRadians(hasta.latitud)) *
      Math.sin(deltaLongitud / 2) ** 2;

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

/**
 * Text of a distance: rounded metres below 1 km ("a 800 m"), kilometres with
 * one decimal and a comma below 10 km ("a 3,2 km"), and whole kilometres from
 * 10 km ("a 25 km"). A decimal of zero is dropped ("a 2 km").
 */
export function formatDistancia(metros: number): string {
  const roundedMetres = Math.round(metros);

  if (roundedMetres < 1000) {
    return `a ${roundedMetres} m`;
  }

  const kilometres = roundedMetres / 1000;
  const oneDecimal = Math.round(kilometres * 10) / 10;

  if (oneDecimal < 10) {
    return `a ${String(oneDecimal).replace('.', ',')} km`;
  }

  return `a ${Math.round(kilometres)} km`;
}
