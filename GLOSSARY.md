# Agenda de iglesia

Calendario compartido de la Iglesia Adventista, organizado por niveles, que reemplaza las agendas impresas entregadas a quienes ocupan cargos en cada iglesia.

## Language

### Niveles

**Iglesia**:
Congregación local con lugar de reunión y calendario propios. Incluye por igual a las iglesias organizadas y a los grupos.
_Avoid_: Grupo, filial, congregación, templo

**Distrito**:
Agrupamiento de iglesias definido por la asociación, que existe con independencia de quién lo pastorea. Toda iglesia pertenece a exactamente un distrito.
_Avoid_: Zona, región, circuito

**Asociación**:
Campo local que agrupa distritos. Incluye por igual a las asociaciones y a las misiones. Todo distrito pertenece a exactamente una asociación.
_Avoid_: Misión, campo, campo local

**Unión**:
Nivel que agrupa asociaciones. Está fuera de alcance: la agenda contempla una sola asociación.

### Personas y cargos

**Hermano**:
Persona que usa la agenda sin iniciar sesión, con una iglesia elegida. No es un usuario ni tiene cargos.
_Avoid_: Miembro, invitado, visitante, usuario anónimo

**Iglesia elegida**:
Iglesia que se eligió en un teléfono y cuyo calendario ve el hermano. Pertenece al teléfono, no a la persona, y no tiene efecto mientras hay una sesión iniciada.
_Avoid_: Mi iglesia, iglesia favorita, iglesia por defecto

**Usuario**:
Persona que inicia sesión. Puede tener uno o varios cargos a la vez, y ve los calendarios de todas las iglesias que esos cargos abarcan.
_Avoid_: Cuenta, perfil

**Cargo**:
Asignación de un usuario a un nivel concreto: encargado de una iglesia, pastor de un distrito o admin de una asociación. Abarca ese nivel y todo lo que depende de él, nunca lo que está por encima o al costado.
_Avoid_: Rol, permiso, tipo de usuario

**Encargado**:
Cargo sobre una iglesia. Una iglesia puede tener varios encargados, todos equivalentes.
_Avoid_: Secretario, editor, encargado de calendario

**Pastor**:
Cargo sobre un distrito. Un distrito puede tener varios pastores, todos equivalentes, o ninguno.
_Avoid_: Pastor distrital, líder de distrito

**Admin**:
Cargo sobre una asociación.
_Avoid_: Administrador, superusuario

### Eventos

**Calendario**:
Conjunto de eventos que se ven en una iglesia: los propios, los de su distrito actual, los de su asociación y aquellos donde es iglesia sumada. Se desprende siempre de la estructura vigente.
_Avoid_: Agenda, cronograma

**Evento**:
Actividad con fecha que pertenece a un nivel y, salvo que sea una actividad regular, a un énfasis. Su dueño es ese nivel, no la persona que lo cargó.
_Avoid_: Actividad, reunión, cita

**Énfasis**:
Cada una de las cuatro líneas de trabajo de la iglesia con las que se clasifica un evento: Identidad, Liderazgo, Nuevas Generaciones y Discipulado. Un evento tiene un solo énfasis o ninguno.
_Avoid_: Categoría, tipo de evento, área

**Actividad regular**:
Evento al que no se le asigna un énfasis, como un culto de oración o la Escuela Sabática. No es un quinto énfasis, sino la falta de uno. Es el único uso admitido de la palabra "actividad" para nombrar un evento.
_Avoid_: Evento regular, evento sin categoría, quinto énfasis

**Alcance**:
Nivel dueño de un evento: iglesia, distrito o asociación. Un evento se ve en todas las iglesias que dependen de su alcance.
_Avoid_: Visibilidad, tipo de evento, ámbito

**Dueño**:
La iglesia, el distrito o la asociación concretos a los que pertenece un evento o un lugar. Todo evento y todo lugar tienen exactamente un dueño. En el código se escribe `duenio`.
_Avoid_: Creador, autor, iglesia de origen, iglesia anfitriona

**Lugar**:
Sitio guardado en la lista de un dueño donde se hacen sus eventos ("Templo", "Salón de jóvenes"). Un evento tiene a lo sumo un lugar, y es de su mismo dueño. Un dueño no repite el nombre de un lugar, sin distinguir mayúsculas ni tildes. Los eventos cargados antes de la lista conservan su lugar escrito a mano.
_Avoid_: Ubicación, sede, sala, dirección

**Iglesia sumada**:
Iglesia que está por fuera del alcance de un evento y a la que el dueño se lo comparte, sin pasar a ser dueña.
_Avoid_: Iglesia invitada, iglesia compartida

**Evento compartido**:
Evento de iglesia o de distrito que tiene al menos una iglesia sumada. No es un alcance aparte.
_Avoid_: Alcance compartido

**Sumar**:
Compartir un evento con una iglesia que está por fuera de su alcance, que pasa a ser iglesia sumada de inmediato, sin necesidad de aceptarlo.
_Avoid_: Invitar, enviar, proponer

**Quitar**:
Acción por la que una iglesia sumada deja de serlo, a la vista también del dueño. No impide que vuelvan a sumarla.
_Avoid_: Ocultar, rechazar, bloquear

**Borrar**:
Eliminar un evento para todas las iglesias donde se ve. Solo puede hacerlo quien tenga un cargo que abarque a su dueño.
_Avoid_: Quitar, cancelar

### Chat

**Consulta**:
Cada mensaje que un usuario le envía al chat, para preguntar o para cargar un evento. Cuenta para el límite diario.
_Avoid_: Pregunta, mensaje, pedido

**Consentimiento**:
Aceptación de un usuario de que sus mensajes al chat se envían a OpenAI. Es de la persona, no del teléfono: se acepta una sola vez. Sin él, el chat no responde.
_Avoid_: Permiso, aceptación de términos

**Límite diario**:
Cantidad de consultas que un usuario puede hacer en un día: 50. El día empieza a la medianoche, hora de la asociación.
_Avoid_: Cupo, cuota

**Presupuesto**:
Lo que el chat puede gastar por mes, entre todos los usuarios: 20 USD. El mes se cuenta en hora de la asociación. Cuando se agota, el chat se apaga hasta el mes siguiente.
_Avoid_: Límite de gasto, crédito

**Zona horaria**:
La hora oficial de una asociación, con la que se cuentan el día del límite diario y el mes del presupuesto.
_Avoid_: Huso horario, hora local

### Entregas

**v1**:
Primera entrega de la agenda: lo necesario para reemplazar a la agenda impresa. No designa a la agenda completa.
_Avoid_: Primera versión, MVP, versión de diciembre

**v2**:
Segunda entrega de la agenda: todo lo descrito para la agenda que no entra en la v1.
_Avoid_: Segunda versión, fase 2
