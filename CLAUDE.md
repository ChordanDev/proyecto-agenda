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

El detalle y los motivos de cada decisión están en los issues #10, #11 y #13.

## Público y tono
- Usuarios de todas las edades, incluidos adultos mayores y personas poco técnicas.
- Prioridad: claridad, textos legibles, botones grandes, pocas opciones por pantalla.
- Estética limpia y amable, fondo claro. El color lo aportan los énfasis; el resto de la interfaz es neutra, con los colores institucionales de la iglesia.

## Los 4 énfasis
Cada evento pertenece a uno. Cada énfasis tiene color **y forma**, para distinguirse sin depender del color.

| Énfasis | Lema | Forma | Color |
|---|---|---|---|
| Identidad | Somos | Círculo | #E8175D |
| Liderazgo | Formamos | Triángulo | #3AAFF0 |
| Nuevas Generaciones | Integramos | "D" (semicírculo) | #FFD84D |
| Discipulado | Hacemos | Cuadrado | #2DC86E |

## Roles
1. **Hermano (sin login):** al abrir la app por primera vez elige su iglesia (queda guardada; se cambia en Ajustes). Ve el calendario de su iglesia + eventos de su distrito + eventos de la asociación. Usa el chat solo para consultar. No edita nada.
2. **Encargado de calendario (con login):** secretaria, tesorero, etc. Una iglesia puede tener varios, todos con los mismos permisos. Crea/edita/borra eventos de su iglesia y puede compartirlos con otras iglesias. Usa el chat para consultar y cargar.
3. **Pastor (con login):** tiene un distrito con varias iglesias. Ve todos sus calendarios (juntos o filtrados), crea eventos en cualquiera de sus iglesias y eventos de distrito (aparecen en todas sus iglesias). Da de alta encargados de sus iglesias.
4. **Admin de asociación (con login):** ve todas las iglesias. Crea eventos de asociación (aparecen en todas las iglesias) y también de cualquier distrito o iglesia. Gestiona distritos, iglesias (con dirección/ubicación), pastores y encargados.

## Eventos
- Campos: título, fecha y hora, fecha de fin (opcional, para eventos de varios días), lugar, descripción (opcional), énfasis (obligatorio), alcance (iglesia / distrito / asociación).
- Un evento de varios días se marca en cada día del rango. La fecha de fin es solo fecha, sin hora de finalización.
- Pueden repetirse: semanal (el mismo día todas las semanas) o mensual (mismo día de la semana y misma posición, por ejemplo "el tercer sábado de cada mes"; la quinta posición se toma como "el último"). Un evento de varios días no puede repetirse.
- Toda serie tiene un fin de la serie ("Hasta"), obligatorio, sugerido a un año y con ese tope. Es un campo distinto de la fecha de fin de un evento de varios días. Para terminar una serie se acorta; para renovarla, se alarga.
- Las reglas completas de repetición, eventos compartidos y excepciones están en el issue #14.

### Eventos compartidos entre iglesias
- Al crear un evento se pueden sumar otras iglesias con un buscador que abarca toda la asociación. Sin escribir, muestra primero las 4 más cercanas; al buscar, los resultados siguen ordenados por distancia. Las elegidas quedan arriba como etiquetas.
- El evento aparece en las iglesias sumadas con la etiqueta "Compartido con…".
- Solo el dueño del evento (la iglesia o el distrito al que pertenece, no la persona que lo cargó) puede editarlo o borrarlo. El encargado de una iglesia sumada puede quitarlo de su calendario.

## Chat con IA
- Consulta: "¿Qué hay el sábado que viene?", "¿De qué se trata el congreso de jóvenes?".
- Carga (encargado/pastor/admin): "Cargame un culto joven el sábado 17 a las 19 h". La IA **siempre** muestra una tarjeta de vista previa del evento (con su forma y color de énfasis) y botones Editar / Confirmar. **Nunca guarda sin confirmación.**
- Admite entrada por voz (micrófono).

## Notificaciones
Recordatorios simples de eventos próximos (ej. "Mañana: Congreso de Jóvenes"), activables en Ajustes.

## Pantallas
1. **Bienvenida:** botón principal "Elegir mi iglesia"; secundario "Soy encargado o pastor" (lleva al login).
2. **Login:** email y contraseña, con el enlace "Es mi primera vez u olvidé mi contraseña" (envía un código de 6 dígitos por correo para elegir la contraseña).
3. **Elegir iglesia:** buscador, opción "Usar mi ubicación", lista de cercanas mostrando distrito y distancia, botón Continuar.
4. **Calendario (todos los roles):** vista mensual con marcadores por día (forma + color del énfasis), día seleccionado destacado y lista de eventos de ese día debajo. Filtros por énfasis (y por iglesia para pastor/admin). Los eventos de asociación/distrito muestran su alcance.
5. **Detalle de evento:** toda la información, énfasis, alcance y con qué iglesias se comparte. Editar/quitar según permisos.
6. **Crear/editar evento:** título, fecha, hora, fecha de fin opcional, descripción opcional, selector de énfasis (4 opciones con forma y color), repetición (con el campo "Hasta" y un texto que la explica con palabras), buscador de iglesias para compartir.
7. **Chat IA:** conversación con tarjetas de vista previa para confirmar eventos.
8. **Gestión del pastor:** lista de sus iglesias (encargados y cantidad de eventos del mes, aviso si una iglesia no tiene encargado), lista de encargados, botón "Agregar encargado".
9. **Gestión del admin:** pestañas Distritos / Iglesias / Usuarios; aviso de distritos sin pastor; botones "Nuevo distrito" y "Nueva iglesia" (con dirección).
10. **Ajustes:** cambiar de iglesia, notificaciones, cerrar sesión, eliminar mi cuenta.

Navegación inferior: Calendario · Chat · Gestión (solo pastor/admin) · Ajustes.

## Entregas
El trabajo se divide en dos entregas, cada una con su milestone en GitHub. Todas las funcionalidades de este documento se desglosan en issues; el milestone de cada una indica cuándo se construye. Si la v1 termina antes de su fecha, se continúa con la v2.

### v1 (vence el viernes 4 de diciembre de 2026)
Prueba que la app reemplaza a la agenda impresa de punta a punta.

- Recorrido del hermano: bienvenida, elegir iglesia con buscador por nombre (cada resultado muestra distrito y localidad), calendario mensual con marcadores, lista del día y detalle del evento.
- Calendario con eventos de iglesia, distrito y asociación, con su alcance visible.
- Los cuatro énfasis con forma y color. Filtros por énfasis y, para pastor y admin, por iglesia.
- Crear, editar y borrar eventos para encargado, pastor y admin, con inicio de sesión.
- Repetición semanal y mensual con fin de la serie ("Hasta"). Editar o borrar afecta siempre a toda la serie.
- Eventos de varios días, con fecha de fin opcional.
- Consulta sin conexión, solo lectura: se muestra el último calendario descargado con la fecha de última actualización. Crear, editar y borrar exigen conexión.
- Ajustes: cambiar de iglesia, cerrar sesión y eliminar mi cuenta.
- Distritos, iglesias, pastores y encargados los cargan los desarrolladores a partir de los datos de la asociación. La relación de iglesias sumadas existe en el modelo de datos aunque todavía no tenga pantalla.

### v2 (en orden de construcción)
1. Chat de consulta.
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
