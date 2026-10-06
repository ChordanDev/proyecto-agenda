# Agenda de iglesia (Iglesia Adventista)

## Qué es
App móvil que reemplaza las agendas impresas que hoy la Iglesia Adventista entrega a quienes ocupan cargos en cada iglesia (costosas y poco eficientes). Es un calendario compartido, organizado por niveles: **asociación → distrito → iglesia**, con un asistente de IA para cargar y consultar eventos en lenguaje natural.

- Plataforma: iOS y Android.
- Idioma: español.

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
4. **Admin de asociación (con login):** ve todas las iglesias. Crea eventos de asociación (aparecen en todas las iglesias). Gestiona distritos, iglesias (con dirección/ubicación), pastores y encargados.

## Eventos
- Campos: título, fecha y hora, lugar, descripción (opcional), énfasis (obligatorio), alcance (iglesia / compartido / distrito / asociación).
- Pueden repetirse (semanal, mensual).

### Eventos compartidos entre iglesias
- Al crear un evento se pueden sumar otras iglesias con un buscador que abarca toda la asociación. Sin escribir, muestra primero las 4 más cercanas; al buscar, los resultados siguen ordenados por distancia. Las elegidas quedan arriba como etiquetas.
- El evento aparece en las iglesias sumadas con la etiqueta "Compartido con…".
- Solo quien lo creó puede editarlo. El encargado de una iglesia sumada puede quitarlo de su calendario.

## Chat con IA
- Consulta: "¿Qué hay el sábado que viene?", "¿De qué se trata el congreso de jóvenes?".
- Carga (encargado/pastor/admin): "Cargame un culto joven el sábado 17 a las 19 h". La IA **siempre** muestra una tarjeta de vista previa del evento (con su forma y color de énfasis) y botones Editar / Confirmar. **Nunca guarda sin confirmación.**
- Admite entrada por voz (micrófono).

## Notificaciones
Recordatorios simples de eventos próximos (ej. "Mañana: Congreso de Jóvenes"), activables en Ajustes.

## Pantallas
1. **Bienvenida:** botón principal "Elegir mi iglesia"; secundario "Soy encargado o pastor" (lleva al login).
2. **Login:** email y contraseña.
3. **Elegir iglesia:** buscador, opción "Usar mi ubicación", lista de cercanas mostrando distrito y distancia, botón Continuar.
4. **Calendario (todos los roles):** vista mensual con marcadores por día (forma + color del énfasis), día seleccionado destacado y lista de eventos de ese día debajo. Filtros por énfasis (y por iglesia para pastor/admin). Los eventos de asociación/distrito muestran su alcance.
5. **Detalle de evento:** toda la información, énfasis, alcance y con qué iglesias se comparte. Editar/quitar según permisos.
6. **Crear/editar evento:** título, fecha, hora, descripción opcional, selector de énfasis (4 opciones con forma y color), repetición, buscador de iglesias para compartir.
7. **Chat IA:** conversación con tarjetas de vista previa para confirmar eventos.
8. **Gestión del pastor:** lista de sus iglesias (encargados y cantidad de eventos del mes, aviso si una iglesia no tiene encargado), lista de encargados, botón "Agregar encargado".
9. **Gestión del admin:** pestañas Distritos / Iglesias / Usuarios; aviso de distritos sin pastor; botones "Nuevo distrito" y "Nueva iglesia" (con dirección).
10. **Ajustes:** cambiar de iglesia, notificaciones, cerrar sesión.

Navegación inferior: Calendario · Chat · Gestión (solo pastor/admin) · Ajustes.

## Fuera de la primera versión
- Nivel de unión: por ahora hay una sola asociación, pero la estructura de datos debe permitir sumar ese nivel después.
