import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { accesibilidad, colors, radius, spacing } from '@/shared/theme';
import { AppText, BackButton, Button, Logo, ScreenBackground, TextField } from '@/shared/ui';

import { useSendSignInCode, useVerifySignInCode } from '../datos/useCodeSignIn';
import {
  normalizeCode,
  validateCode,
  validateEmail,
  type CodeSignInStep,
} from '../dominio/codeSignIn';
import { CodeField } from './CodeField';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/02-login.html.
const HEADER_PADDING_TOP = 22; // line 18
const LOGO_BOX_SIZE = 52; // line 21
const CONTENT_PADDING_TOP = 34; // line 25
const CONTENT_PADDING_BOTTOM = 32;
const CONTENT_GAP = 16;
const TEXTS_GAP = 6; // line 26
const TEXTS_PADDING_HORIZONTAL = 4;
const INTRO_SIZE = 17; // line 28
const INTRO_LINE_HEIGHT = 1.45;
const FORM_GAP = 14; // line 33
const FORM_PADDING_VERTICAL = 20;
const HINT_SIZE = 15; // line 40
const HINT_LINE_HEIGHT = 1.45;
const LINK_SIZE = 16; // line 53
const SUBMIT_MARGIN_TOP = 4; // line 60
const MEMBER_CARD_GAP = 12; // line 67
const MEMBER_TEXTS_GAP = 2;
const MEMBER_TITLE_SIZE = 16;
const MEMBER_DETAIL_SIZE = 15;
const MEMBER_DETAIL_LINE_HEIGHT = 1.4;
const MEMBER_BUTTON_HEIGHT = 46; // line 72
const MEMBER_BUTTON_PADDING = 14;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

const STEPS = {
  email: {
    title: 'Ingresar',
    intro: () =>
      'Para encargados de calendario, pastores y administradores de la asociación. Te mandamos un código por correo, sin contraseña.',
    submit: 'Enviar código',
  },
  code: {
    title: 'Ingresá el código',
    intro: (email: string) =>
      `Si ${email} está registrado, te llega un código de 6 dígitos. Puede tardar unos minutos: revisá también el correo no deseado.`,
    submit: 'Ingresar',
  },
} as const satisfies Record<CodeSignInStep, unknown>;

/**
 * Sign-in of encargados, pastores and admins with a 6-digit code sent to their
 * email, with no password (#126): the email, then the code. The first access
 * and every later one are the same path. A right code takes them to the
 * calendar of everything their cargos cover.
 */
export function LoginScreen() {
  const router = useRouter();
  const sendCode = useSendSignInCode();
  const verifyCode = useVerifySignInCode();
  const [step, setStep] = useState<CodeSignInStep>('email');
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const current = step === 'email' ? sendCode : verifyCode;
  // On the code, asking for it again can fail too.
  const serviceError = current.error ?? (step === 'code' ? sendCode.error : null);
  const error = fieldError ?? serviceError?.message ?? null;
  // A right code keeps the screen busy until the calendar replaces it.
  const busy = sendCode.isPending || verifyCode.isPending || verifyCode.isSuccess;

  const clearErrors = () => {
    setFieldError(null);
    sendCode.reset();
    verifyCode.reset();
  };

  // An error describes the attempt made; it goes away with any new input. Only
  // a failed request is reset: one still running must keep its callbacks.
  const clearShownError = () => {
    setFieldError(null);
    for (const mutation of [sendCode, verifyCode]) {
      if (mutation.isError) {
        mutation.reset();
      }
    }
  };

  const goToCalendario = () => {
    // The calendar is left as the only screen of the stack, so going back from
    // it never returns here nor to the Bienvenida.
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace('/calendario');
  };

  // From the code, back goes to the email; from the email, out of the screen.
  const goBack = () => {
    if (busy) {
      return true;
    }
    if (step === 'code') {
      clearErrors();
      setResent(false);
      setCode('');
      setStep('email');
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/bienvenida');
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
    } else {
      const checked = validateCode(code);
      if (!checked.ok) {
        setFieldError(checked.message);
        return;
      }
      verifyCode.mutate({ email: sentTo, code: checked.value }, { onSuccess: goToCalendario });
    }
  };

  // A new code makes the one before useless.
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
        <View style={styles.logoBox}>
          <Logo />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.texts}>
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
                  clearShownError();
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
                  clearShownError();
                  const next = normalizeCode(text);
                  setCode(next);
                  // The number pad has no return key and covers "Ingresar":
                  // with the six digits in, it steps aside.
                  if (validateCode(next).ok) {
                    Keyboard.dismiss();
                  }
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

        <View style={styles.spacer} />

        {/* Only on the email: on the code, the person already said they have a cargo. */}
        {step === 'email' && (
          <View style={styles.memberCard}>
            <View style={styles.memberTexts}>
              <AppText weight="bold" style={styles.memberTitle}>
                ¿Sos miembro de iglesia?
              </AppText>
              <AppText color="textoSecundario" style={styles.memberDetail}>
                No necesitás cuenta para ver el calendario.
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/choose-iglesia')}
              style={({ pressed }) => [styles.memberButton, pressed && styles.pressed]}
            >
              <AppText color="azulOscuro" weight="bold" style={styles.memberButtonLabel}>
                Elegir iglesia
              </AppText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
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
    flexGrow: 1,
    gap: CONTENT_GAP,
    paddingTop: CONTENT_PADDING_TOP,
    paddingHorizontal: spacing.pantallaHorizontal,
    paddingBottom: CONTENT_PADDING_BOTTOM,
  },
  texts: {
    gap: TEXTS_GAP,
    paddingHorizontal: TEXTS_PADDING_HORIZONTAL,
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
  link: {
    alignSelf: 'center',
    minHeight: accesibilidad.alturaMinTactil,
    justifyContent: 'center',
  },
  linkLabel: {
    fontSize: LINK_SIZE,
    textDecorationLine: 'underline',
  },
  submit: {
    marginTop: SUBMIT_MARGIN_TOP,
  },
  spacer: {
    flex: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: MEMBER_CARD_GAP,
    padding: spacing.tarjetaPadding,
    borderRadius: radius.tarjeta,
    backgroundColor: colors.superficie,
  },
  memberTexts: {
    flex: 1,
    minWidth: 0,
    gap: MEMBER_TEXTS_GAP,
  },
  memberTitle: {
    fontSize: MEMBER_TITLE_SIZE,
  },
  memberDetail: {
    fontSize: MEMBER_DETAIL_SIZE,
    lineHeight: MEMBER_DETAIL_SIZE * MEMBER_DETAIL_LINE_HEIGHT,
  },
  memberButton: {
    minHeight: MEMBER_BUTTON_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: MEMBER_BUTTON_PADDING,
    borderRadius: radius.campo,
    backgroundColor: colors.azulSuave,
  },
  memberButtonLabel: {
    fontSize: MEMBER_DETAIL_SIZE,
  },
  pressed: {
    opacity: PRESSED_OPACITY,
  },
});
