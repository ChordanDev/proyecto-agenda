import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { accesibilidad, colors, fonts, radius, spacing } from '@/shared/theme';
import { AppText, BackButton, Button, ScreenBackground, TextField } from '@/shared/ui';

import { useSignOut } from '../datos/useLeaveSesion';
import { useChoosePassword, useSendCode, useVerifyCode } from '../datos/usePasswordRecovery';
import {
  normalizeCode,
  validateCode,
  validateEmail,
  validatePassword,
  type PasswordRecoveryStep,
} from '../dominio/passwordRecovery';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/02b-elegir-contrasena.html.
const HEADER_PADDING_TOP = 22; // line 18
const CONTENT_PADDING_TOP = 28; // line 23
const CONTENT_PADDING_BOTTOM = 32;
const CONTENT_GAP = 16;
const TEXTS_GAP = 6; // line 24
const TEXTS_PADDING_HORIZONTAL = 4;
const STEP_SIZE = 15; // line 25
const INTRO_SIZE = 17; // line 27
const INTRO_LINE_HEIGHT = 1.45;
const FORM_GAP = 14; // line 30
const FORM_PADDING_VERTICAL = 20;
const HINT_SIZE = 15; // line 37
const HINT_LINE_HEIGHT = 1.45;
const CODE_LABEL_GAP = 8; // line 42
const CODE_BOX_WIDTH = 46; // line 46
const CODE_BOX_HEIGHT = 58;
const CODE_DIGIT_SIZE = 24;
const CODE_FOCUS_BORDER = 2; // line 113
const LINK_SIZE = 16; // line 50
const SHOW_BUTTON_PADDING = 12; // line 60
const SHOW_BUTTON_SIZE = 15;
const SUBMIT_MARGIN_TOP = 4; // line 70
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

const CODE_LENGTH = 6;

const STEPS = {
  email: {
    number: 1,
    title: 'Elegir mi contraseña',
    intro: () =>
      'Sirve para la primera vez y si olvidaste tu contraseña. Te mandamos un código por correo.',
    submit: 'Enviar código',
  },
  code: {
    number: 2,
    title: 'Ingresá el código',
    intro: (email: string) =>
      `Si ${email} está registrado, te llega un código de 6 dígitos. Puede tardar unos minutos: revisá también el correo no deseado.`,
    submit: 'Continuar',
  },
  password: {
    number: 3,
    title: 'Elegí tu contraseña',
    intro: () => 'Con esta contraseña vas a ingresar de ahora en adelante.',
    submit: 'Guardar e ingresar',
  },
} as const satisfies Record<PasswordRecoveryStep, unknown>;

/**
 * "Es mi primera vez u olvidé mi contraseña": the email, the 6-digit code sent
 * there and the new password, one step at a time. Nobody hands out a temporary
 * password: the code is the proof that the email is the usuario's.
 */
export function PasswordRecoveryScreen() {
  const router = useRouter();
  const sendCode = useSendCode();
  const verifyCode = useVerifyCode();
  const choosePassword = useChoosePassword();
  const signOut = useSignOut();
  const [step, setStep] = useState<PasswordRecoveryStep>('email');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordShown, setPasswordShown] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const mutations = { email: sendCode, code: verifyCode, password: choosePassword };
  const current = mutations[step];
  // On the code, asking for it again can fail too.
  const serviceError = current.error ?? (step === 'code' ? sendCode.error : null);
  const error = fieldError ?? serviceError?.message ?? null;
  const busy =
    current.isPending || sendCode.isPending || signOut.isPending || choosePassword.isSuccess;

  const clearErrors = () => {
    setFieldError(null);
    sendCode.reset();
    verifyCode.reset();
    choosePassword.reset();
  };

  const goToStep = (next: PasswordRecoveryStep) => {
    clearErrors();
    setResent(false);
    setStep(next);
  };

  const goToCalendario = () => {
    // The calendar is left as the only screen of the stack, so going back from
    // it never returns here nor to the Login.
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/calendario');
  };

  // Back goes one step back. From the password, the code already signed the
  // usuario in: going back signs out, so a flow left halfway leaves no session.
  const goBack = () => {
    if (busy) {
      return true;
    }
    if (step === 'password') {
      signOut.mutate(undefined, { onSettled: () => goToStep('email') });
    } else if (step === 'code') {
      setCode('');
      goToStep('email');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
    return true;
  };

  // Android's back button follows the same rule.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => goBack());
      return () => subscription.remove();
      // goBack is rebuilt on every render and only reads the values listed here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [busy, step, router]),
  );

  const submit = () => {
    if (busy) {
      return;
    }
    clearErrors();
    setResent(false);

    if (step === 'email') {
      const checked = validateEmail(email);
      if (!checked.ok) {
        setFieldError(checked.message);
        return;
      }
      sendCode.mutate(checked.value, {
        onSuccess: () => {
          setSentTo(checked.value);
          setCode('');
          setStep('code');
        },
      });
    } else if (step === 'code') {
      const checked = validateCode(code);
      if (!checked.ok) {
        setFieldError(checked.message);
        return;
      }
      verifyCode.mutate(
        { email: sentTo, code: checked.value },
        { onSuccess: () => goToStep('password') },
      );
    } else {
      const checked = validatePassword(password);
      if (!checked.ok) {
        setFieldError(checked.message);
        return;
      }
      choosePassword.mutate(checked.value, { onSuccess: goToCalendario });
    }
  };

  const resend = () => {
    if (busy) {
      return;
    }
    clearErrors();
    setResent(false);
    sendCode.mutate(sentTo, {
      onSuccess: () => {
        setCode('');
        setResent(true);
      },
    });
  };

  const texts = STEPS[step];

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <BackButton onPress={goBack} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.texts}>
          <AppText weight="bold" color="azulMarca" style={styles.stepNumber}>
            Paso {texts.number} de 3
          </AppText>
          <AppText variant="tituloPantalla" accessibilityRole="header">
            {texts.title}
          </AppText>
          <AppText color="textoSecundario" style={styles.intro}>
            {texts.intro(sentTo)}
          </AppText>
        </View>

        <View style={styles.form}>
          {step === 'email' && (
            <>
              <TextField
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setFieldError(null);
                  setEmail(text);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={submit}
              />
              <AppText color="textoSecundario" style={styles.hint}>
                Usá el correo que le diste a tu iglesia o a la asociación.
              </AppText>
            </>
          )}

          {step === 'code' && (
            <>
              <CodeField
                value={code}
                onChange={(text) => {
                  setFieldError(null);
                  setCode(normalizeCode(text));
                }}
                onSubmit={submit}
              />
              <Pressable
                accessibilityRole="button"
                onPress={resend}
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              >
                <AppText weight="bold" color="azulOscuro" style={styles.linkLabel}>
                  No me llegó, mandarlo de nuevo
                </AppText>
              </Pressable>
              {/* A state the mockup does not draw. */}
              {resent && (
                <AppText color="textoSecundario" style={styles.hint}>
                  Te mandamos un código nuevo. El anterior ya no sirve.
                </AppText>
              )}
            </>
          )}

          {step === 'password' && (
            <>
              <TextField
                label="Contraseña nueva"
                value={password}
                onChangeText={(text) => {
                  setFieldError(null);
                  setPassword(text);
                }}
                secureTextEntry={!passwordShown}
                autoCapitalize="none"
                autoComplete="new-password"
                autoCorrect={false}
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={submit}
                trailing={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={passwordShown ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    onPress={() => setPasswordShown((shown) => !shown)}
                    style={({ pressed }) => [styles.showButton, pressed && styles.pressed]}
                  >
                    <AppText color="azulOscuro" weight="bold" style={styles.showButtonLabel}>
                      {passwordShown ? 'Ocultar' : 'Mostrar'}
                    </AppText>
                  </Pressable>
                }
              />
              <AppText color="textoSecundario" style={styles.hint}>
                Al menos 8 caracteres. No hace falta usar mayúsculas ni símbolos.
              </AppText>
            </>
          )}

          {/* Always there, so that a screen reader says the error when it shows up. */}
          <View accessibilityLiveRegion="polite">
            {error !== null && (
              <AppText
                color="peligro"
                weight="semibold"
                accessibilityRole="alert"
                style={styles.hint}
              >
                {error}
              </AppText>
            )}
          </View>

          <Button label={texts.submit} disabled={busy} onPress={submit} style={styles.submit} />
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

type CodeFieldProps = {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
};

/**
 * The code as six boxes, one per digit (line 44). A single input behind them
 * takes what is typed, pasted or filled in by the keyboard from the email.
 */
function CodeField({ value, onChange, onSubmit }: CodeFieldProps) {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: HEADER_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
  },
  content: {
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  texts: {
    gap: TEXTS_GAP,
    paddingHorizontal: TEXTS_PADDING_HORIZONTAL,
  },
  stepNumber: {
    fontSize: STEP_SIZE,
  },
  intro: {
    fontSize: INTRO_SIZE,
    lineHeight: INTRO_SIZE * INTRO_LINE_HEIGHT,
  },
  form: {
    gap: FORM_GAP,
    paddingVertical: FORM_PADDING_VERTICAL,
    paddingHorizontal: spacing.tarjetaPadding,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  hint: {
    fontSize: HINT_SIZE,
    lineHeight: HINT_SIZE * HINT_LINE_HEIGHT,
  },
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
  link: {
    alignSelf: 'center',
    minHeight: accesibilidad.alturaMinTactil,
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: LINK_SIZE,
    textDecorationLine: 'underline',
  },
  showButton: {
    minHeight: accesibilidad.alturaMinTactil,
    justifyContent: 'center',
    paddingHorizontal: SHOW_BUTTON_PADDING,
  },
  showButtonLabel: {
    fontSize: SHOW_BUTTON_SIZE,
  },
  submit: {
    marginTop: SUBMIT_MARGIN_TOP,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
