import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { accesibilidad, colors, radius, spacing } from '@/shared/theme';
import { AppText, BackButton, Button, Logo, ScreenBackground, TextField } from '@/shared/ui';

import { useSignIn } from '../datos/useSignIn';
import { validateCredentials } from '../dominio/signInErrors';

// Layout of the approved mockup, which the theme has no tokens for. The line
// numbers are those of diseno/pantallas/02-login.html before #126.
const HEADER_PADDING_TOP = 22; // line 18
const LOGO_BOX_SIZE = 52; // line 21
const CONTENT_PADDING_TOP = 34; // line 25
const CONTENT_PADDING_BOTTOM = 32;
const CONTENT_GAP = 16;
const TEXTS_GAP = 6; // line 26
const TEXTS_PADDING_HORIZONTAL = 4;
const INTRO_SIZE = 17; // line 28
const INTRO_LINE_HEIGHT = 1.45;
const FORM_GAP = 18; // line 31
const FORM_PADDING_VERTICAL = 20;
const SHOW_BUTTON_PADDING = 12; // line 40
const SHOW_BUTTON_SIZE = 15;
const MEMBER_CARD_GAP = 12; // line 49
const MEMBER_TEXTS_GAP = 2; // line 50
const MEMBER_TITLE_SIZE = 16;
const MEMBER_DETAIL_SIZE = 15; // line 52
const MEMBER_DETAIL_LINE_HEIGHT = 1.4;
const MEMBER_BUTTON_HEIGHT = 46; // line 54
const MEMBER_BUTTON_PADDING = 14;
const ERROR_SIZE = 16;
const RECOVERY_LINK_HEIGHT = 48; // line 45
const RECOVERY_LINK_MARGIN_TOP = -6;
const RECOVERY_LINK_SIZE = 16;
// The mockups draw no pressed state; the same value as `Button`.
const PRESSED_OPACITY = 0.85;

/**
 * Out of the app since #126: the sign-in is only with a code by email (see
 * LoginScreen), with no password. This screen is kept, with no route to it, in
 * case the password comes back; so is its link to /choose-password, a route
 * removed by #126 too.
 *
 * Sign-in of encargados, pastores and admins with email and password. It takes
 * them to the calendar of everything their cargos cover.
 */
export function PasswordLoginScreen() {
  const router = useRouter();
  const signIn = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordShown, setPasswordShown] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const error = fieldsError ?? (signIn.isError ? signIn.error.message : null);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/bienvenida');
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

  const submit = () => {
    const credentials = validateCredentials({ email, password });

    if (!credentials.ok) {
      setFieldsError(credentials.message);
      return;
    }

    setFieldsError(null);
    signIn.mutate(credentials, { onSuccess: goToCalendario });
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
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.texts}>
          <AppText variant="tituloPantalla" accessibilityRole="header">
            Ingresar
          </AppText>
          <AppText color="textoSecundario" style={styles.intro}>
            Para encargados de calendario, pastores y administradores de la asociación.
          </AppText>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            returnKeyType="next"
          />
          <TextField
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!passwordShown}
            autoCapitalize="none"
            autoComplete="current-password"
            autoCorrect={false}
            textContentType="password"
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

          {/* Always there, so that a screen reader says the error when it shows up. */}
          <View accessibilityLiveRegion="polite">
            {error !== null && (
              <AppText color="peligro" weight="semibold" style={styles.error}>
                {error}
              </AppText>
            )}
          </View>

          <Button label="Ingresar" disabled={signIn.isPending} onPress={submit} />

          {/* First access and password recovery share one flow. */}
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/choose-password')}
            style={({ pressed }) => [styles.recoveryLink, pressed && styles.pressed]}
          >
            <AppText color="azulOscuro" weight="bold" style={styles.recoveryLinkLabel}>
              Es mi primera vez u olvidé mi contraseña
            </AppText>
          </Pressable>
        </View>

        <View style={styles.spacer} />

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
  showButton: {
    minHeight: accesibilidad.alturaMinTactil,
    justifyContent: 'center',
    paddingHorizontal: SHOW_BUTTON_PADDING,
  },
  showButtonLabel: {
    fontSize: SHOW_BUTTON_SIZE,
  },
  error: {
    fontSize: ERROR_SIZE,
  },
  recoveryLink: {
    minHeight: RECOVERY_LINK_HEIGHT,
    marginTop: RECOVERY_LINK_MARGIN_TOP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryLinkLabel: {
    fontSize: RECOVERY_LINK_SIZE,
    textAlign: 'center',
    textDecorationLine: 'underline',
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
