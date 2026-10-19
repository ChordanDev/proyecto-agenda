import type { ConfigContext, ExpoConfig } from 'expo/config';

// The rest of the config is in app.json. This file only adds what cannot be
// versioned: the key of Google Maps that the map of "Nueva iglesia" and
// "Editar iglesia" needs on Android (iOS uses Apple Maps, without a key). It is
// an environment variable of EAS for the builds, and of .env.local for a
// local development build.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }],
  ],
});
