import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Keyboard,
  Linking,
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
import { useUbicacion, type Ubicacion } from '../datos/useUbicacion';
import { buscarIglesias, type Iglesia } from '../dominio/buscarIglesias';
import { getCiudadYProvincia } from '../dominio/ciudadYProvincia';
import { distanciaEnMetros, formatDistancia, type Punto } from '../dominio/distancia';
import { estadoSinIglesias } from '../dominio/estadoSinIglesias';
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
// "Usar mi ubicación" (#164), lines 40-74 of the same mockup.
const LOCATION_BUTTON_HEIGHT = 54; // line 40
const LOCATION_BUTTON_BORDER_WIDTH = 2;
const LOCATION_BUTTON_RADIUS = 14;
const LOCATION_BUTTON_LABEL_SIZE = 17;
const LOCATION_BUTTON_GAP = 10;
const LOCATION_ICON_SIZE = 22;
const LOCATION_ICON_STROKE_WIDTH = 2.2;
const ORDER_LINE_HEIGHT = 44; // line 48
const ORDER_LINE_GAP = 8;
const ORDER_LINE_PADDING_HORIZONTAL = 6;
const NOTICE_GAP = 12; // line 52
const NOTICE_PADDING_VERTICAL = 14;
const NOTICE_ICON_BOX_SIZE = 40; // line 53
const NOTICE_TEXTS_GAP = 2; // line 54
const NOTICE_DETAIL_SIZE = 15; // line 56
const NOTICE_DETAIL_LINE_HEIGHT = 1.4;
const NOTICE_BUTTON_MARGIN_TOP = 6; // line 58
const ROW_DISTANCE_GAP = 4; // line 74
const ROW_DISTANCE_ICON_SIZE = 16;
// The mockup draws "Buscando tu ubicación…" at this opacity (line 44); pressed
// is the one of Button, which the mockup does not draw.
const BUSY_OPACITY = 0.6;
const PRESSED_OPACITY = 0.85;

const SAVE_ERROR = 'No se pudo guardar la iglesia. Probá de nuevo.';
const LOCATION_ERROR = 'No pudimos usar tu ubicación.';
const LOCATION_ERROR_DETAIL = 'Podés buscar tu iglesia por nombre.';

/**
 * The hermano looks for their iglesia by its nombre, picks it and confirms it
 * with "Continuar": only then it is stored on the phone as the iglesia elegida.
 * Ajustes opens it with `desde=ajustes` to change the iglesia elegida.
 */
export function ElegirIglesiaScreen() {
  const router = useRouter();
  const fromAjustes = useLocalSearchParams<{ desde?: string }>().desde === 'ajustes';
  const { data: iglesias, fetchStatus, refetch } = useIglesias();
  const elegirIglesia = useElegirIglesia();
  const firstScreen = useFirstScreen();
  const [searchText, setSearchText] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { ubicacion, locate } = useUbicacion();
  const punto = ubicacion.status === 'located' ? ubicacion.punto : undefined;

  const results = buscarIglesias(iglesias ?? [], searchText, punto);
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
    if (fromAjustes) {
      // The tabs are already under this screen: a replace would not reach the
      // tab of the calendario, so it switches to it instead.
      router.navigate('/calendario');
    } else {
      router.replace('/calendario');
    }
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

  const startLocating = () => {
    if (!acceptsChanges) {
      return;
    }
    clearSaveError();
    Keyboard.dismiss();
    void locate();
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
      if (estadoSinIglesias(fetchStatus) === 'cargando') {
        return <Message>Cargando iglesias…</Message>;
      }
      // Offline the query waits for the connection and reads them again by
      // itself when it is back; "Reintentar" is there in the meantime.
      return (
        <Card style={styles.message}>
          <AppText color="textoSecundario" style={styles.paragraph}>
            No se pudieron cargar las iglesias. Revisá la conexión y probá de nuevo.
          </AppText>
          <Button label="Reintentar" variant="secondary" onPress={() => refetch()} />
        </Card>
      );
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
            desde={punto}
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
            {fromAjustes
              ? 'El calendario pasa a mostrar la iglesia que elijas.'
              : 'Queda guardada. Podés cambiarla cuando quieras en Ajustes.'}
          </AppText>
        </View>

        <SearchField
          value={searchText}
          onChangeText={changeSearchText}
          placeholder="Buscar por nombre"
          accessibilityLabel="Buscar por nombre"
        />

        <UbicacionControls ubicacion={ubicacion} onLocate={startLocating} />

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

/** The pin the mockup draws on everything about the ubicación. */
function PinIcon({ size = LOCATION_ICON_SIZE }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"
        stroke={colors.azulOscuro}
        strokeWidth={LOCATION_ICON_STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14.5 9.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0z"
        stroke={colors.azulOscuro}
        strokeWidth={LOCATION_ICON_STROKE_WIDTH}
      />
    </Svg>
  );
}

type UbicacionControlsProps = {
  ubicacion: Ubicacion;
  onLocate: () => void;
};

/**
 * "Usar mi ubicación" under the search field. The permiso is asked only on a
 * tap, never on opening the screen. Without the ubicación the search by nombre
 * works as always.
 */
function UbicacionControls({ ubicacion, onLocate }: UbicacionControlsProps) {
  switch (ubicacion.status) {
    case 'idle':
      return <LocationButton label="Usar mi ubicación" onPress={onLocate} />;
    case 'locating':
      return <LocationButton label="Buscando tu ubicación…" busy onPress={onLocate} />;
    case 'located':
      return (
        <View style={styles.orderLine} accessible accessibilityRole="text">
          <PinIcon />
          <AppText variant="cuerpo" weight="bold" color="azulOscuro">
            De la más cercana a la más lejana
          </AppText>
        </View>
      );
    case 'unavailable':
      return (
        <>
          <LocationNotice />
          <LocationButton label="Usar mi ubicación" onPress={onLocate} />
        </>
      );
    case 'deniedForGood':
      // Tapping "Usar mi ubicación" again would not ask: only the settings can.
      return <LocationNotice withSettings />;
  }
}

type LocationButtonProps = {
  label: string;
  busy?: boolean;
  onPress: () => void;
};

function LocationButton({ label, busy = false, onPress }: LocationButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.locationButton,
        pressed && styles.pressed,
        busy && styles.locationButtonBusy,
      ]}
    >
      {!busy && <PinIcon />}
      <AppText weight="bold" color="azulOscuro" style={styles.locationButtonLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

function LocationNotice({ withSettings = false }: { withSettings?: boolean }) {
  return (
    <View
      style={styles.notice}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${LOCATION_ERROR} ${LOCATION_ERROR_DETAIL}`}
    >
      <View style={styles.noticeIconBox}>
        <Svg width={LOCATION_ICON_SIZE} height={LOCATION_ICON_SIZE} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 3l9.5 17h-19L12 3zM12 10v4.5M12 17.5v.5"
            stroke={colors.aviso}
            strokeWidth={LOCATION_ICON_STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
      <View style={styles.noticeTexts}>
        <AppText weight="bold" style={styles.noticeTitle}>
          {LOCATION_ERROR}
        </AppText>
        <AppText color="textoSecundario" style={styles.noticeDetail}>
          {LOCATION_ERROR_DETAIL}
        </AppText>
        {withSettings && (
          <Button
            label="Abrir ajustes del teléfono"
            variant="secondary"
            onPress={() => void Linking.openSettings()}
            style={styles.noticeButton}
          />
        )}
      </View>
    </View>
  );
}

type IglesiaRowProps = {
  iglesia: Iglesia;
  checked: boolean;
  /** The ubicación the list is ordered from, if any. */
  desde: Punto | undefined;
  onPress: () => void;
};

function IglesiaRow({ iglesia, checked, desde, onPress }: IglesiaRowProps) {
  const { nombre, distrito, coordenadas } = iglesia;
  const ciudadYProvincia = getCiudadYProvincia(iglesia);
  // A church without coordenadas shows no distance.
  const distancia =
    desde && coordenadas ? formatDistancia(distanciaEnMetros(desde, coordenadas)) : undefined;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={[nombre, distrito, ciudadYProvincia, distancia]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowTexts}>
        <AppText variant="cuerpoGrande" weight="bold" style={styles.rowName}>
          {nombre}
        </AppText>
        <AppText variant="secundario" style={styles.rowDetail}>
          {distrito} · {ciudadYProvincia}
        </AppText>
        {distancia !== undefined && (
          <View style={styles.rowDistance}>
            <PinIcon size={ROW_DISTANCE_ICON_SIZE} />
            <AppText variant="secundario" weight="bold" color="azulOscuro" style={styles.rowDetail}>
              {distancia}
            </AppText>
          </View>
        )}
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
  rowDistance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_DISTANCE_GAP,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: LOCATION_BUTTON_GAP,
    minHeight: LOCATION_BUTTON_HEIGHT,
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: LOCATION_BUTTON_RADIUS,
    borderWidth: LOCATION_BUTTON_BORDER_WIDTH,
    borderColor: colors.azulOscuro,
    backgroundColor: colors.superficie,
  },
  locationButtonBusy: {
    opacity: BUSY_OPACITY,
  },
  locationButtonLabel: {
    fontSize: LOCATION_BUTTON_LABEL_SIZE,
    textAlign: 'center',
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  orderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ORDER_LINE_GAP,
    minHeight: ORDER_LINE_HEIGHT,
    paddingHorizontal: ORDER_LINE_PADDING_HORIZONTAL,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: NOTICE_GAP,
    paddingVertical: NOTICE_PADDING_VERTICAL,
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  noticeIconBox: {
    width: NOTICE_ICON_BOX_SIZE,
    height: NOTICE_ICON_BOX_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: NOTICE_ICON_BOX_SIZE / 2,
    backgroundColor: colors.avisoSuave,
  },
  noticeTexts: {
    flex: 1,
    gap: NOTICE_TEXTS_GAP,
  },
  noticeTitle: {
    fontSize: LOCATION_BUTTON_LABEL_SIZE,
  },
  noticeDetail: {
    fontSize: NOTICE_DETAIL_SIZE,
    lineHeight: NOTICE_DETAIL_SIZE * NOTICE_DETAIL_LINE_HEIGHT,
  },
  noticeButton: {
    alignSelf: 'flex-start',
    marginTop: NOTICE_BUTTON_MARGIN_TOP,
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
