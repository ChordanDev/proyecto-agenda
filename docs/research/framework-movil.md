# Opciones de framework móvil para dos desarrolladores

- **Ticket:** [#5](https://github.com/ChordanDev/proyecto-agenda/issues/5)
- **Fecha de consulta de todas las fuentes:** 2026-10-06
- **Alcance:** comparación con fuentes. Este documento **no elige** un framework; la decisión corresponde a un ticket posterior.

**Cómo leerlo.** Cada afirmación lleva una referencia (`[E5]`, `[F2]`, etc.) que enlaza a la página que la sostiene; la lista completa está en [Fuentes](#fuentes). Lo marcado como **Juicio** es interpretación propia, no un hecho de la fuente. Lo marcado como **No verificado** no pudo confirmarse en una fuente primaria.

**Método y límites.** Se consultó documentación oficial, notas de versión y la documentación propia de cada biblioteca. La mayoría de las páginas se leyó mediante una herramienta que extrae y resume el contenido, por lo que las citas textuales pueden tener diferencias menores con el original. Las versiones y fechas se contrastaron además contra los registros (npm, pub.dev, API de GitHub, feed de versiones de Flutter). No se construyó ningún prototipo ni se probó nada en dispositivos.

## Resumen

1. Las tres opciones multiplataforma pedidas permiten una sola base de código para iOS y Android y tienen versión estable vigente: Expo SDK 57 (React Native 0.86) [V1], Flutter 3.47.6 [V6] y Kotlin 2.4.20 con Compose Multiplatform 1.12.1 [V7] [V8]. Kotlin Multiplatform y Compose Multiplatform figuran como estables en Android e iOS [V9].
2. Las seis capacidades del ticket son alcanzables en las tres, pero con distinto origen: Expo ofrece módulos propios para notificaciones y ubicación [E5] [E7]; Flutter las cubre con paquetes de pub.dev (tres de los cuatro revisados tienen editor verificado) [F1] [F3] [F5] [F6]; en Kotlin Multiplatform dependen de bibliotecas de la comunidad o de código propio por plataforma [K2] [K3] [K4] [K7].
3. La voz a texto es el punto más débil y es común a todas: las bibliotecas revisadas envuelven los motores del sistema operativo, pensados para frases cortas [E8] [F5] [N1] [N3]. En Kotlin Multiplatform la única biblioteca encontrada tiene 20 estrellas y su última versión es de junio de 2025 [K6]. El soporte de español de Argentina no pudo verificarse en ninguna opción.
4. En accesibilidad, React Native y Flutter documentan lectores de pantalla y escalado de fuente activado por defecto [E9] [E10] [F7] [F8]. Compose Multiplatform documenta VoiceOver en iOS [K9], pero el soporte de Dynamic Type de iOS aparece en las notas de la versión 1.13.0-alpha01, que no es estable [K10] [K11].
5. En compilación y publicación, Expo es la única opción revisada cuya documentación ofrece compilar y enviar iOS sin una Mac propia (EAS Build y EAS Submit) [E11] [E13]. Flutter y Kotlin Multiplatform exigen macOS con Xcode para iOS [F10] [K14], propio o mediante un servicio de integración continua [F12] [F15] [S6].
6. Hay requisitos de tienda que no dependen del framework y afectan el cronograma de diciembre; se listan en [Requisitos de tiendas](#requisitos-de-tiendas-independientes-del-framework).

## Versiones estables al 2026-10-06

| Tecnología | Versión estable | Fecha | Próxima versión en curso | Fuente |
|---|---|---|---|---|
| Expo SDK | 57 (paquete `expo` 57.0.27), incluye React Native 0.86 y React 19.2.3 | SDK 57 publicado el 2026-06-30 | SDK 58 en beta desde el 2026-09-15 | [V1] [V2] [V3] |
| React Native | 0.87 (0.87.1) | 0.87.0 el 2026-08-11; 0.87.1 el 2026-08-26 | 0.88.0-rc.3 (2026-09-28) | [V4] [V5] [E21] |
| Flutter | 3.47.6 (Dart 3.13.5) | 2026-10-01 | 3.50 previsto para noviembre de 2026 | [V6] |
| Kotlin | 2.4.20 | 2026-09-07 | No consultado | [V7] |
| Compose Multiplatform | 1.12.1 (basado en Jetpack Compose 1.12.1) | 2026-09-22 | 1.13.0-alpha02 (2026-10-06) | [V8] [V10] |

Notas:

- Expo SDK 57 no incluye la última versión de React Native (0.87), sino la 0.86 [V1]. La versión de React Native que traerá SDK 58 no se verificó.
- Las tres opciones tienen una versión nueva en curso que caería dentro de la ventana de desarrollo (octubre a diciembre de 2026). **Juicio:** conviene que la decisión incluya si se fija la versión actual o se migra durante el proyecto.

## Tabla comparativa

| Criterio | React Native + Expo | Flutter | Kotlin Multiplatform + Compose Multiplatform | Nativo, dos bases de código (referencia) |
|---|---|---|---|---|
| **Lenguaje e interfaz** | TypeScript/JavaScript con React. La documentación de React Native recomienda usar un framework y nombra a Expo [E1]. | Dart, con widgets propios de Flutter. | Kotlin. En Android usa los artefactos de Jetpack Compose de Google; en el resto, bibliotecas mantenidas por JetBrains [K1]. | Swift en iOS y Kotlin en Android; cada pantalla se escribe dos veces. |
| **Calendario mensual con marcadores de forma y color** | `react-native-calendars` (Wix): tipos de marcado `dot`, `multi-dot`, `period`, `multi-period` y `custom`, y la propiedad `dayComponent` para reemplazar la celda del día [E2]. Es JavaScript puro, sin código nativo [E3]. Última versión 1.1314.0, del 2026-01-29 [E3]. | `table_calendar` 3.3.0 (2026-10-01): `markerBuilder` y `singleMarkerBuilder` permiten dibujar marcadores propios por día [F1] [F2]. Editor no verificado en pub.dev [F1]. | `kizitonwose/Calendar` 2.10.1 (2026-03-28): admite Compose Multiplatform en Android e iOS y deja el dibujo de cada día al desarrollador [K2]. Su tabla de compatibilidad llega a Compose 1.11.x [K2]. | Cada plataforma por separado. `kizitonwose/Calendar` sirve para Android [K2]; el lado iOS no se investigó. |
| **Notificaciones locales y push** | `expo-notifications` (módulo propio de Expo): programación local por fecha o intervalo y push con tokens FCM, APNs o de Expo [E5]. Push en Android no funciona en Expo Go desde SDK 53; requiere compilación de desarrollo [E5]. | Locales: `flutter_local_notifications` 22.3.1, editor verificado, con `zonedSchedule` [F3]. Push: `firebase_messaging`, documentado por Firebase [F4]. | `KMPNotifier` 2.0.1 (comunidad): push con Firebase en Android e iOS y notificaciones locales programables con `scheduledAt` [K3]. Alternativa: código propio por plataforma con `expect`/`actual` [K7]. | API del sistema en cada plataforma. |
| **Voz a texto en español** | No hay módulo propio de Expo. `expo-speech-recognition` 57.1.0 (comunidad, 689 estrellas) usa `SFSpeechRecognizer` en iOS y `SpeechRecognizer` en Android; idioma por parámetro `lang`; requiere compilación de desarrollo [E8]. | `speech_to_text` 7.5.0, editor verificado; idioma por `localeId`; orientado a "commands and short phrases" [F5]. | Sin biblioteca oficial. `speechtotextkit` 1.0.0 (20 estrellas, última versión 2025-06-02) declara soporte de más idiomas como pendiente [K6]. Alternativa: `expect`/`actual` sobre las API nativas [K7]. | `SFSpeechRecognizer` (o `SpeechAnalyzer` desde iOS 26) y `SpeechRecognizer` de Android [N1] [N2] [N3]. |
| **Geolocalización** | `expo-location` (módulo propio): posición actual, última conocida, seguimiento y geocodificación [E7]. | `geolocator` 14.1.1, editor verificado (Baseflow): posición actual, última conocida y cálculo de distancia entre coordenadas [F6]. | `compass` 4.0.1 (comunidad): ubicación actual, geocodificación y permisos integrados [K4]. `moko-geo` 0.8.0 tiene su última versión en marzo de 2025 [K5]. | API del sistema en cada plataforma. |
| **Accesibilidad** | VoiceOver y TalkBack mediante propiedades como `accessibilityLabel` y `accessibilityRole` [E9]. `allowFontScaling` vale `true` por defecto; `maxFontSizeMultiplier` permite acotarlo [E10]. | TalkBack y VoiceOver; los tamaños de fuente "are calculated automatically by Flutter based on the OS setting" [F7] [F8]. Incluye pruebas automáticas de tamaño táctil y contraste [F9]. | VoiceOver en iOS mediante el árbol de semántica [K8] [K9]. Dynamic Type de iOS figura en las notas de 1.13.0-alpha01, no en las de 1.12.x [K10] [K11]. | Acceso completo a las API de accesibilidad de cada sistema. |
| **Compilación y publicación** | EAS Build compila iOS en la nube, sin Mac propia, y gestiona credenciales de firma [E11]. EAS Submit envía a ambas tiendas desde cualquier sistema operativo [E13]. Plan gratuito: 15 compilaciones Android y 15 iOS [E14]. | iOS exige macOS con Xcode; `flutter build ipa` y subida con Transporter, `altool` o Xcode [F10]. Android: firma manual con keystore y `flutter build appbundle` [F11]. | iOS exige macOS con Xcode [K14]. Android se publica igual que una app nativa; iOS sale de un proyecto Xcode convencional [K13]. | El mismo proceso que Kotlin Multiplatform, por duplicado y sin capa compartida. |
| **Velocidad de desarrollo** | Fast Refresh: "most edits should be visible within a second or two" [E20]. EAS Update distribuye cambios de JavaScript y recursos sin pasar por revisión de tienda [E17]. | Hot reload con estado preservado en dispositivos y emuladores en modo debug [F13]. | Compose Hot Reload solo para el destino de escritorio (JVM); Android e iOS no están soportados [K12]. | Dos implementaciones de cada funcionalidad. |

## Notas por framework

### React Native con Expo

**Hechos verificados**

- **Versión.** Expo SDK 57 incluye React Native 0.86 y exige Node 22.13 o superior. Soporta Android 7 o superior (compila y apunta a API 36) e iOS 16.4 o superior, con Xcode 26.4 o superior [V1].
- **Expo Go frente a compilación de desarrollo.** La documentación describe Expo Go como "a limited playground and not useful for building production-grade projects" y recomienda compilaciones de desarrollo para publicar en tiendas [E18] [E19]. Desde el 2026-09-03 se exige iniciar sesión para ejecutar proyectos en Expo Go [V2].
- **Calendario.** `react-native-calendars` ofrece cinco tipos de marcado y la propiedad `dayComponent` ("Replace default day with custom day rendering component") [E2]. Incluye `LocaleConfig` para nombres de meses y días, y lista la accesibilidad entre sus características [E3]. El repositorio tuvo actividad el 2026-10-05, pero la última versión publicada en npm es del 2026-01-29 [E3]. Existe una alternativa, `flash-calendar` 2.0.0 (2026-03-04, 1.507 estrellas) [E4].
- **Notificaciones.** `expo-notifications` programa notificaciones locales para una fecha o un intervalo, y obtiene tokens nativos (FCM, APNs) o tokens de Expo [E5]. Los disparadores por fecha e intervalo funcionan en ambas plataformas; los repetitivos varían por plataforma [E5]. En Android 12 o superior, programar a una hora exacta requiere el permiso `SCHEDULE_EXACT_ALARM` [E5]. Expo ofrece un servicio de push que intermedia con FCM y APNs [E6].
- **Voz.** `expo-speech-recognition` no es un paquete oficial de Expo. Expone `getSupportedLocales()` para consultar los idiomas disponibles en el dispositivo. El reconocimiento en el dispositivo funciona en iOS 17 o superior y Android 13 o superior, y en Android requiere descargar el modelo del idioma. El modo continuo no funciona en Android 12 o inferior [E8].
- **Ubicación.** `expo-location` cubre posición actual, última posición conocida, seguimiento y geocodificación en ambos sentidos. Agrega automáticamente los permisos de Android y requiere las claves de `Info.plist` en iOS [E7].
- **Accesibilidad.** React Native integra con VoiceOver y TalkBack [E9]. En iOS existe además `dynamicTypeRamp` para asociar un texto a una rampa de Dynamic Type [E10].
- **Compilación.** EAS Build indica que "iOS builds run on macOS runners hosted in Expo's macOS cloud" y que puede generar y administrar keystores, perfiles de aprovisionamiento y certificados [E11]. Se puede compilar localmente con `eas build --local` en macOS o Linux; Windows no está soportado [E16]. Las compilaciones para simulador de iOS no requieren la membresía paga de Apple [E12].
- **Costos de EAS.** Plan gratuito: 15 compilaciones Android y 15 iOS, cola de baja prioridad y actualizaciones para 1.000 usuarios activos mensuales [E14]; los límites se reinician cada mes y el plan gratuito no genera cargos por excedente [E15]. Plan Starter: 19 USD por mes con 45 USD de crédito de compilación [E14].
- **Actualizaciones.** EAS Update no puede cambiar código nativo, permisos ni la versión del SDK; esos cambios requieren una compilación nueva [E17].

**Juicio**

- Los tipos de marcado incluidos (`dot`, `multi-dot`) resuelven el color pero no las cuatro formas del proyecto (círculo, triángulo, semicírculo, cuadrado); para eso habría que usar `dayComponent` y dibujar las formas.
- El uso de voz y de push obliga a trabajar con compilaciones de desarrollo desde el inicio, lo que consume cupo de compilaciones del plan gratuito salvo que se compile localmente.

**No verificado**

- Compatibilidad de `react-native-calendars` 1.1314.0 con React Native 0.86.
- Si el servicio de push de Expo tiene costo o límites de envío; la página consultada no lo indica [E6].
- Si las compilaciones locales descuentan del cupo mensual [E16].

### Flutter

**Hechos verificados**

- **Versión.** Flutter 3.47.6 con Dart 3.13.5 [V6]. Soporta Android API 24 a 37 e iOS 15 a 27 [V11]. El calendario de versiones prevé una estable aproximadamente cada tres meses [V6].
- **Calendario.** `table_calendar` describe "Custom selective builders for unlimited UI design". `markerBuilder` sirve para "provide your own marker UI for each day cell" y `singleMarkerBuilder` dibuja cada marcador individual [F1] [F2]. El idioma se configura con el paquete `intl` [F1]. En pub.dev figura con 3.320 "likes" y editor no verificado [F1].
- **Notificaciones.** `flutter_local_notifications` programa con `zonedSchedule` y zonas horarias. Su documentación advierte que iOS conserva solo las últimas 64 notificaciones programadas, que algunos fabricantes de Android pueden impedir que se disparen, y que reprogramar tras un reinicio requiere `RECEIVE_BOOT_COMPLETED` [F3]. Para push, Firebase documenta `firebase_messaging`: hay que subir la clave de autenticación de APNs y activar en Xcode las capacidades de notificaciones push y modos en segundo plano; en Android requiere Google Play Services [F4].
- **Voz.** `speech_to_text` está dirigido a "commands and short phrases, not continuous spoken conversion or always on listening". Advierte que en Android el reconocimiento se corta ante pausas breves [F5].
- **Ubicación.** `geolocator` consulta y solicita permisos, obtiene posición actual y última conocida, y calcula la distancia en metros entre dos coordenadas [F6].
- **Accesibilidad.** Flutter declara "first-class framework support for accessibility" [F7]. Recomienda objetivos táctiles de 48x48 dp en Android y 44x44 pt en iOS [F8], y ofrece `androidTapTargetGuideline`, `iOSTapTargetGuideline`, `labeledTapTargetGuideline` y `textContrastGuideline` para verificarlo en pruebas automáticas [F9].
- **Compilación.** "Xcode is required to build and release your app. You must use a device running macOS" [F10]. Para Android, la firma se configura a mano en Gradle [F11]. La documentación lista fastlane, Codemagic, Bitrise, Appcircle, Xcode Cloud y GitHub Actions como opciones de entrega continua [F12]. Codemagic ofrece 500 minutos gratuitos por mes en macOS M2 para cuentas individuales [F15]; Xcode Cloud incluye 25 horas de cómputo por mes con la membresía de Apple [S6].
- **Iteración.** El hot reload preserva el estado y solo funciona en modo debug. Los cambios en código nativo requieren reinicio completo [F13].
- **Acceso a API nativas.** Mediante canales de plataforma o complementos [F14].

**Juicio**

- Las formas de los cuatro énfasis pueden dibujarse dentro de `markerBuilder` con cualquier widget; el esfuerzo es comparable al de `dayComponent` en React Native.
- Las cuatro capacidades de dispositivo dependen de paquetes de terceros; tres de ellos tienen editor verificado y versión publicada en septiembre de 2026 [F3] [F5] [F6].
- El límite de 64 notificaciones pendientes en iOS es una restricción del sistema, por lo que afectaría también a las otras opciones; solo se encontró documentado en esta fuente.

**No verificado**

- El nivel de API de destino que Flutter 3.47 configura por defecto en un proyecto nuevo.
- La versión mínima de Xcode que exige Flutter 3.47; la guía de despliegue no la indica [F10].

### Kotlin Multiplatform con Compose Multiplatform

**Hechos verificados**

- **Versión y estabilidad.** Kotlin 2.4.20 [V7] y Compose Multiplatform 1.12.1 [V8]. La tecnología base y la interfaz Compose figuran como "Stable" en Android e iOS [V9]. La última versión de Compose Multiplatform es siempre compatible con la última de Kotlin [V10].
- **Relación con Jetpack Compose.** Comparte compilador, runtime y API con Jetpack Compose. En Android se usan directamente los artefactos de Google [K1].
- **Calendario.** `kizitonwose/Calendar` (5.611 estrellas) declara que "The library provides the logic, you provide the views/composables" y soporta Android, iOS, JS, WasmJs y escritorio [K2].
- **Notificaciones.** `KMPNotifier` (664 estrellas) ofrece push con Firebase Cloud Messaging en Android e iOS, y notificaciones locales programadas con `AlarmManager` en Android [K3].
- **Voz.** `speechtotextkit` es la única biblioteca multiplataforma encontrada; su README lista "Support for more languages and dialects" como característica futura [K6]. El mecanismo oficial para acceder a API de plataforma es `expect`/`actual`, que permite llamar a los frameworks de iOS desde Kotlin [K7].
- **Ubicación.** `compass` 4.0.1 (2026-10-02) eliminó la dependencia de Google Play Services en Android y usa `LocationManager` [K4].
- **Accesibilidad.** En iOS, "Screen readers and VoiceOver can access the content of the Compose Multiplatform UI"; los datos de semántica se asignan a objetos nativos de accesibilidad y pueden auditarse con `performAccessibilityAudit()` de XCTest [K9]. La página de accesibilidad de iOS no menciona Dynamic Type ni escalado de fuente [K9]. Las notas de 1.13.0-alpha01 incluyen "Support iOS Dynamic Type font scaling based on accessibility settings" [K10]; el cambio correspondiente se integró el 2026-08-25 y corrige que `LocalDensity.fontScale` no se actualizaba en vivo [K11]. Las notas de 1.12.0 y 1.12.1 no lo mencionan [V8].
- **Compilación.** "To create iOS applications, you need a macOS machine with Xcode installed" [K14]. La publicación de Android no difiere de la de una app nativa, y la de iOS parte de un proyecto Xcode convencional [K13]. Para automatizar, la documentación remite a una canalización con TeamCity [K13].
- **Iteración.** Compose Hot Reload viene incluido desde Compose Multiplatform 1.10.0 para proyectos con destino de escritorio, y requiere JetBrains Runtime [K12].

**Juicio**

- Es la opción con más código propio previsible para la voz a texto, por la falta de una biblioteca madura.
- Para iterar con hot reload habría que mantener un destino de escritorio que sirva de entorno de prueba de la interfaz compartida, como sugiere la propia documentación [K12].
- El estado de Dynamic Type en la versión estable 1.12.1 es relevante para un público que incluye adultos mayores y debería comprobarse en un dispositivo antes de decidir.

**No verificado**

- Cómo se comporta exactamente el tamaño de fuente del sistema en iOS con Compose Multiplatform 1.12.1.
- Compatibilidad de `kizitonwose/Calendar` 2.10.1 con Compose Multiplatform 1.12.x; su tabla llega a 1.11.x [K2].
- Fecha de publicación estable de Compose Multiplatform 1.13.

### Nativo en dos bases de código (solo referencia)

- Da acceso directo a las API que las bibliotecas multiplataforma envuelven: `SFSpeechRecognizer` [N1], `SpeechAnalyzer` (disponible desde iOS 26) [N2] y `SpeechRecognizer` de Android [N3].
- El proceso de publicación es el mismo que describe Kotlin Multiplatform para cada plataforma [K13].
- **Juicio:** con dos desarrolladores, cada pantalla y cada regla de negocio se implementaría dos veces. No se investigó más allá de servir como punto de comparación.

## Voz a texto: límites comunes a todas las opciones

Las bibliotecas revisadas delegan en los motores del sistema operativo, por lo que estas restricciones aplican sin importar el framework:

- **iOS.** `SFSpeechRecognizer` admite un solo idioma por instancia. Algunos idiomas pueden requerir conexión a Internet. Hay límites de uso por dispositivo y por app, y las tareas de reconocimiento se detienen al superar un minuto de audio [N1].
- **Android.** La documentación de `SpeechRecognizer` indica que la implementación "is likely to stream audio to remote servers" [N3].
- **Español de Argentina.** La página de disponibilidad de funciones de iOS lista el dictado para español de Chile, Colombia, México, España y Estados Unidos; Argentina no aparece [N4]. Esa página describe el dictado del teclado, no la lista de idiomas de `SFSpeechRecognizer`, por lo que es solo un indicio.

**Juicio:** las órdenes del chat descritas en el brief ("Cargame un culto joven el sábado 17 a las 19 h") son frases cortas y caben en el uso previsto de estos motores. Una alternativa independiente del framework es grabar el audio y transcribirlo en un servicio externo; no se investigó en este ticket.

## Requisitos de tiendas independientes del framework

| Requisito | Detalle | Fuente |
|---|---|---|
| SDK mínimo de Apple | Desde el 2026-04-28, las apps deben compilarse con Xcode 26 o superior y un SDK de iOS 26 | [S1] |
| Nivel de API de Google Play | Desde el 2026-08-31, las apps nuevas deben apuntar a Android 16 (API 36) o superior | [S2] |
| Prueba cerrada en Google Play | Las cuentas personales creadas después del 2023-11-13 deben realizar una prueba cerrada con al menos 12 testers durante 14 días continuos antes de publicar | [S3] [S5] |
| Costo de Apple Developer Program | 99 USD por año. Existe exención para organizaciones sin fines de lucro que no vendan contenido en sus apps | [S4] |
| Costo de Google Play | 25 USD, pago único | [S5] |

Expo SDK 57 ya cumple ambos mínimos (Xcode 26.4, API de destino 36) [V1]. Para Flutter y Kotlin Multiplatform no se verificaron los valores por defecto.

## Vacíos abiertos

1. **Español de Argentina en voz a texto.** No se pudo confirmar que `es-AR` esté soportado en iOS ni en Android. Hay que consultarlo en dispositivos reales (por ejemplo con `getSupportedLocales()` [E8] o el equivalente de cada biblioteca) y medir la calidad con frases del dominio.
2. **Dynamic Type en Compose Multiplatform 1.12.1.** Queda por comprobar en un iPhone con tamaño de texto aumentado.
3. **Equipamiento del equipo.** No se sabe si los dos desarrolladores disponen de una Mac. Flutter y Kotlin Multiplatform la exigen para iOS [F10] [K14]; con Expo puede sustituirse por EAS Build [E11].
4. **Experiencia previa del equipo** en TypeScript/React, Dart o Kotlin. Es el factor que más pesa en la velocidad de desarrollo y este documento no puede medirlo.
5. **Tipo de cuenta de Google Play.** Si la cuenta es personal y nueva, la prueba cerrada de 14 días condiciona la fecha de publicación [S3]. No se verificó de forma explícita que las cuentas de organización estén exentas.
6. **Exención de la cuota de Apple.** No se verificó si aplica a organizaciones de Argentina; la página consultada solo da ejemplos de Estados Unidos, la Unión Europea y China continental [S4].
7. **Cupo real de compilaciones.** No se estimó si 15 compilaciones mensuales por plataforma alcanzan para el ritmo del proyecto [E14].
8. **Fiabilidad de las notificaciones locales en Android.** Las restricciones de fabricantes y de alarmas exactas [E5] [F3] afectan a todas las opciones y requieren prueba en dispositivos reales.
9. **Compatibilidad de bibliotecas de calendario** con las versiones estables actuales (`react-native-calendars` con React Native 0.86; `kizitonwose/Calendar` con Compose 1.12.x).
10. **Accesibilidad de los componentes de calendario** con lector de pantalla. Ninguna de las tres bibliotecas se probó con VoiceOver ni TalkBack.
11. **Rendimiento, tamaño de la app y consumo.** Fuera del alcance de este ticket.
12. **Métricas de adopción** (estrellas, "likes") se citan como dato de contexto; no miden calidad ni continuidad del mantenimiento.

## Fuentes

Todas consultadas el 2026-10-06.

**Versiones**

- **V1** — Expo, versiones de SDK: <https://docs.expo.dev/versions/latest/>
- **V2** — Expo, registro de cambios: <https://expo.dev/changelog>
- **V3** — Registro npm del paquete `expo` (etiquetas `latest` y `next`): <https://registry.npmjs.org/expo>
- **V4** — React Native, versiones: <https://reactnative.dev/versions>
- **V5** — React Native, publicaciones en GitHub: <https://github.com/facebook/react-native/releases>
- **V6** — Flutter, archivo de SDK y calendario de versiones: <https://docs.flutter.dev/install/archive> (datos de versión en <https://storage.googleapis.com/flutter_infra_release/releases/releases_macos.json>)
- **V7** — Kotlin, versiones: <https://kotlinlang.org/docs/releases.html>
- **V8** — Compose Multiplatform, publicaciones en GitHub: <https://github.com/JetBrains/compose-multiplatform/releases>
- **V9** — Kotlin Multiplatform, plataformas y niveles de estabilidad: <https://kotlinlang.org/docs/multiplatform/supported-platforms.html>
- **V10** — Compose Multiplatform, compatibilidad y versiones: <https://kotlinlang.org/docs/multiplatform/compose-compatibility-and-versioning.html>
- **V11** — Flutter, plataformas soportadas: <https://docs.flutter.dev/reference/supported-platforms>

**React Native y Expo**

- **E1** — React Native, primeros pasos: <https://reactnative.dev/docs/environment-setup>
- **E2** — react-native-calendars, componente Calendar: <https://wix.github.io/react-native-calendars/docs/Components/Calendar>
- **E3** — react-native-calendars, repositorio: <https://github.com/wix/react-native-calendars>
- **E4** — flash-calendar, repositorio: <https://github.com/MarceloPrado/flash-calendar>
- **E5** — Expo, `expo-notifications`: <https://docs.expo.dev/versions/latest/sdk/notifications/>
- **E6** — Expo, notificaciones push: <https://docs.expo.dev/push-notifications/overview/>
- **E7** — Expo, `expo-location`: <https://docs.expo.dev/versions/latest/sdk/location/>
- **E8** — expo-speech-recognition, repositorio: <https://github.com/jamsch/expo-speech-recognition>
- **E9** — React Native, accesibilidad: <https://reactnative.dev/docs/accessibility>
- **E10** — React Native, componente Text: <https://reactnative.dev/docs/text>
- **E11** — Expo, EAS Build: <https://docs.expo.dev/build/introduction/>
- **E12** — Expo, primera compilación con EAS Build: <https://docs.expo.dev/build/setup/>
- **E13** — Expo, EAS Submit: <https://docs.expo.dev/submit/introduction/>
- **E14** — Expo, precios: <https://expo.dev/pricing>
- **E15** — Expo, planes de facturación: <https://docs.expo.dev/billing/plans/>
- **E16** — Expo, compilaciones locales: <https://docs.expo.dev/build-reference/local-builds/>
- **E17** — Expo, EAS Update: <https://docs.expo.dev/eas-update/introduction/>
- **E18** — Expo, flujo de desarrollo: <https://docs.expo.dev/workflow/overview/>
- **E19** — Expo, compilaciones de desarrollo: <https://docs.expo.dev/develop/development-builds/introduction/>
- **E20** — React Native, Fast Refresh: <https://reactnative.dev/docs/fast-refresh>
- **E21** — React Native, blog de versiones: <https://reactnative.dev/blog>

**Flutter**

- **F1** — table_calendar en pub.dev: <https://pub.dev/packages/table_calendar>
- **F2** — table_calendar, clase CalendarBuilders: <https://pub.dev/documentation/table_calendar/latest/table_calendar/CalendarBuilders-class.html>
- **F3** — flutter_local_notifications en pub.dev: <https://pub.dev/packages/flutter_local_notifications>
- **F4** — Firebase, Cloud Messaging en Flutter: <https://firebase.google.com/docs/cloud-messaging/flutter/get-started>
- **F5** — speech_to_text en pub.dev: <https://pub.dev/packages/speech_to_text>
- **F6** — geolocator en pub.dev: <https://pub.dev/packages/geolocator>
- **F7** — Flutter, accesibilidad: <https://docs.flutter.dev/ui/accessibility>
- **F8** — Flutter, diseño y estilos accesibles: <https://docs.flutter.dev/ui/accessibility/ui-design-and-styling>
- **F9** — Flutter, pruebas de accesibilidad: <https://docs.flutter.dev/ui/accessibility/accessibility-testing>
- **F10** — Flutter, despliegue en iOS: <https://docs.flutter.dev/deployment/ios>
- **F11** — Flutter, despliegue en Android: <https://docs.flutter.dev/deployment/android>
- **F12** — Flutter, entrega continua: <https://docs.flutter.dev/deployment/cd>
- **F13** — Flutter, hot reload: <https://docs.flutter.dev/tools/hot-reload>
- **F14** — Flutter, canales de plataforma: <https://docs.flutter.dev/platform-integration/platform-channels>
- **F15** — Codemagic, precios: <https://codemagic.io/pricing/>

**Kotlin Multiplatform y Compose Multiplatform**

- **K1** — Compose Multiplatform y Jetpack Compose: <https://kotlinlang.org/docs/multiplatform/compose-multiplatform-and-jetpack-compose.html>
- **K2** — kizitonwose/Calendar, repositorio: <https://github.com/kizitonwose/Calendar>
- **K3** — KMPNotifier, repositorio: <https://github.com/mirzemehdi/KMPNotifier>
- **K4** — compass, repositorio: <https://github.com/jordond/compass>
- **K5** — moko-geo, repositorio: <https://github.com/icerockdev/moko-geo>
- **K6** — speechtotextkit, repositorio: <https://github.com/eslamwael74/speechtotextkit>
- **K7** — Kotlin Multiplatform, acceso a API de plataforma: <https://kotlinlang.org/docs/multiplatform/multiplatform-connect-to-apis.html>
- **K8** — Compose Multiplatform, accesibilidad: <https://kotlinlang.org/docs/multiplatform/compose-accessibility.html>
- **K9** — Compose Multiplatform, accesibilidad en iOS: <https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html>
- **K10** — Compose Multiplatform 1.13.0-alpha01, notas de versión: <https://github.com/JetBrains/compose-multiplatform/releases/tag/v1.13.0-alpha01>
- **K11** — compose-multiplatform-core, cambio 3306 (Dynamic Type en iOS): <https://github.com/JetBrains/compose-multiplatform-core/pull/3306>
- **K12** — Compose Hot Reload: <https://kotlinlang.org/docs/multiplatform/compose-hot-reload.html>
- **K13** — Kotlin Multiplatform, publicación de apps: <https://kotlinlang.org/docs/multiplatform/multiplatform-publish-apps.html>
- **K14** — Kotlin Multiplatform, inicio rápido: <https://kotlinlang.org/docs/multiplatform/quickstart.html>

**Plataformas nativas y tiendas**

- **N1** — Apple, SFSpeechRecognizer: <https://developer.apple.com/documentation/speech/sfspeechrecognizer>
- **N2** — Apple, SpeechAnalyzer: <https://developer.apple.com/documentation/speech/speechanalyzer>
- **N3** — Android, SpeechRecognizer: <https://developer.android.com/reference/android/speech/SpeechRecognizer>
- **N4** — Apple, disponibilidad de funciones de iOS: <https://www.apple.com/ios/feature-availability/>
- **S1** — Apple, requisitos próximos de envío: <https://developer.apple.com/news/upcoming-requirements/>
- **S2** — Google Play, nivel de API de destino: <https://developer.android.com/google/play/requirements/target-sdk>
- **S3** — Google Play, requisitos de prueba para cuentas personales nuevas: <https://support.google.com/googleplay/android-developer/answer/14151465>
- **S4** — Apple, exenciones de cuota: <https://developer.apple.com/help/account/membership/fee-waivers>
- **S5** — Google Play, registro de cuenta de desarrollador: <https://support.google.com/googleplay/android-developer/answer/6112435>
- **S6** — Apple, Xcode Cloud: <https://developer.apple.com/xcode-cloud/>

[V1]: https://docs.expo.dev/versions/latest/
[V2]: https://expo.dev/changelog
[V3]: https://registry.npmjs.org/expo
[V4]: https://reactnative.dev/versions
[V5]: https://github.com/facebook/react-native/releases
[V6]: https://docs.flutter.dev/install/archive
[V7]: https://kotlinlang.org/docs/releases.html
[V8]: https://github.com/JetBrains/compose-multiplatform/releases
[V9]: https://kotlinlang.org/docs/multiplatform/supported-platforms.html
[V10]: https://kotlinlang.org/docs/multiplatform/compose-compatibility-and-versioning.html
[V11]: https://docs.flutter.dev/reference/supported-platforms
[E1]: https://reactnative.dev/docs/environment-setup
[E2]: https://wix.github.io/react-native-calendars/docs/Components/Calendar
[E3]: https://github.com/wix/react-native-calendars
[E4]: https://github.com/MarceloPrado/flash-calendar
[E5]: https://docs.expo.dev/versions/latest/sdk/notifications/
[E6]: https://docs.expo.dev/push-notifications/overview/
[E7]: https://docs.expo.dev/versions/latest/sdk/location/
[E8]: https://github.com/jamsch/expo-speech-recognition
[E9]: https://reactnative.dev/docs/accessibility
[E10]: https://reactnative.dev/docs/text
[E11]: https://docs.expo.dev/build/introduction/
[E12]: https://docs.expo.dev/build/setup/
[E13]: https://docs.expo.dev/submit/introduction/
[E14]: https://expo.dev/pricing
[E15]: https://docs.expo.dev/billing/plans/
[E16]: https://docs.expo.dev/build-reference/local-builds/
[E17]: https://docs.expo.dev/eas-update/introduction/
[E18]: https://docs.expo.dev/workflow/overview/
[E19]: https://docs.expo.dev/develop/development-builds/introduction/
[E20]: https://reactnative.dev/docs/fast-refresh
[E21]: https://reactnative.dev/blog
[F1]: https://pub.dev/packages/table_calendar
[F2]: https://pub.dev/documentation/table_calendar/latest/table_calendar/CalendarBuilders-class.html
[F3]: https://pub.dev/packages/flutter_local_notifications
[F4]: https://firebase.google.com/docs/cloud-messaging/flutter/get-started
[F5]: https://pub.dev/packages/speech_to_text
[F6]: https://pub.dev/packages/geolocator
[F7]: https://docs.flutter.dev/ui/accessibility
[F8]: https://docs.flutter.dev/ui/accessibility/ui-design-and-styling
[F9]: https://docs.flutter.dev/ui/accessibility/accessibility-testing
[F10]: https://docs.flutter.dev/deployment/ios
[F11]: https://docs.flutter.dev/deployment/android
[F12]: https://docs.flutter.dev/deployment/cd
[F13]: https://docs.flutter.dev/tools/hot-reload
[F14]: https://docs.flutter.dev/platform-integration/platform-channels
[F15]: https://codemagic.io/pricing/
[K1]: https://kotlinlang.org/docs/multiplatform/compose-multiplatform-and-jetpack-compose.html
[K2]: https://github.com/kizitonwose/Calendar
[K3]: https://github.com/mirzemehdi/KMPNotifier
[K4]: https://github.com/jordond/compass
[K5]: https://github.com/icerockdev/moko-geo
[K6]: https://github.com/eslamwael74/speechtotextkit
[K7]: https://kotlinlang.org/docs/multiplatform/multiplatform-connect-to-apis.html
[K8]: https://kotlinlang.org/docs/multiplatform/compose-accessibility.html
[K9]: https://kotlinlang.org/docs/multiplatform/compose-ios-accessibility.html
[K10]: https://github.com/JetBrains/compose-multiplatform/releases/tag/v1.13.0-alpha01
[K11]: https://github.com/JetBrains/compose-multiplatform-core/pull/3306
[K12]: https://kotlinlang.org/docs/multiplatform/compose-hot-reload.html
[K13]: https://kotlinlang.org/docs/multiplatform/multiplatform-publish-apps.html
[K14]: https://kotlinlang.org/docs/multiplatform/quickstart.html
[N1]: https://developer.apple.com/documentation/speech/sfspeechrecognizer
[N2]: https://developer.apple.com/documentation/speech/speechanalyzer
[N3]: https://developer.android.com/reference/android/speech/SpeechRecognizer
[N4]: https://www.apple.com/ios/feature-availability/
[S1]: https://developer.apple.com/news/upcoming-requirements/
[S2]: https://developer.android.com/google/play/requirements/target-sdk
[S3]: https://support.google.com/googleplay/android-developer/answer/14151465
[S4]: https://developer.apple.com/help/account/membership/fee-waivers
[S5]: https://support.google.com/googleplay/android-developer/answer/6112435
[S6]: https://developer.apple.com/xcode-cloud/
