import type { ColorValue } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// The icons of the bottom navigation, redrawn from the approved mockups
// (04a-calendario.html, lines 173 and 183, 07-chat-ia.html, line 196, and
// 08b-gestion-secretaria.html, line 62): line drawings on a 24 grid.
const VIEW_BOX = '0 0 24 24';
const STROKE_WIDTH = 2;

type TabIconProps = {
  color: ColorValue;
  /** Width and height of the icon, in points. */
  size: number;
};

/** A calendar page with its two rings. */
export function CalendarioIcon({ color, size }: TabIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x={3} y={5} width={18} height={16} rx={2} />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

/** A speech bubble. */
export function ChatIcon({ color, size }: TabIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3.5 21l1.4-4.6A8.5 8.5 0 1 1 21 12z" />
    </Svg>
  );
}

/** Two people. */
export function GestionIcon({ color, size }: TabIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx={9} cy={8} r={3.5} />
      <Path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <Path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.4c2 .8 3.5 2.7 3.5 5.6" />
    </Svg>
  );
}

/** Three sliders. */
export function AjustesIcon({ color, size }: TabIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="none"
      stroke={color}
      strokeWidth={STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
      <Circle cx={15} cy={6} r={2} />
      <Circle cx={9} cy={12} r={2} />
      <Circle cx={17} cy={18} r={2} />
    </Svg>
  );
}
