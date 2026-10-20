# Agenda de iglesia (Iglesia Adventista)

## Qué es
App móvil que reemplaza las agendas impresas que hoy la Iglesia Adventista entrega a quienes ocupan cargos en cada iglesia (costosas y poco eficientes). Es un calendario compartido, organizado por niveles: **asociación → distrito → iglesia**, con un asistente de IA para cargar y consultar eventos en lenguaje natural.

- Plataforma: iOS y Android.
- Idioma: español.

## Stack
- **App:** Expo (React Native + TypeScript) con Expo Router. Development builds desde el primer día, no Expo Go.
- **Backend y hosting:** Supabase, región de São Paulo. La app usa el cliente de Supabase directamente; los permisos viven en políticas RLS de Postgres y llevan pruebas automáticas. Las funciones de servidor se reservan para el chat con IA y los recordatorios (v2).
- **Esquema:** los cambios de tablas y políticas son migraciones SQL versionadas en el repositorio (Supabase CLI). Hay un proyecto de desarrollo y otro de producción.
- **Consulta sin conexión:** caché de consultas persistida con TanStack Query.
- **Correos de acceso:** Resend, con remitente del dominio de la asociación.
- **Chat con IA (v2):** GPT-6 Luna (OpenAI), llamado desde una función de servidor que aísla al proveedor. La clave nunca está en la app.

El detalle y los motivos de cada decisión están en los issues #10, #11, #12 y #13.

## Forma de trabajo
Resumen de lo decidido en el issue #15.

### Estructura del código
- Un solo repositorio: la app y la carpeta `supabase/` (migraciones, pruebas de permisos, funciones).
- Carpetas por funcionalidad (`calendario`, `eventos`, `iglesias`, `sesion`, `ajustes`). Cada una tiene tres capas: `dominio` (reglas puras en TypeScript, sin React ni Supabase), `datos` (consultas a Supabase) e `interfaz` (pantallas y componentes).
- **Un componente nunca llama a Supabase:** pide datos a través de la capa `datos` de su funcionalidad.
- Las rutas de Expo Router solo conectan una URL con una pantalla.
- El código compartido entre funcionalidades va en `src/shared`.
- TypeScript en modo estricto. Los tipos de la base se generan desde el esquema.

### Idioma del código
- Si la palabra está en `GLOSSARY.md`, va en español, sin tildes ni eñes: tabla `iglesias`, tipo `Cargo`, `alcance`, `iglesiaSumada`. "Dueño" se escribe `duenio`.
- Todo lo demás va en inglés. Los nombres mixtos son esperables: `getEventosDeIglesia()`.
- Commits convencionales y comentarios en inglés. Tickets y documentación, en español.

### Pruebas
- Reglas del dominio: pruebas unitarias obligatorias, escritas antes que el código (Jest).
- Permisos de la base: pruebas obligatorias contra un Supabase local (pgTAP), con al menos un caso permitido y uno rechazado por política.
- Pantallas: sin pruebas automáticas en la v1; se verifican a mano contra el diseño aprobado.

### Ramas
- Una rama por funcionalidad, creada desde `main`. Cada ticket de esa funcionalidad va en su propia rama, con pull request a la rama de la funcionalidad. Recién cuando la funcionalidad está terminada, su rama se fusiona a `main` con un pull request.
- Un ticket que no forma parte de una funcionalidad más grande va en una rama corta con pull request directo a `main`.
- Los pull requests a `main` se fusionan en un solo commit. No hay revisión obligatoria: se fusionan cuando las verificaciones automáticas pasan.
- `main` es la rama por defecto y la única permanente. La documentación va directo a `main`.
- Una versión es una etiqueta sobre un commit de `main` (`v1.0.0`).
- Arreglos urgentes: son un pull request más a `main` y se publican etiquetando `main`.

### Integración continua
- Las verificaciones corren en todo pull request que no es borrador, sea cual sea su rama de destino.
- En cada pull request corren cuatro verificaciones, todas obligatorias: tipos (`tsc`), estilo (ESLint y Prettier), pruebas del dominio y pruebas de permisos sobre un Supabase local con las migraciones aplicadas desde cero.
- Las migraciones se aplican solas al Supabase de desarrollo al fusionar a `main`. A producción se aplican a mano, como paso de la publicación de cada versión.
- Los secretos van en GitHub y en EAS, nunca en un archivo versionado.

### Tickets
- Se trabaja por funcionalidad completa: quien toma un ticket hace su migración, sus permisos, sus reglas, sus consultas y su pantalla.
- Cada pantalla es un ticket principal, con el diseño aprobado como criterio de terminado. Las pantallas grandes se parten en sub-tickets, uno por cada parte que se pueda cortar o que sea de otra entrega.
- Antes de crear una migración se trae `main`.

## Público y tono
- Usuarios de todas las edades, incluidos adultos mayores y personas poco técnicas.
- Prioridad: claridad, textos legibles, botones grandes, pocas opciones por pantalla.
- Estética limpia y amable, fondo claro. El color lo aportan los énfasis; el resto de la interfaz es neutra, con los colores institucionales de la iglesia.

## Los 4 énfasis
Un evento pertenece a un énfasis o a ninguno. Cada énfasis tiene color **y forma**, para distinguirse sin depender del color.

| Énfasis | Lema | Forma | Color |
|---|---|---|---|
| Identidad | Somos | Círculo | #E8175D |
| Liderazgo | Formamos | Triángulo | #3AAFF0 |
| Nuevas Generaciones | Integramos | "D" (semicírculo) | #FFD84D |
| Discipulado | Hacemos | Cuadrado | #2DC86E |

Un evento sin énfasis es una **actividad regular** (cultos de oración, Escuela Sabática). No es un quinto énfasis: es la falta de uno. Se muestra con un rombo gris (#6B7685).

## Roles
1. **Hermano (sin login):** al abrir la app por primera vez elige su iglesia (queda guardada; se cambia en Ajustes). Ve el calendario de su iglesia + eventos de su distrito + eventos de la asociación. No tiene chat. No edita nada.
2. **Encargado de calendario (con login):** cada encargado tiene una función de texto libre (secretaria, tesorero, anciano…) que no cambia sus permisos. Una iglesia puede tener varios, todos con los mismos permisos sobre los eventos. Crea/edita/borra eventos de su iglesia y puede compartirlos con otras iglesias. Usa el chat para consultar y cargar. Solo ve su propio nombre, correo y cargo.
   - **Secretaria de iglesia:** un encargado que además agrega, edita y quita a los demás encargados de su iglesia, y ve sus nombres, correos y cargos. Puede haber varias por iglesia. La nombran o la quitan solo el pastor (en su distrito) o el admin; una secretaria no nombra a otra.
3. **Pastor (con login):** tiene un distrito con varias iglesias. Ve todos sus calendarios (juntos o filtrados), crea eventos en cualquiera de sus iglesias y eventos de distrito (aparecen en todas sus iglesias). Da y quita los cargos de encargado y de secretaria de iglesia en las iglesias de su distrito, y ve sus nombres, correos y cargos.
4. **Admin de asociación (con login):** ve todas las iglesias. Crea eventos de asociación (aparecen en todas las iglesias) y también de cualquier distrito o iglesia. Gestiona distritos, iglesias (con dirección/ubicación), pastores, secretarias de iglesia y encargados de su asociación, y ve todos sus nombres, correos y cargos. Es el único que cambia el correo de un usuario. El cargo de admin lo asignan solo los desarrolladores.

## Eventos
- Campos: título, fecha y hora, fecha de fin (opcional, para eventos de varios días), lugar, descripción (opcional), énfasis (uno de los cuatro, o ninguno si es una actividad regular), alcance (iglesia / distrito / asociación).
- Un evento de varios días se marca en cada día del rango. La fecha de fin es solo fecha, sin hora de finalización.
- Pueden repetirse: semanal (el mismo día todas las semanas) o mensual (mismo día de la semana y misma posición, por ejemplo "el tercer sábado de cada mes"; la quinta posición se toma como "el último"). Un evento de varios días no puede repetirse.
- Toda serie tiene un fin de la serie ("Hasta"), obligatorio, sugerido a un año y con ese tope. Es un campo distinto de la fecha de fin de un evento de varios días. Para terminar una serie se acorta; para renovarla, se alarga.
- Las reglas completas de repetición, eventos compartidos y excepciones están en el issue #14.

### Eventos compartidos entre iglesias
- Al crear un evento se pueden sumar otras iglesias con un buscador que abarca toda la asociación. Sin escribir, muestra primero las 4 más cercanas; al buscar, los resultados siguen ordenados por distancia. Las elegidas quedan arriba como etiquetas.
- El evento aparece en las iglesias sumadas con la etiqueta "Compartido con…".
- Solo el dueño del evento (la iglesia o el distrito al que pertenece, no la persona que lo cargó) puede editarlo o borrarlo. El encargado de una iglesia sumada puede quitarlo de su calendario.

## Chat con IA
- Solo para usuarios con sesión iniciada (encargado, pastor, admin). El hermano no tiene chat.
- Habla solo del calendario. Ante cualquier otra cosa responde que solo puede ayudar con el calendario; si a un evento le falta información, lo dice y no rellena.
- Consulta: "¿Qué hay el sábado que viene?", "¿De qué se trata el congreso de jóvenes?". Las búsquedas se ejecutan con la identidad de quien pregunta.
- Carga: "Cargame un culto joven el sábado 17 a las 19 h". La IA **siempre** muestra una tarjeta de vista previa del evento (con su forma y color de énfasis) y botones Editar / Confirmar. **Nunca guarda sin confirmación:** el modelo solo propone el evento y es la app la que guarda al tocar Confirmar. Por chat solo se crea; editar y borrar se hacen desde el detalle del evento.
- Las conversaciones no se guardan. Cada respuesta tiene un botón "Reportar respuesta", que registra un motivo sin el texto.
- Límites: 50 consultas por día por usuario y un presupuesto mensual de 20 USD. Al llegar al límite diario, el chat avisa que se alcanzó el máximo de consultas de hoy y recuerda que el formulario sigue disponible; el contador se reinicia a la medianoche, hora de la asociación. Si se agota el presupuesto mensual, el chat se apaga hasta el mes siguiente.
- Admite entrada por voz (micrófono), con el reconocimiento de voz del teléfono.
- Las reglas completas están en el issue #12.

## Notificaciones
Recordatorios simples de eventos próximos (ej. "Mañana: Congreso de Jóvenes"), activables en Ajustes.

## Pantallas
1. **Bienvenida:** botón principal "Elegir mi iglesia"; secundario "Soy encargado o pastor" (lleva al login).
2. **Login:** solo con un código por correo, sin contraseña (issue #126). Pide el email y "Enviar código"; después, el código de 6 dígitos que llega por correo, y entra directo al calendario. El primer acceso y el ingreso normal son el mismo camino. No revela si un correo está registrado.
3. **Elegir iglesia:** buscador, opción "Usar mi ubicación", lista de cercanas mostrando distrito y distancia, botón Continuar.
4. **Calendario (todos los roles):** vista mensual con marcadores por día (forma + color del énfasis, o el rombo de la actividad regular), día seleccionado destacado y lista de eventos de ese día debajo. Filtros por énfasis (y por iglesia para pastor/admin). Los eventos de asociación/distrito muestran su alcance.
5. **Detalle de evento:** toda la información, énfasis, alcance y con qué iglesias se comparte. Editar/quitar según permisos.
6. **Crear/editar evento:** título, fecha, hora, fecha de fin opcional, descripción opcional, selector de énfasis (los 4 énfasis y "Actividad regular", cada opción con forma y color; hay que elegir una), repetición (con el campo "Hasta" y un texto que la explica con palabras), buscador de iglesias para compartir.
7. **Chat IA (solo con sesión iniciada):** conversación con tarjetas de vista previa para confirmar eventos y botón "Reportar respuesta". La primera vez pide aceptar que los mensajes se envían a OpenAI.
8. **Gestión del pastor:** lista de sus iglesias (encargados y cantidad de eventos del mes, aviso si una iglesia no tiene encargado), lista de encargados, botón "Agregar encargado".
9. **Gestión del admin:** pestañas Distritos / Iglesias / Usuarios; aviso de distritos sin pastor; botones "Nuevo distrito" y "Nueva iglesia" (con dirección).
10. **Ajustes:** cambiar de iglesia, notificaciones, cerrar sesión, eliminar mi cuenta.

Navegación inferior: Calendario · Chat (solo con sesión iniciada) · Gestión (solo pastor/admin) · Ajustes. El hermano ve Calendario y Ajustes.

## Entregas
El trabajo se divide en dos entregas, cada una con su milestone en GitHub. Todas las funcionalidades de este documento se desglosan en issues; el milestone de cada una indica cuándo se construye. Si la v1 termina antes de su fecha, se continúa con la v2.

### v1 (vence el viernes 4 de diciembre de 2026)
Prueba que la app reemplaza a la agenda impresa de punta a punta.

- Recorrido del hermano: bienvenida, elegir iglesia con buscador por nombre (cada resultado muestra distrito, ciudad y provincia), calendario mensual con marcadores, lista del día y detalle del evento.
- Calendario con eventos de iglesia, distrito y asociación, con su alcance visible.
- Los cuatro énfasis y la actividad regular, con forma y color. Filtros por énfasis (con la actividad regular como una opción más) y, para pastor y admin, por iglesia.
- Crear, editar y borrar eventos para encargado, pastor y admin, con inicio de sesión.
- Repetición semanal y mensual con fin de la serie ("Hasta"). Editar o borrar afecta siempre a toda la serie.
- Eventos de varios días, con fecha de fin opcional.
- Consulta sin conexión, solo lectura: se muestra el último calendario descargado con la fecha de última actualización. Crear, editar y borrar exigen conexión.
- Ajustes: cambiar de iglesia, cerrar sesión y eliminar mi cuenta.
- Distritos, iglesias, pastores y encargados los cargan los desarrolladores a partir de los datos de la asociación. La relación de iglesias sumadas existe en el modelo de datos aunque todavía no tenga pantalla.

### v2 (en orden de construcción)
1. Chat de consulta, para usuarios con sesión iniciada.
2. Chat de carga, con tarjeta de vista previa y botones Editar / Confirmar.
3. Notificaciones de recordatorio, enviadas desde el servidor.
4. Gestión del pastor.
5. Gestión del admin.
6. "Usar mi ubicación" y distancias al elegir iglesia.
7. Eventos compartidos entre iglesias.
8. Excepciones en eventos repetidos (cambiar una sola fecha de una serie).
9. Entrada por voz en el chat.

### Si la v1 se atrasa
Se sacrifican, en este orden: el filtro por iglesia para pastor y admin, los filtros por énfasis y la repetición mensual. El resto de la v1 no se recorta; si no alcanza, se mueve la fecha.

## Fuera de alcance
- Nivel de unión: por ahora hay una sola asociación, pero la estructura de datos debe permitir sumar ese nivel después.

## Diseño
El diseño visual aprobado está en `diseno/` (pantallas en HTML, capturas, logo y `theme.ts`). Leé `diseno/README.md` y respetá esos valores al implementar las pantallas en React Native.

## Agent skills

### Issue tracker

Los issues y las especificaciones viven en GitHub Issues del repositorio, con la CLI `gh`. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Se usan las cinco etiquetas por defecto: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` y `wontfix`. Ver `docs/agents/triage-labels.md`.

### Domain docs

Un solo contexto: `GLOSSARY.md` en la raíz y `docs/adr/`. Ver `docs/agents/domain.md`.
