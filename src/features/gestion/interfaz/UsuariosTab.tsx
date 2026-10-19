import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/shared/theme';
import { AppText, Card, SearchField } from '@/shared/ui';

import { getIniciales } from '../dominio/encargados';
import {
  buscarUsuarios,
  getResumenDeCargos,
  type UsuarioDelAdmin,
} from '../dominio/usuariosDelAdmin';
import { BotonAgregar, Lista } from './ListaDelAdmin';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/09-gestion-admin.html.
const ROW_GAP = 12; // line 115
const ROW_PADDING_VERTICAL = 12;
const ROW_PADDING_LEFT = 18;
const ROW_PADDING_RIGHT = 14;
const AVATAR_SIZE = 44; // line 116
const AVATAR_LABEL_SIZE = 15;
const ROW_TEXTS_GAP = 1; // line 117
const ROW_TITLE_SIZE = 17; // line 118
const CHEVRON_SIZE = 20; // line 121
const CHEVRON_STROKE_WIDTH = 2.4;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type UsuariosTabProps = {
  /** Ordered by nombre. */
  usuarios: UsuarioDelAdmin[];
};

/**
 * The tab Usuarios: everyone with a cargo in the asociacion, with their first
 * cargo and how many more, and a search by nombre or correo.
 */
export function UsuariosTab({ usuarios }: UsuariosTabProps) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const encontrados = buscarUsuarios(usuarios, texto);

  return (
    <>
      <BotonAgregar label="Agregar usuario" onPress={() => router.push('/gestion/usuario/nuevo')} />

      <SearchField
        value={texto}
        onChangeText={setTexto}
        placeholder="Buscar por nombre o correo"
        accessibilityLabel="Buscar por nombre o correo"
      />

      {encontrados.length > 0 ? (
        <Lista>
          {encontrados.map((usuario, index) => (
            <Pressable
              key={usuario.usuarioId}
              accessibilityRole="button"
              accessibilityHint="Abre el usuario para ver y cambiar sus cargos"
              onPress={() =>
                router.push({
                  pathname: '/gestion/usuario/[id]',
                  params: { id: usuario.usuarioId },
                })
              }
              style={({ pressed }) => [
                styles.row,
                index < encontrados.length - 1 && styles.rowDivider,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.avatar}>
                <AppText weight="bold" color="azulOscuro" style={styles.avatarLabel}>
                  {getIniciales(usuario.nombre)}
                </AppText>
              </View>
              <View style={styles.rowTexts}>
                <AppText weight="bold" style={styles.rowTitle}>
                  {usuario.nombre}
                </AppText>
                <AppText variant="secundario" color="textoSecundario">
                  {getResumenDeCargos(usuario.cargos)}
                </AppText>
              </View>
              <Svg
                width={CHEVRON_SIZE}
                height={CHEVRON_SIZE}
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.textoTenue}
                strokeWidth={CHEVRON_STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.chevron}
              >
                <Path d="M9 6l6 6-6 6" />
              </Svg>
            </Pressable>
          ))}
        </Lista>
      ) : (
        // A state the mockup does not draw.
        <Card>
          <AppText color="textoSecundario">
            {usuarios.length === 0
              ? 'Todavía nadie tiene un cargo.'
              : 'Ningún usuario coincide con la búsqueda.'}
          </AppText>
        </Card>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingLeft: ROW_PADDING_LEFT,
    paddingRight: ROW_PADDING_RIGHT,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.azulSuave,
  },
  avatarLabel: {
    fontSize: AVATAR_LABEL_SIZE,
  },
  rowTexts: {
    flexShrink: 1,
    gap: ROW_TEXTS_GAP,
  },
  rowTitle: {
    fontSize: ROW_TITLE_SIZE,
  },
  chevron: {
    marginLeft: 'auto',
    flexShrink: 0,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
