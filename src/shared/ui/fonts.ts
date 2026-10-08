import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_600SemiBold } from '@expo-google-fonts/noto-sans/600SemiBold';
import { NotoSans_700Bold } from '@expo-google-fonts/noto-sans/700Bold';
import { Oswald_500Medium } from '@expo-google-fonts/oswald/500Medium';
import { useFonts } from 'expo-font';

import { fonts } from '@/shared/theme';

// Each font file is registered under the family name the theme uses.
const fontFiles = {
  [fonts.regular]: NotoSans_400Regular,
  [fonts.semibold]: NotoSans_600SemiBold,
  [fonts.bold]: NotoSans_700Bold,
  [fonts.lemas]: Oswald_500Medium,
};

/** Loads the fonts of the design. Returns `[loaded, error]`, like `useFonts`. */
export function useDesignFonts() {
  return useFonts(fontFiles);
}
