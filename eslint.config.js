// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

// Layering rule: a component never calls Supabase. Screens, components and
// routes ask for data through the `datos` layer of their feature.
const supabaseImports = {
  paths: [
    {
      name: '@supabase/supabase-js',
      message: 'A component never calls Supabase. Use the `datos` layer of the feature.',
    },
  ],
  patterns: [
    {
      group: ['@/shared/supabase', '**/shared/supabase'],
      message: 'A component never calls Supabase. Use the `datos` layer of the feature.',
    },
  ],
};

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: [
      'dist/*',
      '.expo/*',
      'ios/*',
      'android/*',
      'coverage/*',
      'diseno/*',
      'src/shared/database.types.ts',
    ],
  },
  {
    files: ['src/features/*/interfaz/**', 'src/app/**'],
    rules: {
      'no-restricted-imports': ['error', supabaseImports],
    },
  },
  {
    // Domain rules are pure TypeScript: no React, no React Native, no Supabase.
    files: ['src/features/*/dominio/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...supabaseImports.paths, 'react', 'react-native'],
          patterns: [
            ...supabaseImports.patterns,
            {
              group: ['expo', 'expo-*', '@tanstack/*'],
              message: 'Domain rules are pure TypeScript.',
            },
          ],
        },
      ],
    },
  },
]);
