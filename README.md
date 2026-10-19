# Agenda de iglesia

App móvil (iOS y Android) que reemplaza las agendas impresas de la Iglesia Adventista: un calendario compartido, organizado por asociación, distrito e iglesia.

- Qué es y qué se decidió: [`CLAUDE.md`](CLAUDE.md)
- Vocabulario del dominio: [`GLOSSARY.md`](GLOSSARY.md)
- Diseño aprobado: [`diseno/`](diseno/README.md)
- Capas del código: [`src/features/README.md`](src/features/README.md)

## Requisitos

| Herramienta              | Para qué                                                         |
| ------------------------ | ---------------------------------------------------------------- |
| Node 24 y npm 11         | Instalar dependencias y correr los comandos.                     |
| Docker en ejecución      | Levantar el Supabase local.                                      |
| Xcode                    | Crear el development build de iOS (simulador).                   |
| JDK 17 y Android Studio  | Crear el development build de Android.                           |

La CLI de Supabase no se instala aparte: es una dependencia del proyecto y se usa con `npx supabase`.

## Primera vez

1. Instalar las dependencias:

   ```sh
   npm install
   ```

2. Levantar el Supabase local. Aplica las migraciones y carga los datos simulados (`supabase/seed.sql`). La primera vez descarga varias imágenes de Docker y puede demorar varios minutos.

   ```sh
   npm run db:start
   ```

3. Crear el archivo de configuración local:

   ```sh
   cp .env.example .env.local
   ```

   Completar `EXPO_PUBLIC_SUPABASE_ANON_KEY` con el valor de `ANON_KEY` que muestra `npx supabase status -o env`. El archivo `.env.local` está ignorado por git y no se sube nunca.

4. Crear el development build (ver la sección siguiente).

## Development build

La app no se usa con Expo Go: se instala un development build propio. Las carpetas `ios/` y `android/` se generan al crearlo y no se versionan.

```sh
npx expo run:ios       # simulador de iOS
npx expo run:android   # emulador o teléfono Android conectado por USB
```

El build se repite solo cuando cambian las dependencias nativas o `app.json`. El resto del tiempo alcanza con `npm start` y abrir la app ya instalada.

**Teléfono Android físico:** el teléfono no puede acceder a `127.0.0.1` de la computadora. En `.env.local`, `EXPO_PUBLIC_SUPABASE_URL` debe tener la IP de la computadora en la red local (por ejemplo `http://192.168.1.20:54321`), y ambos equipos deben estar en la misma red. Después de cambiar `.env.local` hay que reiniciar `npm start`.

Al abrir, la app muestra la lista de iglesias leída del Supabase local.

### Pantalla de muestra de los componentes

Los componentes base del diseño (formas de los énfasis, textos, botones, campo de texto, tarjeta y fondo) viven en `src/shared/ui/`. Una pantalla de muestra los exhibe juntos para compararlos con el diseño aprobado. Solo existe en desarrollo: en una versión publicada la ruta no está disponible.

Para abrirla, con la app instalada y `npm start` en ejecución:

```sh
xcrun simctl openurl booted agendadeiglesia://showcase                                # simulador de iOS
adb shell am start -a android.intent.action.VIEW -d "agendadeiglesia://showcase"     # Android
```

Después de traer este cambio hay que repetir el development build, porque suma dependencias nativas.

## Comandos de todos los días

| Comando             | Qué hace                                                                           |
| ------------------- | ---------------------------------------------------------------------------------- |
| `npm start`         | Inicia el servidor de desarrollo para el development build.                        |
| `npm run typecheck` | Verifica los tipos (`tsc`).                                                        |
| `npm run lint`      | Verifica el estilo (ESLint y Prettier).                                            |
| `npm run format`    | Corrige el formato con Prettier.                                                   |
| `npm test`          | Corre las pruebas del dominio (Jest).                                              |
| `npm run db:start`  | Levanta el Supabase local.                                                         |
| `npm run db:stop`   | Detiene el Supabase local.                                                         |
| `npm run db:reset`  | Recrea la base local: aplica todas las migraciones desde cero y carga los datos simulados. |
| `npm run db:test`   | Corre las pruebas de permisos (pgTAP) contra la base local.                        |
| `npm run db:types`  | Regenera `src/shared/database.types.ts` desde el esquema local.                    |
| `npm run evals:chat` | Corre los evals del chat contra la función real (cuesta plata; ver [docs/evals-chat.md](docs/evals-chat.md)). |

### Cambios en la base

1. Traer `main` antes de crear una migración.
2. Crear la migración con `npx supabase migration new <nombre>` y escribir el SQL.
3. Aplicarla con `npm run db:reset`.
4. Agregar o ajustar las pruebas de permisos en `supabase/tests/` (al menos un caso permitido y uno rechazado) y correr `npm run db:test`.
5. Regenerar los tipos con `npm run db:types` y subirlos en el mismo pull request. La integración continua falla si quedan desactualizados.

## Integración continua

En cada pull request a `main` corren cuatro verificaciones (`.github/workflows/ci.yml`):

| Verificación       | Equivalente local                                    |
| ------------------ | ---------------------------------------------------- |
| `Types`            | `npm run typecheck`                                  |
| `Style`            | `npm run lint`                                       |
| `Domain tests`     | `npm test`                                           |
| `Permission tests` | `npm run db:reset && npm run db:test && npm run db:types` |

Al fusionar a `main`, las migraciones nuevas se aplican solas al Supabase de desarrollo (`.github/workflows/deploy-migrations.yml`). El mismo workflow se puede lanzar a mano desde la pestaña Actions, solo sobre `main`. A producción se aplican a mano, como paso de la publicación de cada versión.

## Configuración que debe hacer una persona

Estos pasos requieren acceso a las cuentas y no están automatizados.

1. **Proyecto de Supabase de desarrollo**, en la región de São Paulo.
2. **Secretos del repositorio en GitHub** (Settings › Secrets and variables › Actions):

   | Secreto | Valor |
   | --- | --- |
   | `SUPABASE_DB_URL` | Cadena de conexión del **Session pooler** del proyecto de desarrollo (Connect › Session pooler), con la contraseña de la base en lugar de `[YOUR-PASSWORD]`. |

   Se usa el Session pooler porque los servidores de GitHub no tienen IPv6 y la dirección directa de la base solo responde por IPv6.

3. **Protección de la rama `main`:** marcar como obligatorias las verificaciones `Types`, `Style`, `Domain tests` y `Permission tests`.

Ningún secreto va en un archivo versionado. Las variables `EXPO_PUBLIC_*` quedan incluidas en la app y son públicas por diseño: ahí solo van la URL y la clave anónima, nunca la clave `service_role`.
