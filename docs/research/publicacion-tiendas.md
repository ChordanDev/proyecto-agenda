# Requisitos y plazos de publicación en App Store y Google Play

- Ticket: [#4](https://github.com/ChordanDev/proyecto-agenda/issues/4)
- Fecha de consulta de todas las fuentes: 2026-10-06
- Alcance: hechos sobre publicación a nombre de una organización religiosa sin fines de lucro con sede en Argentina. No recomienda stack ni toma decisiones de producto.

Convención: **[V]** hecho verificado en la fuente enlazada; **[E]** estimación o supuesto de planificación propio, derivado de cifras verificadas; **[NV]** no se pudo verificar.

## Resumen

1. **El camino crítico es la verificación de la entidad, no la revisión de la app.** Apple y Google exigen que la organización sea una entidad legal con número D-U-N-S, sitio web propio y un representante con autoridad legal. El D-U-N-S es gratuito pero puede tardar hasta 30 días según Google (Apple indica hasta 5 días hábiles, más 2 días hábiles de sincronización). Ninguna de las dos tiendas publica cuánto demora su propia verificación de la organización.
2. **Costos:** Apple, 99 USD por año; Google, 25 USD por única vez. Apple ofrece una exención de la cuota para organizaciones sin fines de lucro que solo distribuyan apps gratuitas; la página vigente no lista países ni menciona a Argentina, y exige reconocimiento por "una autoridad pertinente" de la región. En la documentación de Google no se encontró ninguna exención.
3. **Pruebas previas obligatorias:** la exigencia de Google (prueba cerrada con 12 testers durante 14 días) aplica solo a cuentas **personales** creadas después del 13-nov-2023. La documentación de cuentas de organización no la impone. Apple no exige prueba beta previa.
4. **Privacidad:** ambas tiendas exigen una política de privacidad en una URL pública y dentro de la app, más una declaración de datos (etiquetas de privacidad en Apple, formulario de Seguridad de los datos en Google). Si la app permite crear cuentas, ambas exigen eliminación de cuenta. El chat con IA agrega dos obligaciones: permiso explícito para compartir datos personales con IA de terceros (Apple) y un mecanismo de reporte dentro de la app (Google).
5. **Revisión:** Apple declara que revisa típicamente el 50 % de los envíos en menos de 24 horas y el 90 % en menos de 48 horas. Google indica hasta 7 días o más y recomienda un margen de al menos una semana.
6. **Fecha de inicio:** la búsqueda o solicitud del D-U-N-S debe iniciarse esta misma semana (antes del vie 9-oct-2026). Si se solicita después del mar 3-nov-2026, el peor caso documentado ya no deja ningún día para la verificación de la cuenta antes de un primer envío el lun 7-dic-2026.

## Detalle

### 1. Entidad legal y número D-U-N-S (común a ambas tiendas)

| Requisito | Apple | Google |
|---|---|---|
| Entidad legal | [V] La organización debe ser una entidad legal capaz de contratar. No se aceptan nombres de fantasía, marcas ni **sucursales** ("branches"). El nombre legal aparece como vendedor en el App Store. [Fuente](https://developer.apple.com/help/account/membership/program-enrollment/) | [V] El nombre y la dirección de la organización se toman del perfil de pagos de Google vinculado y deben coincidir con el perfil de Dun & Bradstreet. [Fuente](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) |
| D-U-N-S | [V] Obligatorio para organizaciones (no para entidades gubernamentales). "Gratuito en la mayoría de las jurisdicciones". [Fuente](https://developer.apple.com/help/account/membership/program-enrollment/) | [V] Obligatorio para crear una cuenta de organización; sin él no se puede crear. Gratuito. [Fuente](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en) |
| Plazo del D-U-N-S | [V] Hasta 5 días hábiles para recibirlo; acelerar el trámite no acorta esa espera; si supera dos semanas, escribir a D&B. Luego, hasta 2 días hábiles para que Apple reciba el dato. [Fuente](https://developer.apple.com/help/account/membership/D-U-N-S/) | [V] "Puede tardar hasta 30 días, por lo que conviene planificar con anticipación". [Fuente](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en) |
| Representante | [V] Quien inscribe debe tener autoridad legal para obligar a la organización (dueño o fundador, directivo, líder sénior de proyecto o empleado autorizado). Si no es el fundador, debe indicar un referente que lo confirme. [Fuente](https://developer.apple.com/help/account/membership/identity-verification/) | [V] Documento de identidad oficial de un representante autorizado (por ejemplo director o representante legal); puede ser emitido en cualquier país. [Fuente](https://support.google.com/googleplay/android-developer/answer/15633622?hl=en) |
| Sitio web y correo | [V] Sitio público y funcional cuyo dominio pertenezca a la organización; no se aceptan redes sociales ni sitios con contenido mínimo. El correo de trabajo debe ser del dominio de la organización. [Fuente](https://developer.apple.com/help/account/membership/program-enrollment/) | [V] Sitio web de la organización, verificado mediante Search Console; no se aceptan perfiles de redes sociales. [Fuente](https://support.google.com/googleplay/android-developer/answer/13205715?hl=en) |

Las fuentes **discrepan** sobre el plazo del D-U-N-S (5 días hábiles según Apple, hasta 30 días según Google). Como referencia complementaria, la página del socio de Dun & Bradstreet para Latinoamérica (CIAL) ofrece el número gratuito "en 30 días" y variantes aceleradas de 5 a 7 días laborables o de 24 a 48 horas, y lista un teléfono de contacto en Argentina. [Fuente](https://www.cialdnb.com/es/numero-d-u-n-s) [NV] No se verificó el precio de las variantes aceleradas ni que ese formulario atienda solicitudes argentinas.

Ambas tiendas indican comprobar primero si la organización ya tiene un D-U-N-S asignado antes de pedir uno nuevo. [Apple](https://developer.apple.com/help/account/membership/D-U-N-S/) · [Google](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)

### 2. Apple: alta en el Apple Developer Program

- [V] Se requiere una cuenta de Apple con autenticación de dos factores. La inscripción puede hacerse por web o desde la app Apple Developer. [Fuente](https://developer.apple.com/help/account/membership/program-enrollment/)
- [V] Las organizaciones solo pueden aceptar el acuerdo y comprar la membresía **después** de que Apple Developer Support verifique los datos y envíe un correo con los pasos siguientes. [Fuente](https://developer.apple.com/help/account/membership/program-enrollment/)
- [V] Apple puede pedir documentos de la organización certificados por escribano u otro método de certificación, según la región. [Fuente](https://developer.apple.com/help/account/membership/identity-verification/)
- [V] Costo: 99 USD por año, en moneda local donde esté disponible; el precio local se muestra durante la inscripción. [Fuente](https://developer.apple.com/help/account/membership/program-enrollment/)
- [V] Tras el pago, si no llega la confirmación en 24 horas hay que contactar a soporte. [Fuente](https://developer.apple.com/help/account/membership/program-enrollment/)
- [NV] Apple no publica cuánto demora la verificación de una organización.

#### Exención de la cuota para organizaciones sin fines de lucro

- [V] Pueden pedirla organizaciones sin fines de lucro, instituciones educativas acreditadas y entidades gubernamentales. Requisitos: ser entidad legal con ese estatus; no ser persona física ni empresa unipersonal; no haber firmado el Acuerdo de apps de pago; no vender bienes ni servicios digitales en ninguna de sus apps. [Fuente](https://developer.apple.com/help/account/membership/fee-waivers/)
- [V] La organización debe estar "oficialmente reconocida por una autoridad pertinente en su región de operación"; los ejemplos citados son de EE. UU., la UE y China continental. [Fuente](https://developer.apple.com/help/account/membership/fee-waivers/)
- [V] Se solicita al completar la inscripción, o en cualquier momento antes del vencimiento si ya se es miembro. No hay reembolso total ni parcial de una membresía ya pagada. En cada renovación anual hay que confirmar que se sigue cumpliendo. [Fuente](https://developer.apple.com/help/account/membership/fee-waivers/)
- [V] Antecedente: en 2018 la exención se anunció solo para EE. UU. y en 2020 se amplió a Australia, Canadá, Francia, Alemania, Israel, Italia, México y Corea del Sur. [2018](https://developer.apple.com/news/?id=01032018a) · [2020](https://developer.apple.com/news/?id=02032020a)
- [NV] **Aplicación en Argentina:** la página vigente (en inglés y en español para Latinoamérica) ya no incluye lista de países y no menciona a Argentina. No se encontró ningún anuncio de Apple que confirme una ampliación global ni qué autoridad argentina considera válida. Tampoco publica el plazo de revisión de la solicitud.

### 3. Google: alta en Play Console

- [V] Pasos: registrarse con una cuenta de Google, aceptar el acuerdo de distribución, pagar 25 USD por única vez (no se aceptan tarjetas prepagas), elegir tipo de cuenta y verificar la identidad. [Fuente](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [V] La cuenta de organización corresponde cuando la cuenta es "para una organización o empresa". [Fuente](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)
- [V] Documentos aceptados en Argentina para organizaciones: un documento de registro (certificado de constitución o registro, citado como "Constancia de Inscripción de CUIT"; certificado de vigencia; o extracto de registro comercial) y un documento con foto del representante autorizado (pasaporte, documento de identidad, licencia de conducir o residencia permanente). Los datos deben coincidir exactamente con el perfil de pagos. [Fuente](https://support.google.com/googleplay/android-developer/answer/15633622?hl=en)
- [V] Enviar documentos no admitidos es la causa principal de rechazo en la verificación. [Fuente](https://support.google.com/googleplay/android-developer/answer/15633622?hl=en)
- [V] Orden de verificaciones: primero identidad y sitio web; solo después se puede verificar el teléfono. Correo y teléfono se verifican con código de un solo uso. [Fuente](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en)
- [V] No se pueden enviar apps mientras la verificación esté pendiente. [Fuente](https://support.google.com/googleplay/android-developer/answer/10841920?hl=en)
- [V] **Datos visibles al público:** en cuentas de organización Google Play muestra el nombre legal, la dirección legal, el correo y el teléfono del desarrollador. [Fuente](https://support.google.com/googleplay/android-developer/answer/13628312?hl=en)
- [V] Desde el 30-sep-2026 todos los paquetes de Play deben estar registrados para la verificación de desarrolladores de Android; Google intenta registrar automáticamente las apps nuevas de cuentas con identidad verificada. [Fuente](https://support.google.com/googleplay/android-developer/answer/16984799?hl=en)
- [NV] En las páginas de alta, pago y requisitos no se encontró ninguna exención de la tarifa para organizaciones sin fines de lucro. Google tampoco publica cuánto demora la verificación de identidad y de documentos.

### 4. Pruebas previas al lanzamiento

**Google**

- [V] Las cuentas **personales** creadas después del 13-nov-2023 deben ejecutar una prueba cerrada con al menos 12 testers inscritos de forma continua durante 14 días antes de solicitar acceso a producción. Un tester que se da de baja y vuelve reinicia sus 14 días. [Fuente](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [V] La revisión de la solicitud de acceso a producción "suele tardar siete días o menos, pero ocasionalmente puede tardar más". [Fuente](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [V] La guía de alta rotula ese paso como "solo cuentas personales", junto con la verificación de dispositivo. [Fuente](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [E] Por lo tanto, una cuenta de organización no queda sujeta a esa exigencia. La documentación no lo afirma con una frase explícita de exención: lo define únicamente para cuentas personales.
- [V] La prueba interna es opcional. Si el primer lanzamiento es en la pista interna, igualmente pasa por revisión (de unas horas a siete días, o más en casos excepcionales). [Fuente](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en)

**Apple**

- [V] No se encontró ninguna prueba beta obligatoria. TestFlight es opcional: hasta 100 testers internos del equipo y hasta 10.000 externos; para invitar externos, la primera compilación debe ser aprobada por App Review para TestFlight. [Fuente](https://developer.apple.com/testflight/)

### 5. Privacidad y declaraciones

**Apple**

- [V] Toda app debe enlazar su política de privacidad en App Store Connect y dentro de la app, de forma accesible (pauta 5.1.1(i)). [Fuente](https://developer.apple.com/app-store/review/guidelines/) La URL de política de privacidad es obligatoria para todas las apps. [Fuente](https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy/)
- [V] Las etiquetas de privacidad (datos que recopilan la app y sus SDK de terceros) son obligatorias para enviar apps nuevas y actualizaciones. [Fuente](https://developer.apple.com/app-store/app-privacy-details/)
- [V] Pauta 5.1.1(v): si la app no tiene funciones significativas basadas en cuenta, debe poder usarse sin iniciar sesión; si admite creación de cuentas, debe ofrecer la eliminación de la cuenta dentro de la app. [Fuente](https://developer.apple.com/app-store/review/guidelines/)
- [V] Pauta 5.1.2(i): hay que informar con claridad cuándo se comparten datos personales con terceros, "incluida IA de terceros", y obtener permiso explícito antes de hacerlo. [Fuente](https://developer.apple.com/app-store/review/guidelines/)
- [V] Hay que responder el cuestionario de clasificación por edad actualizado. [Fuente](https://developer.apple.com/news/upcoming-requirements/)

**Google**

- [V] Toda app debe tener una política de privacidad enlazada en Play Console y accesible dentro de la app. [Fuente](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [V] El formulario de Seguridad de los datos es obligatorio para las pistas cerrada, abierta y de producción, incluso si la app no recopila datos; solo la pista interna está exenta. Requiere tener cargada la política de privacidad. [Fuente](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [V] Si la app permite crear una cuenta desde la app, debe ofrecer una vía dentro de la app para eliminarla y además un enlace web para pedir la eliminación. Todas las apps deben responder las preguntas de eliminación de datos del formulario. [Fuente](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [V] Declaraciones de la página "Contenido de la app": política de privacidad, anuncios, instrucciones de acceso a zonas restringidas, público objetivo, clasificación de contenido y seguridad de los datos. Si el público objetivo incluye niños, aplica la política de Familias. [Fuente](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [V] Política de contenido generado por IA: incluye a los chatbots conversacionales cuando son una función central, y exige un mecanismo dentro de la app para reportar o marcar contenido ofensivo sin salir de ella. [Fuente](https://support.google.com/googleplay/android-developer/answer/13985936?hl=en)

### 6. Requisitos técnicos vigentes

- [V] Apple: desde el 28-abr-2026 las apps deben compilarse con Xcode 26 o posterior y un SDK de iOS 26; desde el 9-sep-2026 deben apuntar a iOS 13 o posterior. [Fuente](https://developer.apple.com/news/upcoming-requirements/)
- [V] Google: desde el 31-ago-2026 las apps nuevas deben apuntar a Android 16 (API 36) o superior. [Fuente](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [V] Google: el 27-ene-2027 entra en vigor una actualización de la política de permisos de ubicación (botón de ubicación como alcance mínimo recomendado para ubicación precisa). Es posterior al lanzamiento, pero afecta a "Usar mi ubicación". [Fuente](https://support.google.com/googleplay/android-developer/table/12921780?hl=en)

### 7. Proceso de revisión

**Apple**

- [V] App Review revisa típicamente al menos el 50 % de los envíos en menos de 24 horas y el 90 % en menos de 48 horas. [Fuente](https://developer.apple.com/distribute/app-review/)
- [V] Si hay funciones con inicio de sesión, se debe entregar una cuenta de demostración válida; la pauta 2.1(a) añade que el backend debe estar activo durante la revisión. Más del 40 % de los problemas no resueltos corresponden a la pauta 2.1 (app incompleta, fallos, contenido de relleno). [Fuente](https://developer.apple.com/distribute/app-review/) · [Pautas](https://developer.apple.com/app-store/review/guidelines/)
- [V] Se puede pedir revisión acelerada por circunstancias atenuantes; para apps ligadas a un evento, Apple recomienda programar el lanzamiento. Existe apelación ante el App Review Board. [Fuente](https://developer.apple.com/distribute/app-review/)
- [V] En diciembre de 2024 Apple avisó que las revisiones podían tardar más del 20 al 26 de diciembre; en 2023, del 22 al 27. [2024](https://developer.apple.com/news/?id=iwvebnw2) · [2023](https://developer.apple.com/news/?id=uijoypq9)
- [NV] El aviso de 2026 todavía no está publicado.

**Google**

- [V] Para ciertas cuentas la revisión puede llegar a siete días o más en casos excepcionales. [Fuente](https://support.google.com/googleplay/android-developer/answer/9859751?hl=en)
- [V] Google recomienda un margen de al menos una semana entre el envío y la salida. La publicación gestionada permite elegir el momento de salida tras la aprobación y se sugiere para cuentas nuevas con revisiones extendidas. [Fuente](https://support.google.com/googleplay/android-developer/answer/9859654?hl=en)
- [V] Si partes de la app requieren credenciales, hay que entregar los datos de acceso al equipo de revisión. [Fuente](https://support.google.com/googleplay/android-developer/answer/9859455?hl=en)
- [V] Google acepta aviso anticipado al equipo de revisión, entre otros casos, de organizaciones benéficas sin fines de lucro validadas (con prueba de su estatus) y de quien tenga permiso documentado para usar marcas o logotipos de terceros. [Fuente](https://support.google.com/googleplay/android-developer/answer/6320428?hl=en)

## Cronograma hacia atrás desde fines de diciembre de 2026

Las fechas marcadas [E] son estimaciones propias: combinan los plazos máximos documentados y no son compromisos de las tiendas. Las verificaciones de cuenta de Apple y de Google no tienen plazo publicado, por lo que el margen que se les reserva es un supuesto.

| Fecha límite | Hito | Fundamento |
|---|---|---|
| mié 30-dic-2026 | App disponible en ambas tiendas | Objetivo del proyecto |
| dom 20 a dom 27-dic | Ventana con posibles demoras de revisión en Apple | [V] Avisos de 2023 y 2024; [NV] sin aviso para 2026 |
| vie 18-dic | Aprobación obtenida en ambas tiendas, con salida manual pendiente | [E] Evita la ventana de fiestas |
| mié 16-dic | Último primer envío que aún admite dos ciclos de revisión de Google en su peor caso documentado (7 + 7 días), sin margen | [E] sobre [V] 7 días por ciclo |
| lun 7-dic | Primer envío a revisión en ambas tiendas | [E] Dos ciclos de 7 días terminan el lun 21-dic |
| antes del lun 7-dic | Política de privacidad publicada, etiquetas de privacidad y formulario de Seguridad de los datos completos, cuenta de demostración, enlace web de eliminación de cuenta, clasificación por edad y público objetivo | [V] Son requisitos previos al envío |
| lun 16-nov | Ambas cuentas activas y verificadas, para distribuir compilaciones de prueba durante tres semanas | [E] Supuesto de planificación |
| mar 10-nov | Dato del D-U-N-S disponible para Apple si se pidió el vie 9-oct | [E] 30 días (dom 8-nov) más 2 días hábiles |
| mar 3-nov | Último día para pedir el D-U-N-S: después, el peor caso documentado no deja ningún día para verificar las cuentas antes del lun 7-dic | [E] 30 días más 2 días hábiles |
| vie 9-oct | Comprobar si la entidad ya tiene D-U-N-S y, si no, solicitarlo; reunir los documentos de la entidad y definir quién firma | [E] Primer paso del camino crítico |

**Variante si Google se publicara con una cuenta personal** (no con cuenta de organización). Entre el primer envío a la pista cerrada y la app en producción hay hasta 35 días en el peor caso documentado:

| Fecha límite | Hito | Fundamento |
|---|---|---|
| lun 7-dic | Envío a producción | [E] Igual que arriba |
| lun 30-nov | Solicitud de acceso a producción | [V] Revisión habitual de hasta 7 días |
| lun 16-nov | 12 testers inscritos en la prueba cerrada | [V] 14 días continuos |
| lun 9-nov | Envío de la primera compilación a la pista cerrada | [V] Revisión de hasta 7 días |

En esta variante la app debe ser utilizable por testers el 9-nov, casi un mes antes del hito de funcionalidades completas de principios de diciembre.

## Brechas abiertas

1. **Entidad legal que se inscribe.** Apple no acepta sucursales. No se verificó si la asociación tiene personería jurídica propia o depende de una entidad de nivel superior; eso define a nombre de quién se pide el D-U-N-S y qué nombre aparece como vendedor.
2. **D-U-N-S existente.** No se comprobó si la entidad ya tiene un número asignado; la búsqueda requiere sus datos legales.
3. **Exención de la cuota de Apple en Argentina.** Sin confirmación documental; solo se resuelve presentando la solicitud o consultando a Apple Developer Support.
4. **Plazos no publicados:** verificación de organización en Apple, revisión de la exención de cuota y verificación de identidad y documentos en Google.
5. **Sitio web y correo con dominio propio.** No se verificó que la entidad los tenga; ambas tiendas los exigen.
6. **Exposición pública de datos en Google Play.** Hay que definir qué dirección legal, correo y teléfono de la entidad se mostrarán.
7. **Eliminación de cuenta.** Las dos políticas hablan de apps que "permiten crear cuentas". No aclaran si alcanzan a cuentas creadas por un administrador (encargados y pastores) y no por el propio usuario.
8. **Precio local e impuestos** de la membresía de Apple en Argentina: solo se muestran durante la inscripción.
9. **Aviso de fiestas 2026 de Apple** y eventuales demoras de Google en diciembre: sin publicación a la fecha.
10. **Uso del nombre y los símbolos de la Iglesia.** No se investigó si hace falta documentación de autorización de marca; Google admite presentarla por aviso anticipado.
