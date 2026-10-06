# Proveedores de IA para el chat

> Investigación para el issue #7. Fecha de lectura de todas las fuentes: **2026-10-06**.
> Este documento compara; **no elige** un proveedor. La decisión corresponde a un ticket posterior.

Convenciones:

- **[V]** hecho verificado en la fuente enlazada, leída el 2026-10-06.
- **[E]** estimación propia, calculada a partir de hechos verificados y de supuestos declarados.
- **[S]** supuesto propio (no medido).
- **[NV]** no se pudo verificar en una fuente primaria.
- Precios en USD por millón de tokens (MTok), tarifa estándar, sin impuestos.

## 1. Resumen

- Los tres proveedores publican hoy un modelo pequeño y uno intermedio con *function calling* y salida estructurada con esquema JSON: Anthropic (Claude Haiku 4.5 y Claude Sonnet 5.5), OpenAI (GPT-6 Luna y GPT-6.1 Sol) y Google (Gemini 3.5 Flash-Lite y Gemini 3.8 Flash). [V]
- La diferencia de precio de lista entre modelos pequeños es de un orden de magnitud: entrada/salida de $0.10/$0.50 (GPT-6 Luna), $0.30/$2.50 (Gemini 3.5 Flash-Lite) y $1/$5 (Claude Haiku 4.5). [V]
- Con los supuestos de la sección 4 (3.000 usuarios activos, 4.460 tokens de entrada y 310 de salida por consulta), el costo mensual estimado sin caché va de unos $9 a $2.164 según modelo y volumen (5, 20 o 60 consultas por usuario). [E]
- El caché de prompts reduce el costo estimado entre 16 % y 47 % en los modelos donde el prefijo estático supuesto (1.500 tokens) alcanza el mínimo cacheable (Sonnet 5.5, GPT-6 Luna, GPT-6.1 Sol). No aplica con ese prefijo en Claude Haiku 4.5 ni en Gemini 3.8 Flash, cuyo mínimo publicado es 4.096 tokens. [V] + [E]
- Google publica un nivel gratuito con entrada y salida sin cargo, pero en ese nivel el contenido se usa para mejorar productos de Google y puede ser leído por revisores humanos. OpenAI lista un nivel "Free" sin detallar qué modelos admite, y Anthropic menciona una pequeña cantidad de créditos gratuitos de prueba. [V]
- Ninguno de los tres usa por defecto los datos de la API de pago para entrenar modelos. Los plazos de retención publicados son 30 días (Anthropic y OpenAI) y 55 días (Google). [V]
- Los términos de la Gemini API exigen que la aplicación no esté dirigida a menores de 18 años ni sea probable que estos accedan a ella; es un punto a revisar dado el público de la app. [V]
- Para voz: Claude no acepta audio como entrada; OpenAI y Google ofrecen transcripción de pago ($0.003 a $0.006 por minuto) y los modelos Gemini aceptan audio directo. iOS y Android incluyen reconocimiento de voz del sistema operativo sin costo por uso. [V]
- Ningún proveedor publica latencias en milisegundos ni resultados de calidad en español para los modelos actuales (Anthropic publica cifras solo para Haiku 4.5 y Sonnet 4.5). Ambos puntos requieren medición propia. [NV]

## 2. Modelos considerados

Se tomó, de cada proveedor, el modelo que su propia documentación presenta hoy como el más económico y el intermedio.

| Proveedor | Nivel | Modelo (ID) | Cómo lo describe el proveedor | Fuente |
|---|---|---|---|---|
| Anthropic | Pequeño | Claude Haiku 4.5 (`claude-haiku-4-5`) | "The fastest model with near-frontier intelligence" | [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) |
| Anthropic | Intermedio | Claude Sonnet 5.5 (`claude-sonnet-5-5`) | "The best combination of speed and intelligence" | [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) |
| OpenAI | Pequeño | GPT-6 Luna (`gpt-6-luna`) | "Our most efficient model for focused, high-volume tasks" | [Models](https://developers.openai.com/api/docs/models) |
| OpenAI | Intermedio | GPT-6.1 Sol (`gpt-6.1-sol`) | "Near-Astra performance for complex work at a lower cost" | [Models](https://developers.openai.com/api/docs/models) |
| Google | Pequeño | Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | "A cost-efficient model, optimized for high-volume agentic tasks, translation, and simple data processing" | [Pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Google | Intermedio | Gemini 3.8 Flash (`gemini-3.8-flash`) | "Our most intelligent Flash model…" | [Pricing](https://ai.google.dev/gemini-api/docs/pricing) |

Notas [V]:

- Los modelos superiores (Claude Opus 5.5 y Fable 5.1, GPT-6 Astra, Gemini 3.1 Pro Preview) quedaron fuera por no ser el nivel pequeño ni intermedio.
- Claude Haiku 4.5 figura como "Active" con fecha de retiro "Not sooner than October 15, 2026", y la página no lista un Haiku más nuevo. Fuente: [Model deprecations](https://platform.claude.com/docs/en/about-claude/model-deprecations).
- La página de modelos de Google indica que Gemini 3.1 Pro está en *preview* y que los modelos 2.5 tienen acceso limitado a usuarios previos. Fuente: [Gemini models](https://ai.google.dev/gemini-api/docs/models).

## 3. Tabla comparativa

### 3.1 Precio y capacidades

| Criterio | Claude Haiku 4.5 | Claude Sonnet 5.5 | GPT-6 Luna | GPT-6.1 Sol | Gemini 3.5 Flash-Lite | Gemini 3.8 Flash |
|---|---|---|---|---|---|---|
| Entrada ($/MTok) | 1.00 | 2.00 | 0.10 | 2.00 | 0.30 | 0.75 hasta 2026-12-31; 1.50 desde 2027-01-01 |
| Salida ($/MTok) | 5.00 | 10.00 | 0.50 | 10.00 | 2.50 | 3.75 hasta 2026-12-31; 7.50 desde 2027-01-01 |
| Lectura de caché ($/MTok) | 0.10 | 0.20 | 0.01 | 0.10 | 0.03 | 0.075 (0.15 desde 2027) |
| Escritura de caché ($/MTok) | 1.25 (5 min) / 2.00 (1 h) | 2.50 (5 min) / 4.00 (1 h) | 0.125 | 2.50 | Sin cargo de escritura; almacenamiento $1.00/MTok/hora (caché explícito) | Sin cargo de escritura; almacenamiento $0.50/MTok/hora (1.00 desde 2027) |
| Mínimo cacheable (tokens) | 4.096 | 512 | 1.024 | 1.024 | No figura en la tabla de mínimos [NV] | 4.096 |
| Ventana de contexto | 200K | 1M | 1.050.000 | 1.050.000 | 1.048.576 (entrada) | 1.048.576 (entrada) |
| *Function calling* | Sí | Sí | Sí | Sí | Sí | Sí |
| Salida estructurada (esquema JSON) | Sí | Sí | Sí | Sí | Sí | Sí |
| Entrada de audio en el modelo de chat | No (texto e imagen) | No (texto e imagen) | No (texto e imagen) | No (texto e imagen) | Sí | Sí |
| Razonamiento por defecto | Sin *thinking* salvo que se active | Adaptativo activo por defecto, esfuerzo `high`; ajuste mínimo `between_tools` | `medium`; admite `none` | `medium`; no admite `none` | Activo, nivel `minimal` | Activo, nivel `medium`; mínimo `low` |
| Nivel gratuito | Créditos de prueba | Créditos de prueba | No figura en la tabla de límites del modelo | No figura en la tabla de límites del modelo | Sí (entrada y salida sin cargo) | Sí (entrada y salida sin cargo) |

Fuentes [V]:

- Anthropic: [Pricing](https://platform.claude.com/docs/en/about-claude/pricing), [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [Strict tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use), [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview), [Thinking](https://platform.claude.com/docs/en/build-with-claude/thinking), [Claude Sonnet 5.5](https://platform.claude.com/docs/en/models/sonnet-5-5/overview).
- OpenAI: [Pricing](https://developers.openai.com/api/docs/pricing), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Reasoning](https://developers.openai.com/api/docs/guides/reasoning).
- Google: [Pricing](https://ai.google.dev/gemini-api/docs/pricing), [Caching](https://ai.google.dev/gemini-api/docs/caching), [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite), [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [Thinking](https://ai.google.dev/gemini-api/docs/thinking).

Aclaraciones [V]:

- En los tres proveedores los tokens de razonamiento se facturan como tokens de salida ([Anthropic](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking), [OpenAI](https://developers.openai.com/api/docs/guides/reasoning), [Google](https://ai.google.dev/gemini-api/docs/thinking)).
- OpenAI: los modelos GPT-5.6 y posteriores cobran la escritura de caché a 1,25× la entrada y la lectura a 0,1× (0,05× en GPT-6.1 Sol); el caché está activo por defecto y dura 30 minutos desde la última escritura o uso. Los prompts de más de 272K tokens de entrada tienen recargo, que no aplica a este caso de uso.
- OpenAI: en GPT-6 Luna, Chat Completions admite *function calling* solo con `reasoning_effort` en `none`; la Responses API no tiene esa restricción.
- Anthropic: al usar herramientas, la API agrega un prompt de sistema propio de 496 tokens (Haiku 4.5) o 286 tokens (Sonnet 5.5) por solicitud. Además, los modelos Claude 4.7 y posteriores (incluye Sonnet 5.5, no Haiku 4.5) usan un tokenizador que produce "approximately 30% more tokens for the same text".
- Google: el caché implícito está activo por defecto en Gemini 2.5 y posteriores; el caché explícito tiene TTL por defecto de 1 hora ([caché explícito](https://ai.google.dev/gemini-api/docs/generate-content/caching)).

### 3.2 Calidad en español

| Proveedor | Dato publicado | Fuente |
|---|---|---|
| Anthropic | Rendimiento relativo al inglés (100 %) en español: 98,2 % en Claude Sonnet 4.5 y 96,4 % en Claude Haiku 4.5, ambos con *extended thinking*. No hay cifra publicada para Sonnet 5.5. [V] | [Multilingual support](https://platform.claude.com/docs/en/build-with-claude/multilingual-support) |
| OpenAI | No se encontró una cifra por idioma para GPT-6 Luna ni GPT-6.1 Sol en las páginas de modelo. [NV] | [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) |
| Google | No se encontró una cifra por idioma para Gemini 3.5 Flash-Lite ni 3.8 Flash en las páginas de modelo. [NV] | [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) |

No hay una métrica comparable entre proveedores. La calidad en español rioplatense (voseo, "cargame", fechas relativas como "el sábado que viene") debe evaluarse con un conjunto de pruebas propio.

### 3.3 Latencia

| Proveedor | Dato publicado | Fuente |
|---|---|---|
| Anthropic | Solo comparación relativa dentro de su línea: Haiku 4.5 "Fastest", Sonnet 5.5 "Fast". Sin milisegundos. [V] | [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) |
| OpenAI | Las páginas de modelo no publican velocidad. La guía indica que los modelos más pequeños suelen ser más rápidos y que el *streaming* reduce la espera percibida. [V] | [Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization) |
| Google | Describe a Flash-Lite como "low-latency". Sin milisegundos. [V] | [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) |

Factores documentados que afectan la latencia en los tres: nivel de razonamiento configurado, cantidad de tokens de salida, uso de *streaming* y lecturas de caché. No se encontró ninguna medición primaria desde Argentina. [NV]

### 3.4 Límites de uso

| Proveedor | Límites publicados (nivel de pago inicial) | Tope de gasto mensual por nivel | Fuente |
|---|---|---|---|
| Anthropic | Nivel Start, Haiku 4.5 y Sonnet 5.5: 1.000 RPM, 2.000.000 ITPM, 400.000 OTPM. Build: 5.000 RPM, 5.000.000 ITPM. Los tokens leídos de caché no cuentan para ITPM. Organizaciones nuevas pueden empezar en un nivel "Evaluation" con límites menores no detallados. | Start $500; Build $1.000; Scale $200.000 | [Rate limits](https://platform.claude.com/docs/en/api/rate-limits) |
| OpenAI | GPT-6 Luna: Tier 1 500 RPM y 500.000 TPM; Tier 2 5.000 RPM y 2.000.000 TPM. GPT-6.1 Sol: Tier 1 500 RPM y 500.000 TPM; Tier 2 5.000 RPM y 1.000.000 TPM. | Free $100; Tier 1 ($5 pagados) $100; Tier 2 ($50) $500; Tier 3 ($100) $1.000; Tier 4 ($250) $5.000 | [Rate limits](https://developers.openai.com/api/docs/guides/rate-limits), [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) |
| Google | No publica RPM/TPM/RPD en la documentación: "can be viewed in Google AI Studio". Límite adicional por gasto en ventana de 10 minutos: Tier 1 $10, Tier 2 $50. | Tier 1 $250; Tier 2 ($100 pagados + 3 días) $2.000 | [Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) |

Carga pico estimada [E]: con 180.000 consultas al mes (el escenario más alto), 6.000 consultas al día y 10 % del día concentrado en la hora pico [S], resultan 10 consultas por minuto, es decir 20 solicitudes por minuto y unos 44.600 tokens de entrada por minuto. Esa cifra queda por debajo de los límites publicados del nivel de pago inicial de Anthropic y OpenAI. No se puede comparar con Google porque no publica los números. [NV]

Los topes de gasto mensual sí pueden ser relevantes: varios escenarios de la sección 4 superan el tope del nivel inicial (por ejemplo, $100 en OpenAI Tier 1 o $250 en Gemini Tier 1).

### 3.5 Datos y privacidad

| Aspecto | Anthropic | OpenAI | Google (Gemini API) |
|---|---|---|---|
| Entrenamiento con datos de la API | No por defecto en productos comerciales, salvo comentarios enviados o consentimiento. | No desde el 1 de marzo de 2023, salvo *opt-in*. | Nivel de pago: no. Nivel gratuito: sí, y revisores humanos pueden leer entradas y salidas. |
| Retención estándar | Borrado de entradas y salidas dentro de 30 días. Contenido marcado por infracción: hasta 2 años (puntuaciones de clasificación hasta 7 años). | Registros de monitoreo de abuso hasta 30 días. | Nivel de pago: 55 días para detección de abuso, sin uso para entrenar modelos generales. |
| Retención cero | Por acuerdo con ventas (ZDR). | *Zero Data Retention* o *Modified Abuse Monitoring*, sujetos a aprobación previa. | No en la Gemini API; la documentación remite a Vertex AI. |
| Residencia de datos | Global por defecto; opción `inference_geo: "us"` con recargo de 1,1×. | Regiones listadas: EE. UU., Europa, Australia, Canadá, Japón, India, Singapur, Corea del Sur, Reino Unido, Emiratos Árabes Unidos; recargo de 10 %. Ninguna en América Latina. | Los datos pueden almacenarse transitoriamente en cualquier país donde Google tenga instalaciones. |
| Menores de edad | Permitido en productos de organizaciones con salvaguardas (verificación de edad, moderación, monitoreo, aviso de que se interactúa con una IA). | Las políticas de uso (vigentes desde 2025-10-29) listan usos prohibidos para proteger a menores; no prohíben de forma general las apps accesibles a menores. | "You also will not use the Services as part of a website, application, or other service … that is directed towards or is likely to be accessed by individuals under the age of 18." |
| Disponible en Argentina | Sí | Sí | Sí |

Fuentes [V]:

- Anthropic: [retención comercial](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data) (actualizada 2026-07-01), [uso para entrenamiento](https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training), [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention), [organizaciones que atienden a menores](https://support.claude.com/en/articles/9307344-responsible-use-of-anthropic-s-models-guidelines-for-organizations-serving-minors), [países admitidos](https://www.anthropic.com/supported-countries).
- OpenAI: [Data controls](https://developers.openai.com/api/docs/guides/your-data), [Usage policies](https://openai.com/policies/usage-policies/), [Supported countries](https://developers.openai.com/api/docs/supported-countries).
- Google: [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms) (vigentes desde 2026-03-23), [Usage policies](https://ai.google.dev/gemini-api/docs/usage-policies), [Zero data retention](https://ai.google.dev/gemini-api/docs/zdr), [Available regions](https://ai.google.dev/gemini-api/docs/available-regions).

Otros datos de Google [V]: el nivel gratuito advierte "Do not submit sensitive, confidential, or personal information to the Unpaid Services"; el paso a nivel de pago requiere vincular facturación y una precarga mínima de $5 ([Billing](https://ai.google.dev/gemini-api/docs/billing)).

## 4. Estimación de costo mensual

### 4.1 Supuestos

Todos los valores de esta subsección son supuestos propios [S], no mediciones.

1. **Usuarios activos mensuales:** 3.000.
2. **Consultas por usuario al mes:** tres escenarios, 5, 20 y 60. Totales: 15.000, 60.000 y 180.000 consultas.
3. **Cada consulta hace dos llamadas al modelo:** la primera devuelve la llamada a la herramienta (buscar eventos o preparar la vista previa de un evento); la segunda recibe el resultado y redacta la respuesta.
4. **Tamaño en tokens:**

   | Componente | Tokens |
   |---|---|
   | Prompt de sistema (instrucciones, énfasis, reglas de confirmación) | 700 |
   | Definiciones de herramientas | 800 |
   | **Prefijo estático (S)** | **1.500** |
   | Mensaje del usuario e historial breve (U) | 100 |
   | Llamada a herramienta generada por el modelo (T) | 60 |
   | Contexto de calendario devuelto por la herramienta, unos 15 eventos (C) | 1.200 |
   | Respuesta final (A) | 250 |

5. **Razonamiento:** se supone desactivado o en el nivel mínimo, con cero tokens de razonamiento. Donde el modelo no permite desactivarlo (GPT-6.1 Sol, Gemini 3.8 Flash) o lo trae activo por defecto (Claude Sonnet 5.5, GPT-6 Luna, Gemini 3.5 Flash-Lite) el costo real de salida será mayor si no se ajusta la configuración.
6. **Mismo conteo de tokens en todos los proveedores.** Es una simplificación: cada proveedor usa su propio tokenizador.
7. No se incluyen impuestos, costos de infraestructura propia ni reintentos.

### 4.2 Tokens por consulta

- Llamada 1, entrada: S + U = 1.500 + 100 = **1.600**. Salida: T = **60**.
- Llamada 2, entrada: S + U + T + C = 1.500 + 100 + 60 + 1.200 = **2.860**. Salida: A = **250**.
- **Entrada total por consulta:** 1.600 + 2.860 = **4.460 tokens** (de los cuales 3.000 son el prefijo estático repetido dos veces y 1.460 son variables).
- **Salida total por consulta:** 60 + 250 = **310 tokens**.

Volumen mensual:

| Escenario | Consultas | Entrada (MTok) | Salida (MTok) |
|---|---|---|---|
| 5 por usuario | 15.000 | 66,9 | 4,65 |
| 20 por usuario | 60.000 | 267,6 | 18,6 |
| 60 por usuario | 180.000 | 802,8 | 55,8 |

### 4.3 Costo sin caché

Fórmula: costo por consulta = 4.460 × precio de entrada / 1.000.000 + 310 × precio de salida / 1.000.000. [E]

| Modelo | Cálculo por consulta | Costo por consulta | 15.000 consultas | 60.000 consultas | 180.000 consultas |
|---|---|---|---|---|---|
| Claude Haiku 4.5 | 4.460 × 1 + 310 × 5 = 6.010 → /1e6 | $0,006010 | $90,15 | $360,60 | $1.081,80 |
| Claude Sonnet 5.5 | 4.460 × 2 + 310 × 10 = 12.020 → /1e6 | $0,012020 | $180,30 | $721,20 | $2.163,60 |
| GPT-6 Luna | 4.460 × 0,10 + 310 × 0,50 = 601 → /1e6 | $0,000601 | $9,02 | $36,06 | $108,18 |
| GPT-6.1 Sol | 4.460 × 2 + 310 × 10 = 12.020 → /1e6 | $0,012020 | $180,30 | $721,20 | $2.163,60 |
| Gemini 3.5 Flash-Lite | 4.460 × 0,30 + 310 × 2,50 = 2.113 → /1e6 | $0,002113 | $31,70 | $126,78 | $380,34 |
| Gemini 3.8 Flash (hasta 2026-12-31) | 4.460 × 0,75 + 310 × 3,75 = 4.507,5 → /1e6 | $0,004508 | $67,61 | $270,45 | $811,35 |
| Gemini 3.8 Flash (desde 2027-01-01) | 4.460 × 1,50 + 310 × 7,50 = 9.015 → /1e6 | $0,009015 | $135,23 | $540,90 | $1.622,70 |

Ajustes documentados que el cálculo base no incluye [E]:

- **Claude Haiku 4.5, prompt de sistema de herramientas:** +496 tokens de entrada por llamada, 992 por consulta. Costo por consulta: (4.460 + 992) × 1 / 1e6 + 310 × 5 / 1e6 = $0,007002. Mensual: $105,03 / $420,12 / $1.260,36.
- **Claude Sonnet 5.5, prompt de sistema de herramientas:** +286 por llamada, 572 por consulta. Costo por consulta: (4.460 + 572) × 2 / 1e6 + 310 × 10 / 1e6 = $0,013164. Mensual: $197,46 / $789,84 / $2.369,52.
- **Claude Sonnet 5.5, tokenizador (~30 % más tokens para el mismo texto):** aplicando 1,3× a entrada y salida además del ajuste anterior: (4.460 × 1,3 + 572) × 2 / 1e6 + (310 × 1,3) × 10 / 1e6 = $0,016770. Mensual: $251,55 / $1.006,20 / $3.018,60.
- **OpenAI y Google:** no se verificó si agregan tokens ocultos facturables al usar herramientas. [NV]

### 4.4 Efecto del caché de prompts

El caché aplica al prefijo estático (1.500 tokens por llamada, 3.000 por consulta) solo si alcanza el mínimo cacheable del modelo. [V]

| Modelo | Mínimo cacheable | ¿Aplica con S = 1.500? |
|---|---|---|
| Claude Haiku 4.5 | 4.096 | No |
| Claude Sonnet 5.5 | 512 | Sí |
| GPT-6 Luna | 1.024 | Sí |
| GPT-6.1 Sol | 1.024 | Sí |
| Gemini 3.5 Flash-Lite | No publicado en la tabla de mínimos | No verificable [NV] |
| Gemini 3.8 Flash | 4.096 | No |

Para los modelos donde aplica se calculan dos cotas [E]:

- **Caché siempre caliente (cota inferior de costo):** las dos llamadas leen el prefijo. Entrada equivalente = 3.000 × factor de lectura + 1.460.
- **Caché siempre frío entre consultas (cota superior):** la llamada 1 escribe el prefijo a 1,25× y la llamada 2 lo lee. Entrada equivalente = 1.500 × 1,25 + 1.500 × factor de lectura + 1.460.

| Modelo | Factor de lectura | Caso | Entrada equivalente | Costo por consulta | Variación | 15.000 | 60.000 | 180.000 |
|---|---|---|---|---|---|---|---|---|
| Claude Sonnet 5.5 | 0,1× | Caliente | 300 + 1.460 = 1.760 | 1.760 × 2/1e6 + 0,0031 = $0,006620 | −44,9 % | $99,30 | $397,20 | $1.191,60 |
| Claude Sonnet 5.5 | 0,1× | Frío | 1.875 + 150 + 1.460 = 3.485 | 3.485 × 2/1e6 + 0,0031 = $0,010070 | −16,2 % | $151,05 | $604,20 | $1.812,60 |
| GPT-6 Luna | 0,1× | Caliente | 1.760 | 1.760 × 0,10/1e6 + 0,000155 = $0,000331 | −44,9 % | $4,97 | $19,86 | $59,58 |
| GPT-6 Luna | 0,1× | Frío | 3.485 | 3.485 × 0,10/1e6 + 0,000155 = $0,000504 | −16,2 % | $7,55 | $30,21 | $90,63 |
| GPT-6.1 Sol | 0,05× | Caliente | 150 + 1.460 = 1.610 | 1.610 × 2/1e6 + 0,0031 = $0,006320 | −47,4 % | $94,80 | $379,20 | $1.137,60 |
| GPT-6.1 Sol | 0,05× | Frío | 1.875 + 75 + 1.460 = 3.410 | 3.410 × 2/1e6 + 0,0031 = $0,009920 | −17,5 % | $148,80 | $595,20 | $1.785,60 |

Consideraciones [V]:

- La duración del caché determina qué cota se acerca más a la realidad: 5 minutos (o 1 hora con escritura a 2×) en Anthropic; 30 minutos en OpenAI. Con poco tráfico el caché se enfría entre consultas.
- En OpenAI el cálculo supone el modo explícito con el punto de corte al final del prefijo estático. En el modo implícito (por defecto) el punto de corte se ubica al final del último mensaje, por lo que la escritura alcanza más tokens; ese caso no está modelado.
- En Anthropic el caché se aísla por *workspace* y se reutiliza entre solicitudes de distintos usuarios finales solo si el prefijo es idéntico; cualquier dato variable (fecha, iglesia del usuario) debe ir después del punto de corte.
- En Haiku 4.5 y Gemini 3.8 Flash el caché solo aplicaría si el prefijo estático superara los 4.096 tokens. Con caché, el precio de lectura sería 10 % de la entrada en ambos ($0,10 y $0,075 por MTok).

## 5. Entrada por voz

### 5.1 Opciones

| Opción | Cómo funciona | Costo publicado | Español | Datos | Fuente |
|---|---|---|---|---|---|
| Reconocimiento del sistema en iOS (`SFSpeechRecognizer`, iOS 10+) | Dictado del sistema. Puede requerir red: "For some languages, the recognizer might require an Internet connection". Límite de un minuto de audio por tarea y límites diarios por dispositivo y por app. | Sin costo por uso | Depende de los *locales* admitidos en el dispositivo; se consulta en tiempo de ejecución. `es-AR` no verificado. [NV] | El audio puede enviarse a servidores de Apple; requiere permiso del usuario. | [SFSpeechRecognizer](https://developer.apple.com/documentation/speech/sfspeechrecognizer) |
| Reconocimiento en el dispositivo en iOS (`SpeechAnalyzer` + `SpeechTranscriber` o `DictationTranscriber`, iOS 26+) | Transcripción con modelos por idioma que se descargan al dispositivo. | Sin costo por uso | Depende de los *locales* instalados o descargables. `es-AR` no verificado. [NV] | Usa recursos por idioma instalados en el dispositivo; `DictationTranscriber` no admite los idiomas que `SFSpeechRecognizer` solo ofrece por red. | [SpeechAnalyzer](https://developer.apple.com/documentation/speech/speechanalyzer), [SpeechTranscriber](https://developer.apple.com/documentation/speech/speechtranscriber), [DictationTranscriber](https://developer.apple.com/documentation/speech/dictationtranscriber) |
| Reconocimiento del sistema en Android (`SpeechRecognizer`) | Servicio de reconocimiento del dispositivo. "The implementation of this API is likely to stream audio to remote servers". No está pensado para reconocimiento continuo. Requiere `RECORD_AUDIO`. | Sin costo por uso | Depende del servicio instalado; `checkRecognitionSupport` (API 33) permite consultarlo. `es-AR` no verificado. [NV] | Probable envío de audio a servidores remotos. | [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer) |
| Reconocimiento en el dispositivo en Android (`createOnDeviceSpeechRecognizer`, API 31+) | Devuelve "a new on-device SpeechRecognizer"; disponibilidad consultable con `isOnDeviceRecognitionAvailable`. La descarga de modelos se solicita con `triggerModelDownload` (API 33). | Sin costo por uso | Igual que la fila anterior. [NV] | Procesamiento local. | [SpeechRecognizer](https://developer.android.com/reference/android/speech/SpeechRecognizer) |
| OpenAI `gpt-transcribe` | Se sube el audio (hasta 25 MB) y devuelve texto. Admite pistas de idioma (`es`) y palabras clave. | $0,0045 por minuto | Código `es` admitido | Mismas condiciones de datos de la API de OpenAI. | [Pricing](https://developers.openai.com/api/docs/pricing), [Speech to text](https://developers.openai.com/api/docs/guides/speech-to-text) |
| OpenAI `gpt-4o-mini-transcribe` | Igual, modelo anterior. | $0,003 por minuto | No verificado en su página [NV] | Igual. | [Pricing](https://developers.openai.com/api/docs/pricing) |
| OpenAI `gpt-4o-transcribe` / Whisper | Igual. | $0,006 por minuto | Whisper: 98 idiomas, precisión variable | Igual. | [Pricing](https://developers.openai.com/api/docs/pricing) |
| Google `gemini-3.5-transcribe` | Transcripción de archivos de hasta 1 hora; detección automática de más de 85 idiomas. | $0,003/min de entrada + $0,002/min de salida; tarifa combinada publicada ~$0,005 por minuto. Sin cargo en el nivel gratuito. | Lista `es-419` (Latinoamérica) y `es-US` | Condiciones de la Gemini API (nivel gratuito: se usa para mejorar productos). | [Pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini 3.5 Transcribe](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-transcribe) |
| Audio directo al modelo de chat Gemini | El audio se envía como entrada del mismo modelo que responde; 32 tokens por segundo de audio. | Flash-Lite 3.5: $0,30/MTok (misma tarifa que texto). 3.8 Flash: la tabla no separa precio de audio. | No especificado por idioma [NV] | Condiciones de la Gemini API. | [Audio understanding](https://ai.google.dev/gemini-api/docs/audio), [Pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Anthropic | Los modelos actuales admiten "text and image input"; no hay entrada de audio ni servicio de transcripción en la documentación consultada. Requiere transcripción externa o del dispositivo. | — | — | — | [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) |

### 5.2 Costo estimado de transcripción del lado del proveedor

Supuestos [S]: 30 % de las consultas se hacen por voz y cada una dura 8 segundos. Minutos al mes = consultas × 0,30 × 8 / 60.

| Escenario | Minutos de audio | `gpt-transcribe` ($0,0045/min) | `gpt-4o-mini-transcribe` ($0,003/min) | `gemini-3.5-transcribe` (~$0,005/min) | Audio directo a Gemini 3.5 Flash-Lite |
|---|---|---|---|---|---|
| 15.000 consultas | 600 | $2,70 | $1,80 | $3,00 | $0,69 |
| 60.000 consultas | 2.400 | $10,80 | $7,20 | $12,00 | $2,76 |
| 180.000 consultas | 7.200 | $32,40 | $21,60 | $36,00 | $8,29 |

La columna de audio directo [E] supone 8 s × 32 tokens/s = 256 tokens de audio, presentes en las dos llamadas de la consulta (512 tokens) a $0,30/MTok. Ejemplo: 60.000 × 0,30 × 512 = 9.216.000 tokens → $2,76.

El reconocimiento del sistema operativo no agrega costo por uso en ninguno de los escenarios. No se verificó si la facturación por minuto de OpenAI se prorratea por segundo. [NV]

## 6. Vacíos abiertos

1. **Latencia real.** Ningún proveedor publica milisegundos ni tiempo hasta el primer token. Falta medir desde Argentina, con *streaming* y con el flujo de dos llamadas.
2. **Calidad en español rioplatense.** No hay métrica comparable entre proveedores; Anthropic solo publica cifras para Haiku 4.5 y Sonnet 4.5. Falta un conjunto de pruebas propio (consultas, fechas relativas, voseo, carga de eventos con vista previa).
3. **Tamaño real del prompt.** Los 4.460 tokens de entrada y 310 de salida son supuestos. El costo cambia de forma proporcional; conviene contarlos con el prompt y las herramientas definitivos y con el tokenizador de cada proveedor.
4. **Tokens de razonamiento.** Se supusieron en cero. GPT-6.1 Sol y Gemini 3.8 Flash no permiten desactivar el razonamiento según su documentación, y Claude Sonnet 5.5 lo trae activo por defecto (su ajuste mínimo es `between_tools`); el impacto en tokens de salida no está estimado.
5. **Límites de uso de Google.** Los RPM/TPM/RPD por modelo y nivel, incluidos los del nivel gratuito, solo se ven en AI Studio con una cuenta.
6. **Nivel gratuito de OpenAI.** La tabla de niveles lista "Free" con $100 al mes, pero las tablas de límites de GPT-6 Luna y GPT-6.1 Sol empiezan en Tier 1; no se verificó qué modelos admite.
7. **Créditos gratuitos de Anthropic.** La página dice "a small amount of free credits" sin monto.
8. **Mínimo cacheable de Gemini 3.5 Flash-Lite.** La página del modelo indica que admite caché, pero no aparece en la tabla de mínimos.
9. **Facturación del caché implícito de OpenAI.** No se modeló cuántos tokens se cobran como escritura en el modo implícito.
10. **Continuidad de Claude Haiku 4.5.** Fecha de retiro "no antes del 15 de octubre de 2026" sin sucesor listado en la página consultada.
11. **Precio de Gemini 3.8 Flash.** El precio publicado se duplica el 1 de enero de 2027.
12. **Restricción de edad de la Gemini API.** Los términos excluyen aplicaciones a las que probablemente accedan menores de 18 años. Falta una lectura legal respecto del público de la app.
13. **Cláusulas de edad de OpenAI.** Solo se revisaron las políticas de uso; no se revisó el contrato de servicios.
14. **Protección de datos en Argentina.** No se analizó la transferencia internacional de datos personales (texto y voz de los usuarios) frente a la normativa local; ningún proveedor ofrece residencia de datos en América Latina según lo consultado.
15. **Idiomas del reconocimiento de voz del sistema.** La compatibilidad con `es-AR` en iOS y Android se consulta en tiempo de ejecución y depende del dispositivo; no figura en la documentación revisada.
16. **Precios vía nubes de terceros.** No se compararon Amazon Bedrock, Google Cloud Vertex AI ni Microsoft Foundry, que tienen precios y condiciones de datos propios.
