# Funcionalidades

Cada carpeta es una funcionalidad de la app (`calendario`, `eventos`, `iglesias`, `sesion`, `ajustes`) y tiene tres capas:

| Capa       | Qué contiene                                                           | Qué puede importar                          |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `dominio`  | Reglas puras en TypeScript y los tipos del dominio. Lleva pruebas Jest. | Nada de React, React Native ni Supabase.    |
| `datos` | Consultas a Supabase, lecturas del almacenamiento del teléfono y hooks de TanStack Query. | `dominio`, el cliente de `src/shared` y la capa `datos` de otra funcionalidad. |
| `interfaz` | Pantallas y componentes.                                               | `dominio` y `datos`. Nunca Supabase.        |

## Reglas

- **Un componente nunca llama a Supabase:** pide los datos a través de la capa `datos` de su funcionalidad. ESLint rechaza la importación de `@supabase/supabase-js` y del cliente compartido desde `interfaz/` y desde `src/app/`.
- Las rutas de `src/app` solo conectan una URL con una pantalla de `interfaz`. La excepción es la ruta de inicio (`index.tsx`): no muestra nada y redirige a la primera pantalla.
- Una capa `datos` puede usar la capa `datos` de otra funcionalidad cuando necesita combinar sus datos con los propios. Por ejemplo, `sesion` lee la iglesia elegida de `iglesias` para decidir la primera pantalla. No importa su `interfaz`.
- El código compartido entre funcionalidades va en `src/shared`.
- Las pruebas del dominio se escriben antes que el código y viven junto al archivo que prueban (`*.test.ts`).

Los archivos `.gitkeep` marcan capas que todavía no tienen código; se borran al agregar el primer archivo.
