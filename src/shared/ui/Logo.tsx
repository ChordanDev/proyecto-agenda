import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/shared/theme';

import { LOGO_PATH, LOGO_VIEW_BOX } from './logoPath';

// Height of the logo in the header of the approved mockups (02-login.html, line 22).
const HEADER_HEIGHT = 34;

type LogoProps = {
  /** Height of the logo, in points. The width keeps the proportion of the drawing. */
  height?: number;
  color?: keyof typeof colors;
};

/** The logo of the church, in a single color. Screen readers get its name instead. */
export function Logo({ height = HEADER_HEIGHT, color = 'azulOscuro' }: LogoProps) {
  const width = (height * LOGO_VIEW_BOX.width) / LOGO_VIEW_BOX.height;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Iglesia Adventista del Séptimo Día"
    >
      <Svg
        width={width}
        height={height}
        viewBox={`0 0 ${LOGO_VIEW_BOX.width} ${LOGO_VIEW_BOX.height}`}
      >
        <Path d={LOGO_PATH} fill={colors[color]} fillRule="evenodd" />
      </Svg>
    </View>
  );
}
