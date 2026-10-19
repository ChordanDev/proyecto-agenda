import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/shared/theme';
import { AppText, Button, Card, Logo, ScreenBackground } from '@/shared/ui';

import { useEstructuraDelAdmin } from '../datos/useGestionAdmin';
import { useUsuariosDelAdmin } from '../datos/useUsuariosDelAdmin';
import { getSubtituloDeAsociacion } from '../dominio/estructuraDelAdmin';
import { DistritosTab } from './DistritosTab';
import { IglesiasTab } from './IglesiasTab';
import { UsuariosTab } from './UsuariosTab';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/09-gestion-admin.html.
const HEADER_PADDING_TOP = 22; // line 19
const HEADER_PADDING_HORIZONTAL = 20;
const HEADER_GAP = 14;
const LOGO_BOX_SIZE = 52; // line 20
const HEADER_TEXTS_GAP = 1; // line 21
const CONTENT_PADDING_TOP = 26; // line 27
const CONTENT_PADDING_BOTTOM = 24;
const CONTENT_GAP = 16;
const TABS_GAP = 4; // line 29
const TABS_PADDING = 4;
const TABS_RADIUS = 16;
const TAB_MIN_HEIGHT = 48; // line 32
const TAB_RADIUS = 12;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

// The bottom navigation takes care of the bottom edge.
const SAFE_AREA_EDGES = ['top', 'left', 'right'] as const;

type Pestania = 'distritos' | 'iglesias' | 'usuarios';

const PESTANIAS: { valor: Pestania; label: string }[] = [
  { valor: 'distritos', label: 'Distritos' },
  { valor: 'iglesias', label: 'Iglesias' },
  { valor: 'usuarios', label: 'Usuarios' },
];

/**
 * The gestion of the admin: the distritos and the iglesias of their
 * asociacion, which they create and edit, and everyone with a cargo in it.
 */
export function GestionAdminScreen() {
  const consulta = useEstructuraDelAdmin();
  const [pestania, setPestania] = useState<Pestania>('distritos');
  const estructura = consulta.data;
  const usuarios = useUsuariosDelAdmin(
    pestania === 'usuarios' ? estructura?.asociacion.id : undefined,
  );

  const renderContent = () => {
    if (estructura && pestania === 'distritos') {
      return <DistritosTab distritos={estructura.distritos} />;
    }
    if (estructura && pestania === 'iglesias') {
      return <IglesiasTab iglesias={estructura.iglesias} />;
    }
    if (estructura && usuarios.data) {
      return <UsuariosTab usuarios={usuarios.data} />;
    }
    const fallo = estructura ? usuarios : consulta;

    // States the mockup does not draw.
    return (
      <Card style={styles.message}>
        <AppText color="textoSecundario">
          {estructura === null
            ? 'No tenés una asociación a cargo.'
            : fallo.isError
              ? estructura
                ? 'No se pudieron leer los usuarios. Revisá la conexión y probá de nuevo.'
                : 'No se pudieron leer los distritos y las iglesias. Revisá la conexión y probá de nuevo.'
              : 'Cargando…'}
        </AppText>
        {fallo.isError && (
          <Button label="Reintentar" variant="secondary" onPress={() => fallo.refetch()} />
        )}
      </Card>
    );
  };

  return (
    <ScreenBackground edges={SAFE_AREA_EDGES}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Logo />
        </View>
        <View style={styles.headerTexts}>
          <AppText variant="tituloEncabezado" accessibilityRole="header">
            Gestión
          </AppText>
          {estructura && (
            <AppText variant="subtitulo">
              {getSubtituloDeAsociacion(
                estructura.asociacion.nombre,
                estructura.distritos.length,
                estructura.iglesias.length,
              )}
            </AppText>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View accessibilityRole="tablist" style={styles.tabs}>
          {PESTANIAS.map(({ valor, label }) => {
            const selected = valor === pestania;
            return (
              <Pressable
                key={valor}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setPestania(valor)}
                style={({ pressed }) => [
                  styles.tab,
                  selected && styles.tabSelected,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  weight={selected ? 'bold' : 'regular'}
                  color={selected ? 'textoSobreOscuro' : 'texto'}
                >
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {renderContent()}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: HEADER_GAP,
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: HEADER_PADDING_HORIZONTAL,
  },
  logoBox: {
    width: LOGO_BOX_SIZE,
    height: LOGO_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexts: {
    flexShrink: 1,
    gap: HEADER_TEXTS_GAP,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  tabs: {
    flexDirection: 'row',
    gap: TABS_GAP,
    padding: TABS_PADDING,
    borderRadius: TABS_RADIUS,
    backgroundColor: colors.superficie,
  },
  tab: {
    flex: 1,
    minHeight: TAB_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: TAB_RADIUS,
  },
  tabSelected: {
    backgroundColor: colors.azulOscuro,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
