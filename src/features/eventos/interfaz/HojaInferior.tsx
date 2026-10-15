import { useEffect, useRef, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

// The sheet of the approved mockups: the filter of 04a-calendario.html (lines
// 137-141) and the duenio of capture 6b.
const SCRIM_COLOR = 'rgba(15,27,42,0.45)';
const SHEET_PADDING_TOP = 12;
const SHEET_PADDING_HORIZONTAL = 20;
const SHEET_PADDING_BOTTOM = 28;
const SHEET_GAP = 6;
// The sheet never covers the whole screen: the dark area above closes it.
const SHEET_MAX_HEIGHT = '85%';
const HANDLE_WIDTH = 44;
const HANDLE_HEIGHT = 5;
const HANDLE_COLOR = '#D5D9DF';
const HANDLE_MARGIN_BOTTOM = 8;
const TITLE_ROW_GAP = 12;
const TITLE_SIZE = 22;
const CLOSE_SIZE = 44; // capture 6b
const CLOSE_ICON_SIZE = 22;
const CLOSE_STROKE_WIDTH = 2.4;
const INTRO_SIZE = 16;
const INTRO_LINE_HEIGHT = 1.4;
const INTRO_MARGIN_BOTTOM = 8;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

type HojaInferiorProps = {
  visible: boolean;
  title: string;
  intro?: string;
  /**
   * Keeps the end of the content in view, also when the keyboard makes the
   * sheet smaller: a field and its button at the end stay above the keyboard.
   */
  scrollToEnd?: boolean;
  onClose: () => void;
  children: ReactNode;
};

/** A sheet that rises from the bottom over a dark scrim, with a title and a close button. */
export function HojaInferior({
  visible,
  title,
  intro,
  scrollToEnd = false,
  onClose,
  children,
}: HojaInferiorProps) {
  const scrollRef = useRef<ScrollView>(null);
  const keepEndInView = () => {
    if (scrollToEnd) scrollRef.current?.scrollToEnd({ animated: true });
  };

  // The keyboard shrinks the sheet after the content was laid out: scroll again
  // once it is up.
  useEffect(() => {
    if (!scrollToEnd) return;
    const subscription = Keyboard.addListener('keyboardDidShow', () =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
    return () => subscription.remove();
  }, [scrollToEnd]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* A field in the sheet ("+ Agregar lugar") rises above the keyboard. */}
      <KeyboardAvoidingView
        style={styles.scrim}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Tapping the dark area closes the sheet, as the back button does. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <AppText variant="tituloEncabezado" accessibilityRole="header" style={styles.title}>
              {title}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Svg width={CLOSE_ICON_SIZE} height={CLOSE_ICON_SIZE} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M6 6l12 12M18 6L6 18"
                  stroke={colors.azulOscuro}
                  strokeWidth={CLOSE_STROKE_WIDTH}
                  strokeLinecap="round"
                />
              </Svg>
            </Pressable>
          </View>
          {intro !== undefined && (
            <AppText color="textoSecundario" style={styles.intro}>
              {intro}
            </AppText>
          )}
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={keepEndInView}
            onLayout={keepEndInView}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: SCRIM_COLOR,
  },
  sheet: {
    maxHeight: SHEET_MAX_HEIGHT,
    gap: SHEET_GAP,
    paddingTop: SHEET_PADDING_TOP,
    paddingHorizontal: SHEET_PADDING_HORIZONTAL,
    paddingBottom: SHEET_PADDING_BOTTOM,
    borderTopLeftRadius: radius.hoja,
    borderTopRightRadius: radius.hoja,
    backgroundColor: colors.superficie,
  },
  handle: {
    alignSelf: 'center',
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    marginBottom: HANDLE_MARGIN_BOTTOM,
    borderRadius: radius.pastilla,
    backgroundColor: HANDLE_COLOR,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: TITLE_ROW_GAP,
  },
  title: {
    flexShrink: 1,
    fontSize: TITLE_SIZE,
  },
  close: {
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pastilla,
    backgroundColor: colors.campo,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
  intro: {
    marginBottom: INTRO_MARGIN_BOTTOM,
    fontSize: INTRO_SIZE,
    lineHeight: INTRO_SIZE * INTRO_LINE_HEIGHT,
  },
});
