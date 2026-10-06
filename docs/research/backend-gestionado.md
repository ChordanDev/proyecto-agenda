# Opciones de backend gestionado

Investigación para el issue #6. Fecha de lectura de todas las fuentes: **2026-10-06**. Precios en USD tal como están publicados ese día.

Este documento compara; **no elige**. La decisión corresponde a un ticket posterior.

Convenciones:

- **[V]** hecho verificado en la fuente citada.
- **[E]** estimación propia, calculada a partir de precios verificados y de supuestos que se indican.
- **[NV]** no se pudo verificar en una fuente primaria.

## Resumen

- Los cuatro backends gestionados (Supabase, Firebase, Appwrite, Convex) cubren autenticación, base de datos, funciones de servidor y tareas programadas. Las diferencias reales están en **consultas geográficas**, **push**, **costo del primer plan pago** y **portabilidad**.
- **Costo mensual publicado del primer escalón pago:** Supabase Pro desde 25 USD por organización; Appwrite Pro desde 25 USD; Convex Professional 25 USD por desarrollador (50 USD con dos desarrolladores [E]); Firebase Blaze no tiene cuota fija (pago por uso sobre cuotas sin costo). Los cuatro tienen plan gratuito, con restricciones distintas.
- **Restricciones del plan gratuito que afectan a este proyecto:** Supabase y Appwrite pausan proyectos gratuitos tras 1 semana de inactividad; Appwrite Free admite 1 solo miembro de organización, 2 funciones por proyecto y 1000 mensajes/mes de Messaging; Firebase Spark no incluye Cloud Functions (hace falta Blaze para llamar a un proveedor de IA desde el servidor y para tareas programadas).
- **Vecino más cercano:** Supabase lo resuelve con PostGIS (operador `<->` con índice espacial). Convex ofrece un componente geoespacial en beta con consulta `nearest`. Appwrite tiene columnas espaciales y filtros por distancia, pero la documentación no describe ordenar por distancia. Firestore no lo soporta de forma nativa (solución con geohash y filtrado en el cliente).
- **Push:** solo Firebase (FCM, sin costo) y Appwrite (Messaging sobre FCM/APNs) lo incluyen como producto. Supabase y Convex se integran con un servicio externo (Expo Push o FCM).
- **Portabilidad:** Supabase (Postgres estándar, Apache 2.0, autoalojable, `pg_dump`) y Appwrite (BSD de 3 cláusulas, autoalojable) son de código abierto; Convex publica su backend con licencia FSL (convierte a Apache 2.0 a los dos años) y es autoalojable; Firebase no ofrece autoalojamiento y Firestore usa un modelo y un formato de exportación propios.
- **Región:** Supabase, Firestore, Fly.io y AWS Lightsail tienen región en São Paulo. Appwrite Cloud, Convex y Railway no listan ninguna región en Sudamérica.
- **Referencia de servidor propio:** entre 6 y 16 USD/mes de infraestructura [E] (según proveedor y región), sin contar el trabajo de construir y operar autenticación, push, tareas programadas y copias de seguridad.

## Tabla comparativa

| Criterio | Supabase | Firebase | Appwrite | Convex | Servidor propio (referencia) |
|---|---|---|---|---|---|
| Autenticación con roles | Email/contraseña; roles con claims propios en el JWT (Auth Hook, disponible en Free y Pro) y políticas RLS [V] | Email/contraseña; roles con custom claims, que solo se asignan desde un entorno privilegiado (Admin SDK) [V] | Email/contraseña; permisos por rol: `any`, `guests`, `users`, equipo con rol, etiqueta [V] | Convex Auth (beta, admite contraseñas) o proveedor externo (Clerk, WorkOS, Auth0); la autorización se escribe en el código de cada función [V] | A construir o integrar |
| Base de datos | Postgres dedicado por proyecto [V] | Firestore (documentos); alternativa SQL Connect sobre Cloud SQL PostgreSQL [V] | TablesDB por defecto; bases dedicadas (PostgreSQL, MySQL y otras) desde 10 USD/mes en Pro [V] | Base propia consultada mediante funciones TypeScript [V] | Postgres |
| Push | Sin servicio propio; Edge Function + webhook hacia Expo Push o FCM [V] | FCM, sin costo en ambos planes [V] | Messaging con proveedores FCM y APNs; Free: 1000 mensajes/mes y 1 tema [V] | Componente oficial sobre Expo Push [V] | Integración directa con FCM/APNs o Expo Push |
| Tareas programadas | Supabase Cron (`pg_cron`); ejecuta SQL, funciones de base de datos o HTTP (incluye Edge Functions) [V] | `onSchedule` sobre Cloud Scheduler; requiere Blaze; 0,10 USD por tarea/mes, 3 tareas sin cargo por cuenta de Google [V] | Ejecuciones programadas (cron) y diferidas de Functions [V]; intervalo mínimo [NV] | `crons.ts` (intervalos desde segundos) y funciones agendadas con `runAfter`/`runAt` [V] | `cron` del sistema o `pg_cron` |
| Funciones de servidor | Edge Functions: 256 MB, 2 s de CPU, 150 s (Free) / 400 s (pago) de reloj [V] | Cloud Functions: **no disponibles en Spark**; en Blaze 2 M de invocaciones/mes sin costo [V] | Functions: ejecución síncrona con límite de 30 s; Free: 2 funciones por proyecto [V] | Actions: límite de 10 min; 64 MB (runtime Convex) o 512 MB (Node.js) [V] | Código propio en el servidor |
| Vecino más cercano | PostGIS, `order by` con `<->` e índice espacial, expuesto por RPC [V] | Sin soporte nativo en Firestore; geohash + varias consultas + filtrado en cliente [V] | Columnas espaciales y filtros `distanceLessThan`, etc.; ordenar por distancia no está documentado [V] | Componente geoespacial (beta) con `nearest` (`point`, `limit`, `maxDistance`) [V] | PostGIS |
| Acceso sin login | Clave `anon` (rol Postgres anónimo, no crea usuario) + RLS; opcional: inicio de sesión anónimo con claim `is_anonymous` [V] | Reglas de seguridad con lectura pública; App Check para atestiguar la app; autenticación anónima opcional [V] | `Role.any()` / `Role.guests()` por recurso; sesiones anónimas opcionales [V] | Las funciones públicas son accesibles por cualquier cliente; `getUserIdentity()` devuelve `null` sin sesión y el control se hace en código [V] | A implementar |
| Plan gratuito | 500 MB de base, 50 000 MAU, 5 GB de egreso, 500 000 invocaciones, 2 proyectos, pausa tras 1 semana de inactividad, sin copias automáticas [V] | Spark: Firestore 1 GiB, 50 000 lecturas/día, 20 000 escrituras/día, Auth 50 000 MAU, FCM sin costo; sin Cloud Functions [V] | 5 GB de ancho de banda, 2 GB de almacenamiento, 750 000 ejecuciones, 75 000 MAU, 500 000 lecturas y 250 000 escrituras/mes, 2 proyectos, 1 miembro, pausa tras 1 semana de inactividad [V] | 1 M de llamadas a funciones, 0,5 GB de base, 20 GB-hora de actions, 1 a 6 miembros [V] | Sin plan gratuito permanente en Fly.io ni Railway [V] |
| Primer plan pago | Pro: desde 25 USD/mes por organización; incluye 10 USD de crédito de cómputo, que cubre un proyecto Micro [V] | Blaze: pago por uso, conserva las cuotas sin costo [V] | Pro: desde 25 USD/mes; 1 proyecto incluido, cada proyecto adicional 15 USD [V] | Professional: 25 USD por desarrollador/mes [V] | Ver sección de referencia |
| Costo mensual estimado para este proyecto | 0 USD (Free) o 25 USD (Pro, un proyecto Micro) [E] | 0 a pocos USD en Blaze [E] | 0 USD (Free) o 25 USD (Pro) [E] | 0 USD (Free) o 50 USD (Professional, 2 desarrolladores) [E] | 6 a 16 USD de infraestructura [E] |
| Tope de gasto | Spend cap activado por defecto en Pro [V] | Las alertas de presupuesto no limitan el gasto; hay "spend caps" solo para Cloud Functions, App Hosting, AI Logic y Extensions [V] | Topes y alertas de presupuesto incluidos en Pro [V] | En Free, al superar los límites las mutaciones pueden fallar; en planes pagos se cobra el excedente [V] | Precio fijo por recurso |
| Código abierto / licencia | Apache 2.0 (repositorio principal) [V] | Sin opción de autoalojamiento; los emuladores no son aptos para producción [V] | BSD de 3 cláusulas [V] | FSL-1.1 con licencia futura Apache 2.0 a los dos años; prohíbe uso competidor [V] | Postgres y el código propio |
| Autoalojamiento | Docker Compose; sin copias gestionadas, PITR ni branching [V] | No [V] | Docker; mínimo 2 núcleos y 4 GB de RAM [V] | Docker; SQLite por defecto, Postgres o MySQL opcionales [V] | Es el punto de partida |
| Lenguaje de datos | SQL estándar (Postgres) [V] | Modelo de documentos y reglas de seguridad propios [V] | API y operadores de consulta propios [V] | Funciones TypeScript contra una API propia [V] | SQL estándar |
| Exportación de datos | `pg_dump` o `supabase db dump` en todos los planes [V] | Exportación gestionada a Cloud Storage; requiere Blaze y cobra una lectura por documento; cargable en BigQuery [V] | Migraciones Cloud ↔ autoalojado; copias diarias solo en Pro [V] | `npx convex export` (ZIP) y exportación en streaming [V] | `pg_dump` |
| Región en Sudamérica | São Paulo (`sa-east-1`) [V] | Firestore: São Paulo y Santiago [V] | Ninguna listada [V] | Ninguna; fuera de EE. UU. se cobra 30 % adicional [V] | Fly.io `gru` y Lightsail São Paulo sí; Railway y DigitalOcean no listan ninguna [V] |

## Notas por proveedor

### Supabase

**Precios y límites** (fuente: <https://supabase.com/pricing>)

- Free, 0 USD/mes: 500 MB de base de datos, 50 000 MAU, 5 GB de egreso, 1 GB de archivos, 500 000 invocaciones de Edge Functions, 200 conexiones Realtime simultáneas, máximo 2 proyectos activos, pausa "After 1 week of inactivity", sin copias de seguridad. [V]
- Pro, desde 25 USD/mes: 8 GB de base (luego 0,125 USD/GB), 100 000 MAU (luego 0,00325 USD/MAU), 250 GB de egreso (luego 0,09 USD/GB), 100 GB de archivos, 2 M de invocaciones (luego 2 USD por millón), copias de 7 días, sin pausa, spend cap activado por defecto. [V]
- Team, desde 599 USD/mes. [V]
- La facturación es por organización; cada proyecto corre en un servidor Postgres dedicado y se cobra su cómputo aparte. <https://supabase.com/docs/guides/platform/billing-on-supabase> [V]
- Cómputo: Micro ~10 USD/mes, Small ~15 USD/mes. Los planes pagos incluyen 10 USD de crédito de cómputo que "cover one project running on the Micro/Nano Compute size". El plan Free usa Nano. Ejemplo oficial: Pro con un proyecto Small = 30 USD. <https://supabase.com/docs/guides/platform/manage-your-usage/compute> [V]
- Pro con un único proyecto Micro = 25 USD/mes; un segundo proyecto (por ejemplo, staging) sumaría ~10 USD. [E]

**Capacidades**

- Roles: claims propios en el JWT mediante el hook Custom Access Token, más políticas RLS que los leen. <https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac> [V]. El hook figura como disponible en Free y Pro. <https://supabase.com/docs/guides/auth/auth-hooks> [V]
- Acceso sin login: la clave `anon` no crea usuario y usa el rol anónimo de Postgres, lo que permite acceso público gobernado por RLS. El inicio de sesión anónimo es otra cosa: crea un usuario con rol `authenticated` y claim `is_anonymous`, tiene un límite de 30 solicitudes por hora por IP (configurable) y la documentación recomienda CAPTCHA o Turnstile. <https://supabase.com/docs/guides/auth/auth-anonymous> [V]
- MAU: se cuenta cada usuario distinto que inicia sesión o renueva su token en el ciclo. <https://supabase.com/docs/guides/platform/manage-your-usage/monthly-active-users> [V]. Si los usuarios anónimos cuentan como MAU: [NV].
- Geografía: extensión PostGIS; el ejemplo oficial ordena por distancia con `<->`, que "uses the spatial index when used within `order by` clause", dentro de una función invocada por RPC. <https://supabase.com/docs/guides/database/extensions/postgis> [V]
- Tareas programadas: Supabase Cron, basado en `pg_cron`; ejecuta SQL, funciones de base de datos o solicitudes HTTP (incluidas Edge Functions); se recomienda un máximo de 8 tareas simultáneas y que cada una termine en menos de 10 minutos. <https://supabase.com/docs/guides/cron> [V]. Disponibilidad en el plan Free: [NV] (la página no lo indica).
- Funciones: memoria máxima 256 MB, CPU 2 s por solicitud, reloj 150 s en Free y 400 s en planes pagos, hasta 100 funciones por proyecto en Free. <https://supabase.com/docs/guides/functions/limits> [V]
- Push: no hay servicio propio. La guía oficial usa un webhook de base de datos que invoca una Edge Function, y esta reenvía a Expo Push o a FCM. <https://supabase.com/docs/guides/functions/examples/push-notifications> [V]
- Región: South America (São Paulo) `sa-east-1`. <https://supabase.com/docs/guides/platform/regions> [V]

**Portabilidad**

- Licencia Apache 2.0 en el repositorio principal. <https://github.com/supabase/supabase/blob/master/LICENSE> [V]. Licencias de cada componente por separado: [NV].
- Autoalojamiento con Docker Compose. No incluye "branching, advanced metrics beyond logs, managed backups and PITR, analytics and vector buckets, ETL, and the Management API". El soporte es comunitario. <https://supabase.com/docs/guides/self-hosting> [V]
- Exportación con `supabase db dump` o `pg_dump` en todos los planes; las copias de base de datos no incluyen los archivos de Storage. <https://supabase.com/docs/guides/platform/backups> [V]

### Firebase

**Precios y límites** (fuente: <https://firebase.google.com/pricing>)

- Spark (gratuito, sin medio de pago): Authentication 50 000 MAU; Firestore 1 GiB, 50 000 lecturas/día, 20 000 escrituras/día, 20 000 eliminaciones/día, 10 GiB de salida al mes; FCM sin costo; **Cloud Functions no disponibles**. [V]
- Blaze (pago por uso): mantiene las mismas cuotas sin costo. Cloud Functions: 2 M de invocaciones/mes sin costo (luego 0,40 USD por millón), 400 000 GB-segundo y 200 000 CPU-segundo, 5 GB de red saliente sin costo (luego 0,12 USD/GB). [V]
- Firestore, edición Estándar, Iowa (`us-central1`): 0,03 USD por 100 000 lecturas, 0,09 USD por 100 000 escrituras, 0,01 USD por 100 000 eliminaciones. <https://cloud.google.com/firestore/pricing> [V]. Precio en São Paulo: [NV] (la tabla exige elegir la región de forma interactiva y no se capturó).
- Solo una base de datos Firestore por proyecto tiene cuota sin costo. <https://firebase.google.com/docs/firestore/pricing> [V]
- Blaze es obligatorio para Cloud Functions y para productos pagos de Google Cloud. Las alertas de presupuesto "do not cap your usage or charges". <https://firebase.google.com/docs/projects/billing/firebase-pricing-plans> [V]
- Existen "spend caps" que pausan el servicio el resto del mes al alcanzar el presupuesto, solo para Firebase AI Logic, App Hosting, Cloud Functions y Extensions (no para Firestore). <https://firebase.google.com/docs/projects/billing/avoid-surprise-bills> [V]
- Estimación de uso: 3000 usuarios que abren la app una vez al día y leen 100 documentos cada vez suman 300 000 lecturas/día; descontadas las 50 000 sin costo quedan ~7,5 M al mes, es decir ~2,25 USD/mes a precio de Iowa. [E] (los supuestos de uso son propios, no medidos).

**Capacidades**

- Roles: custom claims asignados "only ... from a privileged server environment by the Firebase Admin SDK", con un máximo de 1000 bytes; se propagan cuando el cliente renueva su token. <https://firebase.google.com/docs/auth/admin/custom-claims> [V]. Asignarlos exige entonces Cloud Functions (Blaze) u otro servidor. [E]
- Acceso sin login: las reglas de seguridad admiten lectura pública con escritura restringida; son "the only safeguard blocking access for malicious users". <https://firebase.google.com/docs/rules/basics> [V]
- App Check atestigua que las solicitudes provienen de la app (DeviceCheck y App Attest en iOS, Play Integrity en Android) y protege Firestore y las funciones invocables, entre otros. <https://firebase.google.com/docs/app-check> [V]
- Autenticación anónima opcional; con Identity Platform se pueden borrar automáticamente las cuentas anónimas de más de 30 días. <https://firebase.google.com/docs/auth/android/anonymous-auth> [V]
- Geografía: Firestore no ordena por distancia. La solución documentada guarda un geohash, lanza varias consultas por rango y filtra falsos positivos en el cliente. <https://firebase.google.com/docs/firestore/solutions/geoqueries> [V]
- Alternativa relacional: Firebase SQL Connect (PostgreSQL en Cloud SQL): prueba sin costo de 3 meses y luego "starting as low as $9.37 / month"; 250 000 operaciones/mes sin costo en Blaze. <https://firebase.google.com/docs/sql-connect/pricing> [V]. Soporte de PostGIS en SQL Connect: [NV].
- Tareas programadas: `onSchedule`; requiere Blaze; cada tarea de Cloud Scheduler cuesta 0,10 USD/mes y hay tres sin cargo por cuenta de Google. <https://firebase.google.com/docs/functions/schedule-functions> [V]
- Push: FCM envía a dispositivos individuales, grupos o temas, mediante Admin SDK o la API HTTP v1. <https://firebase.google.com/docs/cloud-messaging> [V]
- Región: Firestore en `southamerica-east1` (São Paulo) y `southamerica-west1` (Santiago); la ubicación no se puede cambiar una vez creada la base. <https://firebase.google.com/docs/firestore/locations> [V]

**Portabilidad**

- No hay autoalojamiento: "Do not attempt to use these emulators as 'self-hosted' versions of Firebase services." <https://firebase.google.com/docs/emulator-suite> [V]
- Exportación gestionada de Firestore a Cloud Storage: requiere Blaze, cobra una lectura por documento exportado y el resultado se puede cargar en BigQuery. <https://firebase.google.com/docs/firestore/manage-data/export-import> [V]
- El modelo de documentos y el lenguaje de reglas de seguridad son propios de Firebase; no hay SQL estándar salvo en SQL Connect. [E] (caracterización propia a partir de la documentación citada).

### Appwrite

**Precios y límites** (fuente: <https://appwrite.io/pricing>, tabla "Compare plans")

- Free, 0 USD: 5 GB de ancho de banda/mes, 2 GB de almacenamiento, 750 000 ejecuciones/mes, 100 GB-hora, 75 000 MAU, 500 000 lecturas y 250 000 escrituras/mes, 1 base de datos, 1 bucket y 2 funciones por proyecto, **1 miembro de organización**, 2 proyectos, sin copias de seguridad, Messaging limitado a **1000 mensajes/mes y 1 tema**. "Free projects are paused after 1 week of inactivity." [V]
- Pro, desde 25 USD/mes: 2 TB de ancho de banda (luego 15 USD por 100 GB), 150 GB de almacenamiento, 3,5 M de ejecuciones (luego 2 USD por millón), 1000 GB-hora, 200 000 MAU (luego 3 USD por 1000 usuarios), 1,75 M de lecturas y 750 000 escrituras/mes (luego 0,06 y 0,10 USD por 100 000), miembros ilimitados, copias diarias con retención de 7 días, Messaging ilimitado, sin pausa, topes de presupuesto. Incluye 1 proyecto; cada proyecto adicional cuesta 15 USD. [V]
- Bases de datos dedicadas desde 10 USD/mes (1 núcleo, 1 GB), con 10 USD mensuales de crédito de cómputo de base de datos incluidos. [V]
- La documentación de facturación indica otros límites para Free (3 buckets y 5 funciones por proyecto) que no coinciden con la página de precios. <https://appwrite.io/docs/advanced/billing/free> [V]. Cuál de los dos valores rige hoy: [NV].
- Al superar los límites de Free: se deniega el acceso a la API (ancho de banda), se deshabilita el alta de cuentas (usuarios) y la ejecución de funciones (cómputo). <https://appwrite.io/docs/advanced/billing/free> [V]

**Capacidades**

- Permisos: `Role.any()`, `Role.guests()`, `Role.users()`, `Role.user(ID)`, `Role.team(ID, rol)`, `Role.label(nombre)`, aplicados por recurso (base, tabla, fila, bucket, archivo). Un recurso creado con el SDK de servidor no es accesible para nadie por defecto. <https://appwrite.io/docs/advanced/platform/permissions> [V]
- Etiquetas de usuario para otorgar acceso por rol. <https://appwrite.io/docs/products/auth/labels> [V]. Que solo puedan asignarse desde el servidor: [NV].
- Sesiones anónimas opcionales; un usuario anónimo no puede volver a iniciar sesión si la pierde. <https://appwrite.io/docs/products/auth/anonymous> [V]
- Geografía: columnas Point, Line y Polygon con índices espaciales. <https://appwrite.io/docs/products/databases/geo-queries> [V]. Operadores `distanceEqual`, `distanceLessThan`, `distanceGreaterThan`; los operadores de orden (`orderAsc`, `orderDesc`, `orderRandom`) trabajan sobre columnas, y no se documenta ordenar por distancia a un punto. <https://appwrite.io/docs/products/databases/queries> [V]
- Las instancias autoalojadas con MongoDB no soportan columnas ni índices espaciales. <https://appwrite.io/docs/products/databases/geo-queries> [V]
- Funciones: ejecución síncrona con límite de 30 s; ejecuciones asíncronas por eventos y por "Scheduled executions (cron jobs or delayed executions)". <https://appwrite.io/docs/products/functions/execute> [V]. Sintaxis e intervalo mínimo del cron: [NV].
- Push: Messaging con proveedores FCM y APNs, temas y destinos. <https://appwrite.io/docs/products/messaging> [V]. Si un envío a un tema cuenta como un mensaje o como uno por destinatario para el límite de 1000 del plan Free: [NV].
- Regiones de Cloud: Fráncfort, Nueva York, Sídney, San Francisco, Singapur, Toronto. Ninguna en Sudamérica. <https://appwrite.io/docs/products/network/regions> [V]

**Portabilidad**

- Licencia BSD de 3 cláusulas. <https://github.com/appwrite/appwrite/blob/main/LICENSE> [V]
- Autoalojamiento con Docker: mínimo 2 núcleos, 4 GB de RAM y 2 GB de swap; base a elegir entre PostgreSQL (por defecto), MariaDB o MongoDB. <https://appwrite.io/docs/advanced/self-hosting/installation> [V]
- Migraciones entre Cloud y autoalojado en ambos sentidos; las funciones y las bases complejas pueden requerir migración manual, y los campos de sistema como `$createdAt` no se transfieren con exactitud. <https://appwrite.io/docs/advanced/migrations> [V]
- El acceso a datos es mediante SDK y operadores de consulta propios, no SQL. [E] (caracterización propia a partir de la documentación de consultas).

### Convex

**Precios y límites** (fuentes: <https://www.convex.dev/pricing> y <https://docs.convex.dev/production/state/limits>)

- Free y Starter, 0 USD/mes: 1 M de llamadas a funciones (luego 2,20 USD por millón), 20 GB-hora de actions (luego 0,33 USD), 0,5 GB de base (luego 0,22 USD/GB), 1 GB de archivos, 1 GB de E/S de base de datos y 1 GB de egreso al mes, 1 a 6 miembros, 40 despliegues. "Free plan has built-in resources. Starter plan is pay-as-you-go beyond free tier limits." [V]
- Professional, 25 USD por desarrollador/mes: 25 M de llamadas, 250 GB-hora, 50 GB de base, 100 GB de archivos, 1 a 20 miembros. [V]
- Con dos desarrolladores: 50 USD/mes. [E]
- Al superar los límites del plan gratuito, las mutaciones nuevas "may fail". [V]
- Regiones: US East (precio estándar), Irlanda, Sídney y Canadá con recargo del 30 %; un despliegue no se puede mover de región. Ninguna en Sudamérica. <https://docs.convex.dev/production/regions> [V]

**Capacidades**

- Autenticación: Convex Auth "is in beta (it isn't complete and may change in backward-incompatible ways)"; admite contraseñas, OAuth, enlaces mágicos y OTP, y aplicaciones React Native. Alternativas: Clerk, WorkOS AuthKit, Auth0. <https://docs.convex.dev/auth> y <https://labs.convex.dev/auth> [V]. Costo de los proveedores externos: no investigado.
- Autorización y acceso sin login: "By default your Convex functions are public and accessible to clients"; la lógica que no debe llamarse desde el cliente va en funciones internas. <https://docs.convex.dev/functions/internal-functions> [V]. `ctx.auth.getUserIdentity()` devuelve `null` sin sesión, y cada función debe comprobarlo. <https://docs.convex.dev/auth/functions-auth> [V]
- Geografía: componente geoespacial mantenido por Convex, "currently in beta. It's missing some functionality", probado hasta ~1 000 000 de puntos. <https://www.convex.dev/components/geospatial> [V]. Ofrece `nearest` con `point`, `limit`, `maxDistance` y filtros. <https://github.com/get-convex/geospatial> [V]
- Tareas programadas: `crons.ts` con intervalos de segundos o sintaxis cron; a lo sumo una ejecución simultánea por tarea. <https://docs.convex.dev/scheduling/cron-jobs> [V]. Funciones agendadas con `runAfter`/`runAt`, "exactly once" para mutaciones y "at most once" para actions. <https://docs.convex.dev/scheduling/scheduled-functions> [V]
- Funciones de servidor: las actions llaman a servicios de terceros; límite de 10 minutos; no se reintentan automáticamente. <https://docs.convex.dev/functions/actions> [V]
- Push: componente oficial sobre la API de Expo Push, con reintentos y lotes de hasta 100 notificaciones. <https://www.convex.dev/components/push-notifications> [V]

**Portabilidad**

- Backend de código abierto con licencia FSL-1.1 y licencia futura Apache 2.0 a los dos años; prohíbe el "Competing Use". <https://github.com/get-convex/convex-backend/blob/main/LICENSE.md> [V]
- Autoalojamiento con Docker; SQLite por defecto, Postgres o MySQL opcionales; soporte comunitario. <https://github.com/get-convex/convex-backend/blob/main/self-hosted/README.md> y <https://docs.convex.dev/self-hosting> [V]
- Exportación: `npx convex export` genera un ZIP; hay exportación en streaming con integraciones de terceros. <https://docs.convex.dev/database/import-export/export> [V]
- Las reglas de negocio se escriben como funciones TypeScript contra la API de Convex; no hay SQL. [E] (caracterización propia a partir de la documentación de funciones).

### Referencia: servidor propio pequeño

Sirve solo como referencia de costo. En todos los casos hay que construir u operar por cuenta propia la autenticación, el envío de push, las tareas programadas, las actualizaciones y las copias de seguridad; ese trabajo no está valorado aquí.

- **Fly.io** (<https://docs.fly.io/about/pricing>): `shared-cpu-1x` a 2,19 USD/mes (256 MB), 3,69 USD (512 MB) y 6,70 USD (1 GB) en la región base; São Paulo aplica un multiplicador de ~1,615. Volúmenes 0,15 USD/GB/mes; IPv4 dedicada 2 USD/mes; egreso en Sudamérica 0,04 USD/GB. Managed Postgres desde 38 USD/mes más 0,28 USD/GB. No hay plan gratuito permanente (prueba de hasta 2 horas de máquina o 7 días). [V]
  - Región `gru` (São Paulo) activa y con Managed Postgres. <https://docs.fly.io/reference/regions> [V]
  - Managed Postgres admite PostGIS si se activa al aprovisionar. <https://docs.fly.io/postgres/> [V]
  - Dos máquinas de 512 MB en `gru` (aplicación y Postgres sin gestionar), 10 GB de volumen e IPv4: ~15,4 USD/mes. [E]
- **Railway** (<https://railway.com/pricing>): Hobby 5 USD/mes con 5 USD de uso incluido; Pro 20 USD/mes con 20 USD incluidos. Uso: ~10 USD por GB de RAM/mes, ~20 USD por vCPU/mes, 0,15 USD/GB de volumen, 0,05 USD/GB de egreso. Prueba única de 5 USD por 30 días. [V]
  - Postgres es una plantilla **no gestionada**; PostGIS no viene en la plantilla por defecto, aunque existe una plantilla aparte. <https://docs.railway.com/guides/postgresql> [V]
  - Regiones: EE. UU. oeste y este, Ámsterdam, Singapur. Ninguna en Sudamérica. <https://docs.railway.com/reference/deployment-regions> [V]
  - Aplicación y Postgres con 0,5 GB de RAM cada uno, siempre encendidos y con poco uso de CPU: ~10 a 15 USD/mes. [E]
- **VPS**:
  - AWS Lightsail (<https://aws.amazon.com/lightsail/pricing/>): 5 USD/mes (0,5 GB), 7 USD (1 GB), 12 USD (2 GB) con IPv4; São Paulo mantiene el precio e incluye la mitad de la transferencia. Base de datos gestionada desde 15 USD/mes. [V]
  - DigitalOcean (<https://www.digitalocean.com/pricing/droplets>): 4 USD/mes (512 MiB), 6 USD (1 GiB), 12 USD (2 GiB). La página no lista centros de datos en Sudamérica. [V]
  - Hetzner Cloud: centros de datos en Alemania, Finlandia, EE. UU. y Singapur, ninguno en Sudamérica (<https://www.hetzner.com/cloud>) [V]. Precios: [NV] (la página no los mostró al leerla).

### Servicios de push externos

- Expo Push: "There is no cost associated with sending notifications through Expo push notification service"; límite de 600 notificaciones por segundo por proyecto. <https://docs.expo.dev/push-notifications/faq/> [V]
- FCM: sin costo en Spark y Blaze. <https://firebase.google.com/pricing> [V]. Puede usarse como servicio de push con cualquiera de los otros backends.

## Observaciones que cruzan proveedores

- Con 100 a 200 iglesias, ordenar por distancia puede resolverse también en el cliente o en una función de servidor, descargando la lista completa y calculando la distancia. Esto reduce el peso del criterio "vecino más cercano" para esta escala, pero no lo elimina si el catálogo crece (por ejemplo, al sumar el nivel de unión). [E]
- El chat con IA para usuarios sin login implica una función de servidor invocable de forma anónima. El control de abuso (límite de solicitudes, atestación de la app) depende de cada proveedor y no fue verificado en detalle. Ver vacíos.

## Vacíos abiertos

1. **Costo real medido.** Todas las cifras mensuales para este proyecto son estimaciones; no hay datos de uso real (lecturas por sesión, tamaño de la base, volumen de push).
2. **Appwrite:** si un envío a un tema cuenta como uno o como N mensajes frente al límite de 1000/mes del plan Free; discrepancia entre la página de precios y la documentación sobre funciones y buckets por proyecto en Free; sintaxis e intervalo mínimo del cron; si existe alguna forma de ordenar por distancia.
3. **Supabase:** si los usuarios anónimos cuentan como MAU; disponibilidad de Supabase Cron en el plan Free; licencias de cada componente individual.
4. **Firebase:** precio de Firestore en São Paulo; soporte de PostGIS en SQL Connect; región de Cloud Functions más cercana a Argentina.
5. **Convex:** costo de un proveedor de autenticación externo si no se usa Convex Auth (beta); latencia real desde Argentina hacia US East.
6. **Latencia** desde Argentina hacia cada región: no medida para ningún proveedor.
7. **Límite de abuso para llamadas anónimas** a la función que consulta la IA: no verificado por proveedor.
8. **Hetzner:** precios no capturados.
9. **Aspectos legales** (ubicación de los datos, Ley 25.326 de protección de datos personales en Argentina): fuera del alcance de este ticket.
10. **Precios en moneda local e impuestos** aplicables a pagos desde Argentina: no investigados.
