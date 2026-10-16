# Diseño de la app

Diseño aprobado de "Agenda de iglesia". Es la referencia visual para implementar la app en React Native.

## Qué hay acá
- `pantallas/` — una página HTML por pantalla (mockups de 390 px de ancho). Son **especificación**, no código para reutilizar: tomar de ahí colores, tamaños, espaciados, textos y estructura, y traducirlos a componentes RN.
  - Están en un formato propio del editor de diseño (`<x-dc>`, `{{ variables }}`, `<sc-if>`, `<sc-for>`). Los datos de ejemplo y la lógica de cada pantalla están en el `<script>` del final.
  - `02-login.html` es el ingreso con un código de 6 dígitos por correo, sin contraseña (#126): una pantalla con dos pasos, `paso` 1 (el correo, captura `2`) y 2 (el código, capturas `2b` y `2c`, esta con el error de un código incorrecto). El primer acceso y el ingreso normal son el mismo camino.
  - `02b-elegir-contrasena.html` es el flujo anterior de primer acceso y recuperación de contraseña. Quedó fuera del recorrido por #126, pero se conserva por si se vuelve a ofrecer la contraseña; sus capturas son las `Sin uso · Elegir contraseña`.
  - `04b-calendario-pastor.html` reutiliza `04a-calendario.html` con `rol="pastor"`: es la misma pantalla con filtro por iglesia, botón "Nuevo evento" y la pestaña Gestión.
- `capturas/` — PNG de cada pantalla (exportar desde el lienzo de diseño: Share › Export).
  - `6b · Crear evento (dueño).png` es la hoja que se abre al tocar "Dueño" en Crear evento: los niveles que abarcan los cargos de quien carga, agrupados en Asociación, Distrito e Iglesias.
  - `6e · Crear evento (hora poco común).png` es el cartel que pregunta por una hora de la madrugada, de 00:00 a 05:59 (#128): "Sí" la deja y "Cambiar" vuelve al campo de la hora. En el HTML, `hora` vale `rara` para este cartel e `imposible` para el error de una hora que no existe (`25:00`).
  - `6f · Crear evento (fecha pasada).png` es el aviso "Esta fecha ya pasó." bajo el campo Fecha, mientras la fecha elegida es anterior a hoy (#132). `6g · Crear evento (fecha pasada, Guardar).png` es el diálogo que aparece al tocar Guardar con esa fecha: "Cargarlo igual" guarda y "Cambiar fecha" vuelve al campo Fecha sin guardar. En el HTML, `fecha` vale `pasada` o `dialogo`.
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
