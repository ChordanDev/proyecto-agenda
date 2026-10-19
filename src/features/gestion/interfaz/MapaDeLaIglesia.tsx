import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, type LatLng, type MapPressEvent } from 'react-native-maps';

import type { Punto } from '@/features/iglesias/dominio/distancia';
import { colors, radius } from '@/shared/theme';

// Layout of the approved mockup (diseno/pantallas/09b-iglesia.html), which the
// theme has no tokens for.
const MAP_HEIGHT = 220;
// About the size of a few blocks: enough to tell the street of the iglesia.
const CERCA_DELTA = 0.005;
// Before the marker is placed: the whole country, so the admin can tap it.
const ARGENTINA = { latitude: -38.4, longitude: -63.6, latitudeDelta: 25, longitudeDelta: 25 };

function aLatLng(punto: Punto): LatLng {
  return { latitude: punto.latitud, longitude: punto.longitud };
}

function aPunto({ latitude, longitude }: LatLng): Punto {
  return { latitud: latitude, longitud: longitude };
}

type MapaDeLaIglesiaProps = {
  /** Where the marker is; null until it is placed. */
  coordenadas: Punto | null;
  onCambiar: (punto: Punto) => void;
};

/**
 * The map of "Nueva iglesia" and "Editar iglesia": a marker the admin drags,
 * or places by tapping the map. When the marker moves from outside (the
 * estimated location of a new direccion), the map goes to it.
 */
export function MapaDeLaIglesia({ coordenadas, onCambiar }: MapaDeLaIglesiaProps) {
  const mapa = useRef<MapView>(null);
  // The last point the admin chose on the map: the map is already there.
  const elegido = useRef<Punto | null>(null);

  const latitud = coordenadas?.latitud;
  const longitud = coordenadas?.longitud;

  useEffect(() => {
    if (latitud === undefined || longitud === undefined) return;
    if (elegido.current?.latitud === latitud && elegido.current.longitud === longitud) return;

    mapa.current?.animateToRegion({
      latitude: latitud,
      longitude: longitud,
      latitudeDelta: CERCA_DELTA,
      longitudeDelta: CERCA_DELTA,
    });
  }, [latitud, longitud]);

  const elegir = (lugar: LatLng) => {
    const punto = aPunto(lugar);
    elegido.current = punto;
    onCambiar(punto);
  };

  return (
    <View style={styles.marco}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        initialRegion={
          coordenadas === null
            ? ARGENTINA
            : { ...aLatLng(coordenadas), latitudeDelta: CERCA_DELTA, longitudeDelta: CERCA_DELTA }
        }
        onPress={(evento: MapPressEvent) => elegir(evento.nativeEvent.coordinate)}
        accessibilityLabel="Mapa con la ubicación de la iglesia"
        toolbarEnabled={false}
        showsPointsOfInterests={false}
      >
        {coordenadas !== null && (
          <Marker
            coordinate={aLatLng(coordenadas)}
            draggable
            pinColor={colors.peligro}
            onDragEnd={(evento) => elegir(evento.nativeEvent.coordinate)}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    height: MAP_HEIGHT,
    borderRadius: radius.campo,
    overflow: 'hidden',
    backgroundColor: colors.campo,
  },
});
