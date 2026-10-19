-- Simulated data for local development. It is NOT the real structure of the
-- asociacion: names, addresses and localities are made up.
-- The ids are fixed so that tests and screenshots can reference them.

insert into public.asociaciones (id, nombre) values
  ('a0000000-0000-4000-8000-000000000001', 'Asociación Argentina Central');

insert into public.distritos (id, asociacion_id, nombre) values
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Córdoba Centro'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Córdoba Norte'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Villa María'),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Río Cuarto');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('10000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Córdoba Central', 'Av. Colón 1250', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Nueva Córdoba', 'Obispo Trejo 840', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Barrio Güemes', 'Belgrano 1175', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'Argüello', 'Av. Rafael Núñez 5320', 'Córdoba'),
  ('10000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'Villa Allende', 'Av. Goycoechea 410', 'Villa Allende'),
  ('10000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'Río Ceballos', 'Av. San Martín 4480', 'Río Ceballos'),
  ('10000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000003', 'Villa María Centro', 'Mendoza 1340', 'Villa María'),
  ('10000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000003', 'Villa Nueva', 'Marcos Juárez 720', 'Villa Nueva'),
  ('10000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000003', 'Bell Ville', 'Bv. Colón 215', 'Bell Ville'),
  ('10000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000004', 'Río Cuarto Central', 'Sobremonte 960', 'Río Cuarto'),
  ('10000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000004', 'Banda Norte', 'Av. Marcelo T. de Alvear 1630', 'Río Cuarto'),
  ('10000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000004', 'Las Higueras', 'Av. San Martín 305', 'Las Higueras');

-- Fictitious church used for internal tests: it never appears in "Elegir iglesia".
insert into public.iglesias (id, distrito_id, nombre, direccion, localidad, excluida_del_buscador) values
  ('10000000-0000-4000-8000-000000000099', 'd0000000-0000-4000-8000-000000000001', 'Iglesia de prueba', 'Calle Ficticia 123', 'Córdoba', true);

-- Simulated usuarios -------------------------------------------------------------
-- Four usuarios that can log in to the local Supabase, one per case of the
-- permission table: an encargado, a pastor, an admin and a usuario without
-- cargos. They are loaded straight into the tables of Supabase Auth, with what
-- a signup with email and password would have left there.
--
-- All four share the development password: agenda-local
-- It only exists in a local Supabase: this file is never applied to the
-- development or production projects.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  -- Supabase Auth cannot read a usuario whose token columns are null.
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
select
  '00000000-0000-0000-0000-000000000000', usuario.id, 'authenticated', 'authenticated', usuario.email,
  extensions.crypt('agenda-local', extensions.gen_salt('bf')), now(),
  '', '', '', '',
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now()
from (
  values
    ('b0000000-0000-4000-8000-000000000001'::uuid, 'encargado@example.com'),
    ('b0000000-0000-4000-8000-000000000002'::uuid, 'pastor@example.com'),
    ('b0000000-0000-4000-8000-000000000003'::uuid, 'admin@example.com'),
    ('b0000000-0000-4000-8000-000000000004'::uuid, 'sin-cargos@example.com')
) as usuario (id, email);

-- The identity that logging in with email and password looks for.
insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  id, id::text, 'email',
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true, 'phone_verified', false),
  now(), now(), now()
from auth.users
where id::text like 'b0000000-0000-4000-8000-%';

-- Their cargos. The fourth usuario has none.
insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  -- Encargado of Córdoba Central.
  ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', null, null),
  -- Pastor of the distrito Córdoba Centro.
  ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', null, 'd0000000-0000-4000-8000-000000000001', null),
  -- Admin of the asociacion.
  ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', null, null, 'a0000000-0000-4000-8000-000000000001');

-- Simulated eventos ---------------------------------------------------------------
-- Made up as well, with fixed dates between October 2026 and January 2027. They
-- cover the three alcances, the four enfasis and the actividad regular (a null
-- enfasis), and they belong to several iglesias and distritos, so that the
-- calendario of one iglesia differs from the calendario of another.

-- Lugares guardados, chosen from a list in the form of an evento. Most eventos
-- below keep their lugar as written text, as the eventos saved before the list.
insert into public.lugares (id, nombre, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id) values
  ('f0000000-0000-4000-8000-000000000001', 'Templo', '10000000-0000-4000-8000-000000000001', null, null),
  ('f0000000-0000-4000-8000-000000000002', 'Salón de jóvenes', '10000000-0000-4000-8000-000000000001', null, null),
  ('f0000000-0000-4000-8000-000000000003', 'Plaza San Martín', '10000000-0000-4000-8000-000000000001', null, null),
  ('f0000000-0000-4000-8000-000000000004', 'Templo', '10000000-0000-4000-8000-000000000002', null, null),
  ('f0000000-0000-4000-8000-000000000005', 'Camping Los Quebrachos', null, 'd0000000-0000-4000-8000-000000000002', null),
  ('f0000000-0000-4000-8000-000000000006', 'Sede de la asociación', null, null, 'a0000000-0000-4000-8000-000000000001');

-- Alcance asociacion: seen in every iglesia.
insert into public.eventos (id, titulo, lugar, descripcion, enfasis, alcance, duenio_asociacion_id, hora, fecha_fin) values
  -- Several days, across the end of the month: from Friday 30 October to Sunday 1 November.
  ('e0000000-0000-4000-8000-000000000001', 'Congreso de Jóvenes', 'Complejo Los Aromos, Villa Carlos Paz', 'Tres días de predicación, talleres y música para los jóvenes de toda la asociación.', 'nuevas_generaciones', 'asociacion', 'a0000000-0000-4000-8000-000000000001', '19:00', '2026-11-01'),
  ('e0000000-0000-4000-8000-000000000002', 'Escuela de líderes', 'Sede de la asociación, Córdoba', 'Capacitación para ancianos, directores de departamento y secretarios de iglesia.', 'liderazgo', 'asociacion', 'a0000000-0000-4000-8000-000000000001', '09:00', null),
  -- Actividad regular, with neither a place nor a description.
  ('e0000000-0000-4000-8000-000000000003', 'Día de ayuno y oración', null, null, null, 'asociacion', 'a0000000-0000-4000-8000-000000000001', '09:00', null);

-- Alcance distrito: seen in the iglesias of that distrito.
insert into public.eventos (id, titulo, lugar, descripcion, enfasis, alcance, duenio_distrito_id, hora, fecha_fin) values
  -- Córdoba Centro.
  ('e0000000-0000-4000-8000-000000000004', 'Encuentro de familias del distrito', 'Iglesia Córdoba Central, Av. Colón 1250', 'Tarde de juegos, alabanza y merienda compartida.', 'identidad', 'distrito', 'd0000000-0000-4000-8000-000000000001', '16:00', null),
  ('e0000000-0000-4000-8000-000000000005', 'Vigilia de oración del distrito', 'Iglesia Nueva Córdoba, Obispo Trejo 840', null, null, 'distrito', 'd0000000-0000-4000-8000-000000000001', '21:00', null),
  -- Córdoba Norte. Several days inside the same month.
  ('e0000000-0000-4000-8000-000000000006', 'Campamento de Conquistadores', 'Camping Los Quebrachos, Río Ceballos', 'Llevar carpa, bolsa de dormir y la autorización firmada.', 'nuevas_generaciones', 'distrito', 'd0000000-0000-4000-8000-000000000002', '08:00', '2026-11-23'),
  -- Villa María.
  ('e0000000-0000-4000-8000-000000000007', 'Caminata misionera', 'Plaza Centenario, Villa María', 'Entrega de libros y oración por los vecinos del centro.', 'discipulado', 'distrito', 'd0000000-0000-4000-8000-000000000003', '16:00', null);

-- Alcance iglesia: seen in that iglesia.
insert into public.eventos (id, titulo, lugar, descripcion, enfasis, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie) values
  -- Córdoba Central. Weekly series: every Wednesday until 27 January 2027.
  ('e0000000-0000-4000-8000-000000000008', 'Culto de oración', 'Iglesia Córdoba Central, Av. Colón 1250', null, null, 'iglesia', '10000000-0000-4000-8000-000000000001', '20:00', 'semanal', '2027-01-27'),
  ('e0000000-0000-4000-8000-000000000009', 'Concierto de Navidad', 'Iglesia Córdoba Central, Av. Colón 1250', 'Coro y orquesta de la iglesia. Entrada libre.', 'identidad', 'iglesia', '10000000-0000-4000-8000-000000000001', '19:30', 'ninguna', null),
  -- Nueva Córdoba. Monthly series: the third Saturday of each month until 31 January 2027.
  ('e0000000-0000-4000-8000-000000000010', 'Curso de discipulado', 'Iglesia Nueva Córdoba, Obispo Trejo 840', 'Encuentro mensual para los nuevos miembros.', 'discipulado', 'iglesia', '10000000-0000-4000-8000-000000000002', '16:00', 'mensual', '2027-01-31'),
  ('e0000000-0000-4000-8000-000000000011', 'Almuerzo de confraternidad', 'Salón de la iglesia Nueva Córdoba', 'Cada familia trae un plato para compartir.', null, 'iglesia', '10000000-0000-4000-8000-000000000002', '13:00', 'ninguna', null),
  -- Argüello.
  ('e0000000-0000-4000-8000-000000000012', 'Investidura de Conquistadores', 'Iglesia Argüello, Av. Rafael Núñez 5320', null, 'nuevas_generaciones', 'iglesia', '10000000-0000-4000-8000-000000000004', '17:00', 'ninguna', null),
  -- Villa María Centro.
  ('e0000000-0000-4000-8000-000000000013', 'Seminario de mayordomía', 'Iglesia Villa María Centro, Mendoza 1340', 'Para tesoreros y directores de mayordomía.', 'liderazgo', 'iglesia', '10000000-0000-4000-8000-000000000007', '16:00', 'ninguna', null),
  -- Río Cuarto Central.
  ('e0000000-0000-4000-8000-000000000014', 'Bautismo de primavera', 'Iglesia Río Cuarto Central, Sobremonte 960', null, 'discipulado', 'iglesia', '10000000-0000-4000-8000-000000000010', '10:30', 'ninguna', null);

-- An evento with a lugar of the list instead of a written one.
update public.eventos
set lugar = null, lugar_id = 'f0000000-0000-4000-8000-000000000001'
where id = 'e0000000-0000-4000-8000-000000000009';

-- One row per date. An evento that does not repeat has a single row, also when
-- it lasts several days: the rest of its days come from eventos.fecha_fin.
insert into public.eventos_fechas (evento_id, fecha) values
  ('e0000000-0000-4000-8000-000000000001', '2026-10-30'),
  ('e0000000-0000-4000-8000-000000000002', '2026-11-15'),
  ('e0000000-0000-4000-8000-000000000003', '2026-11-07'),
  ('e0000000-0000-4000-8000-000000000004', '2026-10-24'),
  ('e0000000-0000-4000-8000-000000000005', '2026-11-20'),
  ('e0000000-0000-4000-8000-000000000006', '2026-11-21'),
  ('e0000000-0000-4000-8000-000000000007', '2026-12-12'),
  ('e0000000-0000-4000-8000-000000000009', '2026-12-19'),
  ('e0000000-0000-4000-8000-000000000011', '2026-10-17'),
  ('e0000000-0000-4000-8000-000000000012', '2026-11-28'),
  ('e0000000-0000-4000-8000-000000000013', '2027-01-09'),
  ('e0000000-0000-4000-8000-000000000014', '2026-10-31');

-- The weekly series: one row per Wednesday, from 7 October 2026 to its fin_de_serie.
insert into public.eventos_fechas (evento_id, fecha)
select 'e0000000-0000-4000-8000-000000000008', semana::date
from generate_series('2026-10-07'::date, '2027-01-27'::date, interval '7 days') as semana;

-- The monthly series: the third Saturday of each month.
insert into public.eventos_fechas (evento_id, fecha) values
  ('e0000000-0000-4000-8000-000000000010', '2026-10-17'),
  ('e0000000-0000-4000-8000-000000000010', '2026-11-21'),
  ('e0000000-0000-4000-8000-000000000010', '2026-12-19'),
  ('e0000000-0000-4000-8000-000000000010', '2027-01-16');

-- Iglesias sumadas.
insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  -- Outside the alcance: Argüello (distrito Córdoba Norte) is added to the
  -- concert of Córdoba Central (distrito Córdoba Centro).
  ('e0000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000004'),
  -- Inside the alcance: Villa Allende is added to an evento of its own
  -- distrito, so it reaches the evento twice. The app does not create this, but
  -- it is what remains when an iglesia sumada moves into the distrito that owns
  -- the evento, and the calendario must show the evento only once.
  ('e0000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000005');

-- Gestion of cargos ----------------------------------------------------------------
-- A secretaria de iglesia of Córdoba Central, who logs in like the other four,
-- with the development password. She and the encargado share the iglesia, so
-- she reads him and he does not read her.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000', 'b0000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated',
  'secretaria@example.com', extensions.crypt('agenda-local', extensions.gen_salt('bf')), now(),
  '', '', '', '',
  '{"provider": "email", "providers": ["email"]}', '{}', now(), now()
);

insert into auth.identities (user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (
  'b0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', 'email',
  '{"sub": "b0000000-0000-4000-8000-000000000005", "email": "secretaria@example.com", "email_verified": true, "phone_verified": false}',
  now(), now(), now()
);

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id, es_secretaria, funcion) values
  ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', null, null, true, 'Secretaria');

-- The funcion of the encargado, shown in the gestion.
update public.cargos set funcion = 'Tesorero' where id = 'c0000000-0000-4000-8000-000000000001';

-- The nombres of the usuarios. The one without cargos has none yet, as a
-- usuario invited before the gestion existed.
insert into public.perfiles (usuario_id, nombre) values
  ('b0000000-0000-4000-8000-000000000001', 'Juan Pérez'),
  ('b0000000-0000-4000-8000-000000000002', 'Daniel Gómez'),
  ('b0000000-0000-4000-8000-000000000003', 'Marta Rodríguez'),
  ('b0000000-0000-4000-8000-000000000005', 'Ana López');
