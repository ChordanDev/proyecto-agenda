import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useFirstScreen } from '@/features/sesion/datos/useFirstScreen';
import { firstScreenRoute } from '@/features/sesion/dominio/firstScreenRoute';
import { colors, radius, spacing } from '@/shared/theme';
import {
  AppText,
  BackButton,
  Button,
  Card,
  Logo,
  ScreenBackground,
  SearchField,
} from '@/shared/ui';

import { useElegirIglesia } from '../datos/useElegirIglesia';
import { useIglesias } from '../datos/useIglesias';
import { buscarIglesias, type Iglesia } from '../dominio/buscarIglesias';
import { aceptaCambios, puedeConfirmar } from '../dominio/puedeConfirmar';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/03-elegir-iglesia.html.
const HEADER_PADDING_TOP = 22; // line 19
const LOGO_BOX_SIZE = 52; // line 22
const CONTENT_PADDING_TOP = 34; // line 25
const PADDING_BOTTOM = 32;
const TEXTS_GAP = 6; // line 26
const TEXTS_PADDING_HORIZONTAL = 4;
const PARAGRAPH_SIZE = 16; // line 28
const PARAGRAPH_LINE_HEIGHT = 1.45;
const ROW_GAP = 14; // line 39
const ROW_MIN_HEIGHT = 72;
const ROW_PADDING_VERTICAL = 12;
const ROW_TEXTS_GAP = 2; // line 40
// The mockup sets no line height on the two texts of a row: with the ones of
// the font they fit in its 72 of height, which the line heights of the theme
// (27 and 21) overflow.
const ROW_NAME_LINE_HEIGHT = 25;
const ROW_DETAIL_LINE_HEIGHT = 20;
const RADIO_SIZE = 28; // lines 45 and 48
const RADIO_BORDER_WIDTH = 2;
const CHECK_SIZE = 16; // line 45
const CHECK_STROKE_WIDTH = 3.2;

const SAVE_ERROR = 'No se pudo guardar la iglesia. Probá de nuevo.';

/**
 * The hermano looks for their iglesia by its nombre, picks it and confirms it
 * with "Continuar": only then it is stored on the phone as the iglesia elegida.
 */
export function ElegirIglesiaScreen() {
  const router = useRouter();
  const { data: iglesias, isError, isFetching, refetch } = useIglesias();
  const elegirIglesia = useElegirIglesia();
  const firstScreen = useFirstScreen();
  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const results = buscarIglesias(iglesias ?? [], searchText);
  // What is confirmed is always on display: a search that hides the selected
  // iglesia leaves nothing to confirm until it shows again.
  const canConfirm = puedeConfirmar(selectedId, results);
  // While saving, and once saved, the screen is leaving: nothing else changes.
  const acceptsChanges = aceptaCambios(elegirIglesia.status);

  // A save error describes the attempt made; it goes away with any new input.
  const clearSaveError = () => {
    if (elegirIglesia.isError) {
      elegirIglesia.reset();
    }
  };

  const changeSearchText = (text: string) => {
    clearSaveError();
    setSearchText(text);
  };

  const goToCalendario = () => {
    // The calendar is left as the only screen of the stack, so going back from
    // it never returns here nor to the Bienvenida.
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/calendario');
  };

  // Goes to the previous screen or, when this is the only one of the stack,
  // to the first screen of the app. Returns whether it handled the request.
  const goBack = () => {
    if (!acceptsChanges) {
      return true;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      // While the first screen is still being read, the start route decides it.
      router.replace(firstScreen === undefined ? '/' : firstScreenRoute(firstScreen));
    }
    return true;
  };

  // Android's back button follows the same rule; alone in the stack it would
  // otherwise close the app.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => goBack());
      return () => subscription.remove();
      // goBack is rebuilt on every render and only reads the values listed here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [acceptsChanges, firstScreen, router]),
  );

  const announceSaveError = () => {
    // Android reads the live region of the footer by itself; iOS has none.
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(SAVE_ERROR);
    }
  };

  const confirm = () => {
    if (canConfirm && selectedId !== null) {
      elegirIglesia.mutate(selectedId, {
        onSuccess: goToCalendario,
        onError: announceSaveError,
      });
    }
  };

  const select = (iglesiaId: string) => {
    if (!acceptsChanges) {
      return;
    }
    clearSaveError();
    setSelectedId(iglesiaId);
    // The keyboard covers "Continuar": picking an iglesia puts it back in view.
    Keyboard.dismiss();
  };

  const renderIglesias = () => {
    if (iglesias === undefined) {
      if (isError && !isFetching) {
        return (
          <Card style={styles.message}>
            <AppText color="textoSecundario" style={styles.paragraph}>
              No se pudieron cargar las iglesias. Revisá la conexión y probá de nuevo.
            </AppText>
            <Button label="Reintentar" variant="secondary" onPress={() => refetch()} />
          </Card>
        );
      }
      return <Message>Cargando iglesias…</Message>;
    }
    // An empty text returns every iglesia the search can show.
    if (buscarIglesias(iglesias, '').length === 0) {
      return <Message>Todavía no hay iglesias cargadas.</Message>;
    }
    if (results.length === 0) {
      return <Message>No encontramos ninguna iglesia con ese nombre.</Message>;
    }
    return (
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Iglesias">
        {results.map((iglesia) => (
          <IglesiaRow
            key={iglesia.id}
            iglesia={iglesia}
            checked={iglesia.id === selectedId}
            onPress={() => select(iglesia.id)}
          />
        ))}
      </View>
    );
  };

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <BackButton onPress={goBack} />
        <View style={styles.logoBox}>
          <Logo />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.texts}>
          <AppText variant="tituloPantalla" accessibilityRole="header">
            Elegí tu iglesia
          </AppText>
          <AppText color="textoSecundario" style={styles.paragraph}>
            Queda guardada. Podés cambiarla cuando quieras en Ajustes.
          </AppText>
        </View>

        <SearchField
          value={searchText}
          onChangeText={changeSearchText}
          placeholder="Buscar por nombre"
          accessibilityLabel="Buscar por nombre"
        />

        {renderIglesias()}
      </ScrollView>

      {/* Outside the scroll: "Continuar" stays in reach however long the list is. */}
      <View style={styles.footer}>
        {/* Always there, so that a screen reader says the error when it shows up. */}
        <View accessibilityLiveRegion="polite">
          {elegirIglesia.isError && (
            <AppText color="peligro" accessibilityRole="alert" style={styles.saveError}>
              {SAVE_ERROR}
            </AppText>
          )}
        </View>
        <Button
          label="Continuar"
          // Once stored, the screen is on its way out: a second touch has nothing to do.
          disabled={!canConfirm || elegirIglesia.isPending || elegirIglesia.isSuccess}
          onPress={confirm}
        />
      </View>
    </ScreenBackground>
  );
}

/** A state the mockup does not draw, as a text inside the white card. */
function Message({ children }: { children: string }) {
  return (
    <Card>
      <AppText color="textoSecundario" style={styles.paragraph}>
        {children}
      </AppText>
    </Card>
  );
}

type IglesiaRowProps = {
  iglesia: Iglesia;
  checked: boolean;
  onPress: () => void;
};

function IglesiaRow({ iglesia, checked, onPress }: IglesiaRowProps) {
  const { nombre, distrito, localidad } = iglesia;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={`${nombre}, ${distrito}, ${localidad}`}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowTexts}>
        <AppText variant="cuerpoGrande" weight="bold" style={styles.rowName}>
          {nombre}
        </AppText>
        <AppText variant="secundario" style={styles.rowDetail}>
          {distrito} · {localidad}
        </AppText>
      </View>
      {checked ? (
        <View style={[styles.radio, styles.radioChecked]}>
          <Svg width={CHECK_SIZE} height={CHECK_SIZE} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke={colors.textoSobreOscuro}
              strokeWidth={CHECK_STROKE_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
      ) : (
        <View style={[styles.radio, styles.radioUnchecked]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  logoBox: {
    width: LOGO_BOX_SIZE,
    height: LOGO_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.entreTarjetas,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    // With the top padding of the footer, the two gaps the mockup leaves between
    // the card and "Continuar" (lines 52-56).
    paddingBottom: spacing.entreTarjetas,
  },
  texts: {
    gap: TEXTS_GAP,
    paddingHorizontal: TEXTS_PADDING_HORIZONTAL,
  },
  paragraph: {
    fontSize: PARAGRAPH_SIZE,
    lineHeight: PARAGRAPH_SIZE * PARAGRAPH_LINE_HEIGHT,
  },
  message: {
    gap: spacing.entreTarjetas,
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    minHeight: ROW_MIN_HEIGHT,
    paddingVertical: ROW_PADDING_VERTICAL,
    paddingHorizontal: spacing.tarjetaPadding,
    // Under every row, the last one included, as the mockup draws it.
    borderBottomWidth: 1,
    borderBottomColor: colors.separador,
  },
  rowTexts: {
    flex: 1,
    gap: ROW_TEXTS_GAP,
  },
  rowName: {
    lineHeight: ROW_NAME_LINE_HEIGHT,
  },
  rowDetail: {
    lineHeight: ROW_DETAIL_LINE_HEIGHT,
  },
  radio: {
    width: RADIO_SIZE,
    height: RADIO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIO_SIZE / 2,
  },
  radioChecked: {
    backgroundColor: colors.azulMarca,
  },
  radioUnchecked: {
    borderWidth: RADIO_BORDER_WIDTH,
    borderColor: colors.radioInactivo,
  },
  footer: {
    paddingTop: spacing.entreTarjetas,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: PADDING_BOTTOM,
  },
  saveError: {
    marginBottom: spacing.entreTarjetas,
    textAlign: 'center',
  },
});
