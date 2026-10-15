import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius } from '@/shared/theme';
import { AppText } from '@/shared/ui';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/02-login.html.
const CODE_LABEL_GAP = 8; // line 45
const CODE_BOX_WIDTH = 46; // line 49
const CODE_BOX_HEIGHT = 58;
const CODE_DIGIT_SIZE = 24;
const CODE_FOCUS_BORDER = 2; // line 93

const CODE_LENGTH = 6;

type CodeFieldProps = {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
};

/**
 * The code as six boxes, one per digit (line 45). A single input behind them
 * takes what is typed, pasted or filled in by the keyboard from the email.
 */
export function CodeField({ value, onChange, onSubmit }: CodeFieldProps) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: CODE_LENGTH }, (_, index) => value[index] ?? '');

  return (
    <View style={styles.codeField}>
      <AppText variant="label" importantForAccessibility="no">
        Código
      </AppText>
      <Pressable
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        onPress={() => input.current?.focus()}
        style={styles.codeBoxes}
      >
        {digits.map((digit, index) => (
          <View
            key={index}
            style={[
              styles.codeBox,
              focused && index === Math.min(value.length, CODE_LENGTH - 1) && styles.codeBoxFocused,
            ]}
          >
            <AppText weight="bold" style={styles.codeDigit}>
              {digit}
            </AppText>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={input}
        accessibilityLabel="Código de 6 dígitos"
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmit}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        autoFocus
        caretHidden
        style={styles.codeInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  codeField: {
    gap: CODE_LABEL_GAP,
  },
  codeBoxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeBox: {
    width: CODE_BOX_WIDTH,
    height: CODE_BOX_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.campo,
    backgroundColor: colors.campo,
  },
  codeBoxFocused: {
    borderWidth: CODE_FOCUS_BORDER,
    borderColor: colors.azulMarca,
  },
  codeDigit: {
    fontSize: CODE_DIGIT_SIZE,
    fontFamily: fonts.bold,
  },
  // Out of sight but focusable: the boxes show what it holds.
  codeInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
