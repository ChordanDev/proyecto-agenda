# Diseño de la app

Diseño aprobado de "Agenda de iglesia". Es la referencia visual para implementar la app en React Native.

## Qué hay acá
- `pantallas/` — una página HTML por pantalla (mockups de 390 px de ancho). Son **especificación**, no código para reutilizar: tomar de ahí colores, tamaños, espaciados, textos y estructura, y traducirlos a componentes RN.
  - Están en un formato propio del editor de diseño (`<x-dc>`, `{{ variables }}`, `<sc-if>`, `<sc-for>`). Los datos de ejemplo y la lógica de cada pantalla están en el `<script>` del final.
  - `04b-calendario-pastor.html` reutiliza `04a-calendario.html` con `rol="pastor"`: es la misma pantalla con filtro por iglesia, botón "Nuevo evento" y la pestaña Gestión.
- `capturas/` — PNG de cada pantalla (exportar desde el lienzo de diseño: Share › Export).
  - `6b · Crear evento (dueño).png` es la hoja que se abre al tocar "Dueño" en Crear evento: los niveles que abarcan los cargos de quien carga, agrupados en Asociación, Distrito e Iglesias.
  - Las capturas de Crear evento salen de un render a 2x (780 px de ancho), porque `support.js` del editor no está en el repositorio.
- Lo que es de la v2 queda en el HTML, apagado y marcado con un comentario `v2`: por ejemplo, "Compartir con otras iglesias" en Crear evento. No se implementa en la v1.
- `logo-iglesia.svg` — logo vectorizado, sin color fijo (`currentColor`). Es una aproximación calcada; reemplazar por el SVG oficial cuando esté disponible.
- `theme.ts` — tokens del tema (colores, degradado, categorías con forma y color, tipografías, radios, tamaños mínimos). Usar siempre estos valores. La app los importa desde `src/shared/theme.ts`, que reexporta este archivo.

## Librerías que hacen falta en RN
- Degradado de fondo: `expo-linear-gradient`
- Logo y formas de las categorías (triángulo, "D", rombo): `react-native-svg`
- Tipografías: `@expo-google-fonts/noto-sans` (y `@expo-google-fonts/oswald` para los lemas de la bienvenida)

## Reglas de estilo
- Fondo con degradado azul en todas las pantallas, salvo el Chat (fondo claro liso).
- Contenido en tarjetas blancas redondeadas; barra de navegación inferior azul oscura con texto blanco.
- Cada categoría se reconoce por **forma + color**, nunca solo por color.
- Textos grandes y botones de al menos 44 px de alto: hay usuarios mayores.
