import type { ConfigContext, ExpoConfig } from 'expo/config';

import appConfig from './app.config';

const BASE = { name: 'Agenda de iglesia', slug: 'agenda-de-iglesia', plugins: ['expo-router'] };

function configurar(env: Record<string, string | undefined>): ExpoConfig {
  const anterior = { ...process.env };
  Object.assign(process.env, env);
  for (const [nombre, valor] of Object.entries(env)) {
    if (valor === undefined) delete process.env[nombre];
  }
  try {
    return appConfig({ config: BASE } as unknown as ConfigContext);
  } finally {
    process.env = anterior;
  }
}

describe('app.config', () => {
  it('gives the key of Google Maps to the map on Android', () => {
    const config = configurar({
      GOOGLE_MAPS_ANDROID_API_KEY: 'clave',
      EAS_BUILD_PLATFORM: 'android',
    });

    expect(config.plugins).toContainEqual([
      'react-native-maps',
      { androidGoogleMapsApiKey: 'clave' },
    ]);
  });

  it('stops an Android build of EAS without the key', () => {
    expect(() =>
      configurar({ GOOGLE_MAPS_ANDROID_API_KEY: undefined, EAS_BUILD_PLATFORM: 'android' }),
    ).toThrow('GOOGLE_MAPS_ANDROID_API_KEY');
  });

  it('builds for iOS without the key, which uses Apple Maps', () => {
    expect(() =>
      configurar({ GOOGLE_MAPS_ANDROID_API_KEY: undefined, EAS_BUILD_PLATFORM: 'ios' }),
    ).not.toThrow();
  });
});
