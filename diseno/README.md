# Diseño de la app

Diseño aprobado de "Agenda de iglesia". Es la referencia visual para implementar la app en React Native.

## Qué hay acá
- `pantallas/` — una página HTML por pantalla (mockups de 390 px de ancho). Son **especificación**, no código para reutilizar: tomar de ahí colores, tamaños, espaciados, textos y estructura, y traducirlos a componentes RN.
  - Están en un formato propio del editor de diseño (`<x-dc>`, `{{ variables }}`, `<sc-if>`, `<sc-for>`). Los datos de ejemplo y la lógica de cada pantalla están en el `<script>` del final.
  - `02-login.html` es el ingreso con un código de 6 dígitos por correo, sin contraseña (#126): una pantalla con dos pasos, `paso` 1 (el correo, captura `2`) y 2 (el código, capturas `2b` y `2c`, esta con el error de un código incorrecto). El primer acceso y el ingreso normal son el mismo camino.
  - `02b-elegir-contrasena.html` es el flujo anterior de primer acceso y recuperación de contraseña. Quedó fuera del recorrido por #126, pero se conserva por si se vuelve a ofrecer la contraseña; sus capturas son las `Sin uso · Elegir contraseña`.
  - `07-chat-ia.html` es el chat (#144), solo con sesión iniciada. `estado` elige lo que se ve:
    - `conversacion` (captura `7`): una consulta con su respuesta y una tarjeta de vista previa pendiente. Cada respuesta tiene "Reportar respuesta"; "Nueva conversación" aparece arriba cuando hay mensajes.
    - `aviso` (`7b`): el aviso de la primera vez, los mensajes se envían a OpenAI. "Ahora no" lleva a `noAceptado` (`7c`): sin cuadro de texto, con botón al formulario y otro para releer el aviso.
    - `quedan5` (`7d`): "Te quedan 5 consultas por hoy", debajo del cuadro de texto. `limite` (`7e`): el cuadro de texto se reemplaza por el aviso del máximo de hoy, con botón al formulario. `presupuesto` (`7f`): la pestaña sigue visible y avisa hasta cuándo no funciona.
    - `sinConexion` (`7g`): el mensaje no se envió, con "Reintentar". No ofrece el formulario, porque sin conexión tampoco guarda. `caido` (`7h`): el proveedor no responde, con "Reintentar" e "Ir al formulario".
    - `reportando` (`7i`): la hoja de motivos (incorrecta, ofensiva, otro). `reportado` (`7j`): el enlace pasa a "Reporte enviado" y no deja reportar otra vez.
    - `nueva` (`7k`): confirmación de "Nueva conversación", porque la conversación no se guarda.
    - Tarjetas: `serie` (`7l`, repetición con palabras y "Hasta"), `variosDias` (`7m`), `guardado` (`7n`, "Guardado" y "Ver evento") y `errorGuardar` (`7o`, el mensaje del formulario con "Editar" y "Reintentar"). Muestran el dueño y el alcance con las mismas palabras que el detalle del evento.
    - El micrófono es de la v2 #9: queda en el HTML, apagado con `conVoz`, y en su lugar está el botón de enviar.
  - Recordatorios (#161), en `10-ajustes.html`. Son de la v2: la sección está apagada en la v1 y la prende la variable `recordatorios`. El recordatorio se ata al teléfono, no a la persona.
    - `encendido` (captura `10f`): hermano, encargado y secretaria reciben los de su iglesia, encendidos por defecto, con un ejemplo del aviso.
    - `inicio` (`10g`): pastor y admin empiezan sin iglesias y apagados, con "Elegir iglesias". `elegidas` (`10i`): las iglesias elegidas y "Cambiar".
    - `hoja` abre la elección de iglesias: `pastor` (`10h`, las de su distrito) o `admin` (`10j`, todas, con buscador y las elegidas arriba). `rol` (`encargado`, `pastor` o `admin`) cambia la tarjeta Cuenta.
    - `sinPermiso` (`10k`): el teléfono no dio permiso; el interruptor queda gris y se explica cómo darlo, con "Abrir la configuración".
    - `10b-notificacion.html` (`10l`): cómo se ve el aviso. Título "Mañana: Congreso de Jóvenes" o "Mañana: Culto joven y 2 eventos más"; segunda línea con la iglesia y la hora (un evento) o "Tocá para verlos en el calendario" (varios). La pantalla bloqueada de alrededor es solo contexto.
  - Gestión (#155). La pestaña Gestión la ven la secretaria de iglesia, el pastor y el admin; cada uno entra a su vista. Agregar, editar, quitar y dar de baja exigen conexión.
    - `08-gestion-pastor.html`: además de "Sin encargado", un aviso que agrupa las iglesias sin secretaria y la etiqueta "Sin secretaria" (una iglesia sin encargado muestra solo "Sin encargado"). Tocar un encargado abre Editar encargado.
    - `08b-gestion-secretaria.html` (captura `8b`): los encargados de su iglesia. Las filas de las secretarias no tienen flecha: solo el pastor o el admin las nombran o las quitan.
    - `08c-encargado.html`: Agregar y Editar encargado, para secretaria, pastor y admin. `modo` vale `agregar` o `editar` y `quien` vale `secretaria` o `pastor` (el admin ve lo mismo que el pastor, en toda la asociación). "Es secretaria de la iglesia" solo aparece para pastor y admin. Al editar, el correo y la iglesia no se cambian: el correo lo cambia solo el admin desde Usuario. Capturas `8c` (agregar, pastor), `8d` (editar, secretaria), `8e` (confirmación de "Quitar cargo"), `8f` (sin conexión: aviso arriba y botones apagados) y `8g` (error al guardar: lo escrito queda y el botón pasa a "Probar de nuevo").
    - `09-gestion-admin.html`: pestañas Distritos (captura `9`), Iglesias (`9b`, con buscador y la sección "Dadas de baja" con "Reactivar") y Usuarios (`9c`, con buscador por nombre o correo). Tocar una fila abre su formulario.
    - `09b-iglesia.html`: Nueva iglesia (`9d`) y Editar iglesia, con `modo` `nueva` o `editar`. `movida` muestra el aviso de cambio de distrito (`9e`) y `confirmando` el diálogo de "Dar de baja" (`9f`).
    - `09c-distrito.html`: Editar distrito (`9g`) con sus iglesias. "Sacar" abre la hoja para elegir a qué distrito pasa (`9h`): toda iglesia pertenece a un distrito. "Agregar iglesia" trae una de otro distrito o crea una nueva con este distrito elegido (`9i`). "Dar de baja" está apagado mientras el distrito tenga iglesias. Con `modo` `nuevo` es Nuevo distrito, solo con el nombre (`9j`).
    - `09d-usuario.html`: `vista` vale `usuario` (`9k`: nombre, cambiar correo y cada cargo con "Quitar"), `agregar` (`9l`: un cargo por alta; Encargado o Secretaria piden la iglesia y Pastor pide el distrito; "Darle otro cargo" lo abre con nombre y correo cargados) o `correo` (`9m`: avisa que el correo anterior deja de servir para entrar). El cargo de admin nunca aparece.
  - "Usar mi ubicación" (#164), en `03-elegir-iglesia.html`. Es de la v2: sin la variable `ubicacion` la pantalla es la de la v1 (captura `3`). El permiso se pide recién al tocar el botón; la ubicación se usa una vez en el teléfono y no se guarda ni se envía.
    - `boton` (`3b`): el botón debajo del buscador. `buscando` (`3c`): "Buscando tu ubicación…" mientras el teléfono la obtiene.
    - `cercania` (`3d`): el botón pasa a "De la más cercana a la más lejana" y cada fila suma la distancia ("a 800 m", "a 3,2 km", "a 25 km"). No se elige ninguna iglesia sola. `filtrada` (`3e`): con un nombre escrito, sigue ordenada por distancia. `final` (`3h`): la iglesia sin coordenadas va al final, sin distancia.
    - `error` (`3f`): "No pudimos usar tu ubicación. Podés buscar tu iglesia por nombre.", con el botón para volver a probar. `definitivo` (`3g`): el mismo aviso con "Abrir ajustes del teléfono" y sin el botón, porque tocarlo de nuevo no pediría el permiso.
  - Cambiar o borrar una sola fecha de una serie (#171). Es de la v2: sin estas variables las pantallas son las de la v1. No existe "esta fecha y las siguientes", ni el estado "suspendido".
    - `05-detalle-evento.html`: `hoja` `editar` (`5c`) o `borrar` (`5d`) es la hoja que aparece al tocar Editar o Borrar en una fecha de una serie, con "Solo el sábado 17 de octubre", "Toda la serie" y "Cancelar". Un evento que no se repite y la iglesia sumada no la ven. `excepcion` (`5e`): la nota de una fecha con cambios propios. `borrandoFecha` (`5f`): la confirmación de borrar una sola fecha.
    - `06-crear-evento.html`: `modo` `unaFecha` (`6h`) es el formulario de una sola fecha, con la leyenda arriba y sin dueño, fecha de fin, repetición, "Hasta" ni compartir; se guarda con "Guardar esta fecha". `perdidas` (`6i`): el aviso al guardar la serie entera cuando se pierden fechas con cambios propios, con cuáles son, "Guardar igual" y "Volver a la serie".
  - `04b-calendario-pastor.html` reutiliza `04a-calendario.html` con `rol="pastor"`: es la misma pantalla con filtro por iglesia, botón "Nuevo evento" y la pestaña Gestión.
- `capturas/` — PNG de cada pantalla (exportar desde el lienzo de diseño: Share › Export).
  - `6b · Crear evento (dueño).png` es la hoja que se abre al tocar "Dueño" en Crear evento: los niveles que abarcan los cargos de quien carga, agrupados en Asociación, Distrito e Iglesias.
  - `6e · Crear evento (hora poco común).png` es el cartel que pregunta por una hora de la madrugada, de 00:00 a 05:59 (#128): "Sí" la deja y "Cambiar" vuelve al campo de la hora. En el HTML, `hora` vale `rara` para este cartel e `imposible` para el error de una hora que no existe (`25:00`).
  - `6f · Crear evento (fecha pasada).png` es el aviso "Esta fecha ya pasó." bajo el campo Fecha, mientras la fecha elegida es anterior a hoy (#132). `6g · Crear evento (fecha pasada, Guardar).png` es el diálogo que aparece al tocar Guardar con esa fecha: "Cargarlo igual" guarda y "Cambiar fecha" vuelve al campo Fecha sin guardar. En el HTML, `fecha` vale `pasada` o `dialogo`.
  - Las capturas de Crear evento, del Chat y de Gestión salen de un render a 2x (780 px de ancho), porque `support.js` del editor no está en el repositorio. El estado de cada captura es el que nombra este README.
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
