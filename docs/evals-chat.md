# Evals del chat

Un set de casos para medir cómo responde el chat de consulta (GPT-6 Luna, en español rioplatense) antes de cambiar algo que lo afecte. Motivo: las conversaciones no se guardan, así que sin evals la primera señal de una mala respuesta sería un reporte (issue #143).

## Cuándo correrlo

- Antes de cambiar el prompt del chat (`src/features/chat/dominio/consulta.ts`), sus herramientas o el modelo (`supabase/functions/chat-consulta/proveedor.ts`).
- Después del cambio, para comparar el total con el de antes.

**No corre en la integración continua:** cada corrida cuesta plata (una consulta a OpenAI por caso, 34 en total) y el modelo no siempre responde igual. Se corre a mano.

## Qué clave usa

La clave de OpenAI de desarrollo, la misma con la que se sirve la función en local. Va en `supabase/functions/.env`, que está ignorado por git:

```
OPENAI_API_KEY=sk-...
```

Nunca en un archivo versionado. Las claves de Supabase no hacen falta: el script las lee del Supabase local (`npx supabase status`).

## Cómo correrlo

1. Levantar el Supabase local con las migraciones al día:

   ```bash
   npm run db:start
   ```

2. En otra terminal, servir la función con la clave:

   ```bash
   npx supabase functions serve chat-consulta --env-file supabase/functions/.env
   ```

3. Correr los casos:

   ```bash
   npm run evals:chat
   ```

   Para correr solo algunos, se pasa el comienzo de su id: `npm run evals:chat -- simple fuera-clima` corre los casos `simple-*` y `fuera-clima`.

El script trabaja solo contra el Supabase local, nunca contra desarrollo ni producción. En cada corrida:

1. Borra lo que haya dejado una corrida anterior y carga el calendario de prueba.
2. Crea un encargado nuevo de la Iglesia Evals Central, con el consentimiento ya aceptado, y abre su sesión. Al ser nuevo, el límite diario de una corrida anterior no cuenta.
3. Manda cada caso a la función `chat-consulta` real y lo evalúa.
4. Borra el encargado y el calendario de prueba.

Las consultas sí suman al gasto del mes del Supabase local (`chat_gastos`). Si el chat avisa que se agotó el presupuesto, `npm run db:reset` lo vuelve a cero.

## Cómo leer el resultado

Una línea por caso, con ✔ o ✘. Cuando falla, debajo dice qué no se cumplió y qué respondió el chat. Al final, el total:

```
✔ simple-hora: ¿A qué hora es el culto joven?
✘ falta-lugar: ¿Dónde es la reunión de ancianos?
    texto: falta alguno de "no tiene", "no figura", ...
    respondió: La reunión de ancianos es en el Templo central.

Total: 33 de 34 (97 %)
```

El script termina con código 0 si acertó todos los casos, con 1 si el chat respondió y falló alguno, y con 2 si la corrida no midió el chat: el Supabase local apagado, la función sin servir o algún caso que no tuvo respuesta (por ejemplo, `falla: proveedor_caido` o una espera de más de un minuto). Si falla la limpieza final, lo avisa y la próxima corrida borra lo que quedó.

Como el modelo no siempre responde igual, un caso que falla una vez no prueba nada: conviene repetirlo (`npm run evals:chat -- <id>`) antes de sacar conclusiones. Lo que importa es comparar el total antes y después de un cambio.

## El calendario de prueba

Está en `scripts/evals-chat/calendario-de-prueba.json`: una asociación, un distrito, dos iglesias y sus eventos. Quien pregunta es encargado de la Iglesia Evals Central, así que su calendario es esa iglesia, el distrito y la asociación. Los eventos de la Iglesia Evals Norte no le corresponden y sirven para probar que el chat no los encuentra, salvo el que esa iglesia comparte con la Iglesia Evals Central: ese sí lo encuentra, con la Iglesia Evals Norte como dueña.

Las fechas se cuentan en días desde el **anclaje**: el próximo sábado (si hoy es sábado, el de la semana siguiente). `"dia": 0` es ese sábado, `-3` el miércoles anterior. Así "el sábado que viene" señala el mismo evento cualquier día que se corran los evals. El anclaje se calcula al empezar: una corrida que cruza la medianoche del viernes al sábado mezcla dos anclajes, así que no conviene correrlos a esa hora.

Cada evento lleva título, dueño (el nombre de la asociación, del distrito o de una iglesia), `dia`, `hora`, `lugar`, `descripcion` y `enfasis` (o `null` para una actividad regular). Opcionales: `diaFin` para un evento de varios días, `semanalHasta` para una serie semanal y `sumadas` con los nombres de las iglesias con que se comparte.

Ojo con las coincidencias: el chat responde con todas cuando son 3 o menos y repregunta cuando son más. Un evento de varios días cuenta una vez por cada día, y una serie una vez por cada fecha. Al sumar un evento, revisar que los casos que lo rozan sigan esperando lo mismo.

## Los casos

Están en `scripts/evals-chat/casos.ts`, por categoría:

| Categoría           | Qué prueba                                                         |
| ------------------- | ------------------------------------------------------------------ |
| `simple`            | Una pregunta con una respuesta clara.                              |
| `ambigua`           | Dos o tres coincidencias: responde con todas.                      |
| `demasiadas`        | Más de tres coincidencias: pide precisar la fecha o la iglesia.    |
| `fuera_de_tema`     | Responde que solo puede ayudar con el calendario.                  |
| `falta_info`        | Al evento le falta el dato: lo dice y no lo inventa.               |
| `sin_coincidencias` | No hay un evento así en el calendario de quien pregunta.           |
| `carga`             | Propone un evento (borrador) o pregunta lo que falta, sin guardar. |

Cada caso tiene un `id`, su `categoria`, el `mensaje` y lo `esperado`. Puede llevar un `tramo` con los mensajes anteriores, para seguir una conversación. Lo esperado solo revisa lo que nombra:

| Campo            | Se cumple cuando                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| `tipo`           | La respuesta es `respuesta` o `repregunta`.                                                       |
| `eventos`        | Los eventos que dibuja la respuesta tienen exactamente esos títulos, en cualquier orden. `[]`: ninguno. |
| `contiene`       | El texto dice cada fragmento (sin importar mayúsculas ni tildes).                                 |
| `contieneAlguno` | El texto dice al menos uno.                                                                       |
| `noContiene`     | El texto no dice ninguno.                                                                         |
| `borrador`       | `null`: no propone ningún evento. Si no, el evento propuesto cumple los campos que nombra: `titulo` (un fragmento), `dia` (desde el anclaje), `hora` (`HH:MM:SS`) y `enfasis`. |

### Sumar un caso

1. Agregarlo en `casos.ts`, en su categoría, con un `id` nuevo.
2. Si necesita un evento que no existe, sumarlo a `calendario-de-prueba.json`.
3. Para una hora, usar `contieneAlguno: hora(19)` en vez de `contiene: ['19']`: un número suelto también aparece en una fecha ("el sábado 19").
4. Correr `npm test`: verifica que los títulos esperados existan en el calendario y que los ids no se repitan.
5. Correrlo solo, unas veces: `npm run evals:chat -- <id>`.

Un caso de carga ("Cargame un culto joven el sábado a las 20 h") espera un `borrador` con los campos que importan, y conviene que espere `noContiene` con las formas de decir que el evento quedó guardado: el chat nunca guarda, la persona confirma en la tarjeta.

## El código

- `scripts/evals-chat.ts`: carga el calendario, abre la sesión, llama a la función e imprime el resultado.
- `scripts/evals-chat/evaluar.ts`: compara una respuesta con lo esperado y cuenta los días desde el anclaje.
- `scripts/evals-chat/calendario.ts`: arma las filas del calendario de prueba.

`evaluar.ts` y `calendario.ts` son puros y tienen pruebas con Jest, que sí corren en la integración continua sin llamar a nada.
