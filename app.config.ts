import type { ConfigContext, ExpoConfig } from 'expo/config';

// The rest of the config is in app.json. This file only adds what cannot be
// versioned: the key of Google Maps that the map of "Nueva iglesia" and
// "Editar iglesia" needs on Android (iOS uses Apple Maps, without a key). It is
// an environment variable of EAS for the builds, and of .env.local for a
// local development build.
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleMapsApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY;

  // Without the key, Google Maps closes the app when the map opens: an Android
  // build of EAS without it stops here instead of shipping that.
  if (process.env.EAS_BUILD_PLATFORM === 'android' && !androidGoogleMapsApiKey) {
    throw new Error(
      'GOOGLE_MAPS_ANDROID_API_KEY is missing: add it as an environment variable of the EAS project.',
    );
  }

  return {
    ...(config as ExpoConfig),
    plugins: [...(config.plugins ?? []), ['react-native-maps', { androidGoogleMapsApiKey }]],
  };
};
