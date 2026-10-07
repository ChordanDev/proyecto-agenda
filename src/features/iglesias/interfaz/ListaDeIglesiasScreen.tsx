import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { accesibilidad, colors, fontSize, radius, spacing } from '@/shared/theme';

import { useIglesias } from '../datos/useIglesias';
import { buscarIglesias } from '../dominio/buscarIglesias';

/**
 * Temporary proof screen of the project skeleton: it shows real data read
 * through the `datos` layer. It is not one of the approved designs and is
 * replaced by "Elegir iglesia".
 */
export function ListaDeIglesiasScreen() {
  const { data, isPending, isError, refetch } = useIglesias();

  return (
    <SafeAreaView style={styles.screen}>
      <Text style={styles.title} accessibilityRole="header">
        Iglesias
      </Text>

      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.azulOscuro} />
          <Text style={styles.message}>Cargando iglesias…</Text>
        </View>
      ) : isError ? (
        <View style={styles.centered}>
          <Text style={styles.message}>
            No se pudieron cargar las iglesias. Revise la conexión e intente de nuevo.
          </Text>
          <Pressable style={styles.button} accessibilityRole="button" onPress={() => refetch()}>
            <Text style={styles.buttonText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={buscarIglesias(data, '')}
          keyExtractor={(iglesia) => iglesia.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.message}>No hay iglesias cargadas.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.nombre}</Text>
              <Text style={styles.detail}>
                {item.distrito} · {item.localidad}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.fondoClaro,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  title: {
    fontSize: fontSize.tituloPantalla,
    fontWeight: '700',
    color: colors.textoTitulo,
    marginVertical: spacing.tarjetaPadding,
  },
  list: {
    gap: spacing.entreTarjetas,
    paddingBottom: spacing.tarjetaPadding,
  },
  card: {
    backgroundColor: colors.superficie,
    borderRadius: radius.tarjeta,
    padding: spacing.tarjetaPadding,
  },
  name: {
    fontSize: fontSize.cuerpoGrande,
    fontWeight: '600',
    color: colors.texto,
  },
  detail: {
    fontSize: fontSize.secundario,
    color: colors.textoSecundario,
    marginTop: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.tarjetaPadding,
  },
  message: {
    fontSize: fontSize.cuerpo,
    color: colors.textoSecundario,
    textAlign: 'center',
  },
  button: {
    minHeight: accesibilidad.alturaBotonPrincipal,
    justifyContent: 'center',
    paddingHorizontal: 32,
    borderRadius: radius.boton,
    backgroundColor: colors.azulOscuro,
  },
  buttonText: {
    fontSize: fontSize.cuerpoGrande,
    fontWeight: '600',
    color: colors.textoSobreOscuro,
  },
});
