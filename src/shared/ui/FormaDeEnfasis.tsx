import { View } from 'react-native';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

import { categorias, type Forma } from '@/shared/theme';

/** Key of a theme category: one of the four énfasis, or `R` for the actividad regular. */
export type Categoria = keyof typeof categorias;

// Shape sizes of the approved mockups for a reference height of 20
// (diseno/pantallas/06-crear-evento.html, lines 58-62). `size` scales them.
const REFERENCE_SIZE = 20;
const TRIANGLE_WIDTH = 22;
const D_WIDTH = 13;
const SQUARE_SIDE = 18;
const SQUARE_CORNER_RADIUS = 2;
const RHOMBUS_SIDE = 15;

// The yellow needs a subtle inner border to show on white (note in the theme).
const BORDER_COLOR = 'rgba(0,0,0,0.15)';
const BORDER_WIDTH = 1;

type Box = { width: number; height: number };

function getBox(forma: Forma, size: number): Box {
  const scale = size / REFERENCE_SIZE;
  switch (forma) {
    case 'circulo':
      return { width: size, height: size };
    case 'triangulo':
      return { width: TRIANGLE_WIDTH * scale, height: size };
    case 'd':
      return { width: D_WIDTH * scale, height: size };
    case 'cuadrado':
      return { width: SQUARE_SIDE * scale, height: SQUARE_SIDE * scale };
    case 'rombo': {
      // A square rotated 45°: the box is its diagonal.
      const diagonal = RHOMBUS_SIDE * scale * Math.SQRT2;
      return { width: diagonal, height: diagonal };
    }
  }
}

function renderForma(forma: Forma, { width, height }: Box, color: string) {
  switch (forma) {
    case 'circulo':
      return <Circle cx={width / 2} cy={height / 2} r={height / 2} fill={color} />;
    case 'triangulo':
      return <Polygon points={`${width / 2},0 ${width},${height} 0,${height}`} fill={color} />;
    case 'd': {
      // A rectangle whose right side is a semicircle. The outline is drawn half
      // a border inside the box, so the stroke stays within it.
      const inset = BORDER_WIDTH / 2;
      const centerX = width - height / 2;
      const r = height / 2 - inset;
      return (
        <Path
          d={`M${inset},${inset} H${centerX} A${r},${r} 0 0 1 ${centerX},${height - inset} H${inset} Z`}
          fill={color}
          stroke={BORDER_COLOR}
          strokeWidth={BORDER_WIDTH}
        />
      );
    }
    case 'cuadrado':
      return (
        <Rect
          width={width}
          height={height}
          rx={(SQUARE_CORNER_RADIUS / SQUARE_SIDE) * width}
          fill={color}
        />
      );
    case 'rombo':
      return (
        <Polygon
          points={`${width / 2},0 ${width},${height / 2} ${width / 2},${height} 0,${height / 2}`}
          fill={color}
        />
      );
  }
}

type FormaDeEnfasisProps = {
  categoria: Categoria;
  /** Height of the shape, in points. The square and the rombo are sized in proportion. */
  size?: number;
};

/**
 * The mark of an énfasis, or the grey rombo of the actividad regular: shape and
 * color together, so it is never recognised by color alone. Screen readers get
 * the name instead.
 */
export function FormaDeEnfasis({ categoria, size = REFERENCE_SIZE }: FormaDeEnfasisProps) {
  const { forma, color, lema, nombre } = categorias[categoria];
  const box = getBox(forma, size);
  // The actividad regular carries its name in `lema`; `nombre` holds examples.
  const label = categoria === 'R' ? lema : nombre;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={box.width} height={box.height} viewBox={`0 0 ${box.width} ${box.height}`}>
        {renderForma(forma, box, color)}
      </Svg>
    </View>
  );
}
