-- Permission tests for what the chat de consulta reads: buscar_eventos finds
-- only the eventos of the calendario of the usuario who asks, and only a
-- usuario with a sesion can call it.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- The structure of the fixtures:
--
--   Asociación de la prueba (the admin)
--     Distrito del pastor (the pastor)
--       Iglesia del encargado (the encargado)
--       Iglesia vecina (its encargado)
--     Otro distrito
--       Iglesia de otro distrito
--   Otra asociación (in the hora of São Paulo)
--     Distrito de otra asociación
--       Iglesia de otra asociación (its encargado)
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(42);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre, zona_horaria) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba', 'America/Argentina/Buenos_Aires'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Otra asociación', 'America/Sao_Paulo');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito del pastor'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Otro distrito'),
  ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'Distrito de otra asociación');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del encargado', 'Calle 1', 'Localidad'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia vecina', 'Calle 2', 'Localidad'),
  ('11111111-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia de otro distrito', 'Calle 3', 'Localidad'),
  ('11111111-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000003', 'Iglesia de otra asociación', 'Calle 4', 'Localidad');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sincargo@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'otra@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'vecina@prueba.example.com');

insert into public.cargos (usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('bbbbbbbb-0000-4000-8000-000000000003', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000004', null, null),
  ('bbbbbbbb-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000002', null, null);

insert into public.eventos (id, titulo, lugar, descripcion, alcance, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id, hora, fecha_fin) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Culto joven', 'Templo', null, 'iglesia', '11111111-0000-4000-8000-000000000001', null, null, '19:00', null),
  ('eeeeeeee-0000-4000-8000-000000000002', 'Culto del otro distrito', null, null, 'iglesia', '11111111-0000-4000-8000-000000000003', null, null, '18:00', null),
  ('eeeeeeee-0000-4000-8000-000000000003', 'Congreso de Jóvenes', null, null, 'distrito', null, 'dddddddd-0000-4000-8000-000000000001', null, '09:00', null),
  ('eeeeeeee-0000-4000-8000-000000000004', 'Campamento', null, 'Traer carpa', 'asociacion', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', '08:00', '2026-11-16'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'Compartido 100%', null, null, 'iglesia', '11111111-0000-4000-8000-000000000003', null, null, '20:00', null),
  ('eeeeeeee-0000-4000-8000-000000000006', 'Culto de otra asociación', null, null, 'iglesia', '11111111-0000-4000-8000-000000000004', null, null, '19:00', null),
  ('eeeeeeee-0000-4000-8000-000000000007', 'Culto de oración', null, null, 'iglesia', '11111111-0000-4000-8000-000000000001', null, null, '19:00', null);

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000002', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000003', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-10'),
  ('eeeeeeee-0000-4000-8000-000000000005', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000006', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000007', '2026-11-21'),
  ('eeeeeeee-0000-4000-8000-000000000007', '2026-11-28');

-- The Iglesia de otro distrito shares one evento with the Iglesia del encargado.
insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000001');

-- The Iglesia vecina shares one evento with the Iglesia del encargado: the
-- pastor sees it both by the alcance of the Iglesia vecina and as sumado to the
-- Iglesia del encargado.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000009', 'Vigilia compartida', 'iglesia', '11111111-0000-4000-8000-000000000002', '21:00');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000009', '2026-11-17');

insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000001');

-- A weekly series of the Iglesia del encargado with an excepcion on each of its
-- dates but 2026-11-28: one with a lugar of the list, one with its lugar
-- emptied, a changed one, one moved inside December, one moved to January and
-- a deleted one, which lost its row in eventos_fechas.
insert into public.lugares (id, nombre, duenio_iglesia_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'Salón de jóvenes', '11111111-0000-4000-8000-000000000001');

insert into public.eventos (id, titulo, lugar, descripcion, enfasis, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie) values
  ('eeeeeeee-0000-4000-8000-000000000008', 'Estudio bíblico', 'Templo', 'Para todos', 'discipulado', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', 'semanal', '2026-12-31');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-11-21'),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-11-28'),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-05'),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-12'),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-19');

insert into public.excepciones (evento_id, fecha, cambia_lugar, lugar, lugar_id) values
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-11-07', true, null, 'cccccccc-0000-4000-8000-000000000001'),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-11-21', true, null, null);

insert into public.excepciones (evento_id, fecha, fecha_nueva, titulo, hora, cambia_lugar, lugar, cambia_descripcion, descripcion, cambia_enfasis, enfasis, borrada) values
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-05', null, 'Estudio especial', '10:00', true, 'Salón', true, null, true, null, false),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-12', '2026-12-14', null, null, false, null, false, null, false, null, false),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-19', '2027-01-04', null, null, false, null, false, null, false, null, false),
  ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-26', null, null, null, false, null, false, null, false, null, true);

-- The functions themselves -----------------------------------------------------------

select isnt_definer('public', 'buscar_eventos', array['date', 'date', 'text', 'integer']);
select function_privs_are(
  'public', 'buscar_eventos', array['date', 'date', 'text', 'integer'], 'anon', array[]::text[],
  'anon cannot execute buscar_eventos'
);
select function_privs_are(
  'public', 'buscar_eventos', array['date', 'date', 'text', 'integer'], 'authenticated', array['EXECUTE'],
  'authenticated can execute buscar_eventos'
);
select isnt_definer('public', 'get_zona_horaria_de_usuario', array[]::text[]);
select function_privs_are(
  'public', 'get_zona_horaria_de_usuario', array[]::text[], 'anon', array[]::text[],
  'anon cannot execute get_zona_horaria_de_usuario'
);

-- Without a sesion (anon): the hermano has no chat ---------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.buscar_eventos('2026-11-14', '2026-11-14') $$,
  '42501', 'permission denied for function buscar_eventos', 'anon cannot search eventos'
);

-- The encargado ---------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20) $$,
  $$ values
       ('eeeeeeee-0000-4000-8000-000000000004'),
       ('eeeeeeee-0000-4000-8000-000000000003'),
       ('eeeeeeee-0000-4000-8000-000000000001'),
       ('eeeeeeee-0000-4000-8000-000000000005') $$,
  'the encargado finds the eventos of their iglesia, distrito and asociacion and those sumados to it, in order of fecha and hora'
);
select is_empty(
  $$ select 1 from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20)
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  'the encargado does not find an evento of an iglesia of another distrito, though anyone can read it'
);
select is_empty(
  $$ select 1 from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20)
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000006' $$,
  'the encargado does not find an evento of another asociacion'
);
select results_eq(
  $$ select count(*)::integer, min(total)::integer, max(total)::integer
     from public.buscar_eventos('2026-11-14', '2026-11-14') $$,
  $$ values (3, 4, 4) $$,
  'by default it returns the first three, each with the total of coincidencias'
);
select results_eq(
  $$ select duenio from public.buscar_eventos('2026-11-14', '2026-11-14', 'compartido') $$,
  $$ values ('Iglesia de otro distrito') $$,
  'the encargado of an iglesia sumada finds the evento shared with it, which says the iglesia that owns it'
);
select results_eq(
  $$ select duenio, lugar from public.buscar_eventos('2026-11-14', '2026-11-14', 'culto joven') $$,
  $$ values ('Iglesia del encargado', 'Templo') $$,
  'each coincidencia says its duenio and its lugar'
);
select results_eq(
  $$ select duenio from public.buscar_eventos('2026-11-14', '2026-11-14', 'congreso') $$,
  $$ values ('Distrito del pastor') $$,
  'an evento of distrito says the nombre of its distrito'
);
select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', '  CONGRESO   jovenes ') $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000003') $$,
  'texto matches every word, without caring about capitals, accents or spaces'
);
select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', 'joven') $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000003'), ('eeeeeeee-0000-4000-8000-000000000001') $$,
  'a word can be part of a longer one'
);
select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', 'carpa') $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000004') $$,
  'texto also looks in the descripcion'
);
select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', '100%') $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000005') $$,
  'a % in texto is just a character'
);
select is_empty(
  $$ select 1 from public.buscar_eventos('2026-11-14', '2026-11-14', 'culto del otro') $$,
  'texto does not reach eventos outside the calendario of the usuario'
);
select results_eq(
  $$ select evento_id::text, fecha from public.buscar_eventos('2026-11-15', '2026-11-15') $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-10'::date) $$,
  'an evento of several days falls on every day of its range'
);
select results_eq(
  $$ select fecha, total::integer from public.buscar_eventos('2026-11-20', '2026-11-30', 'oracion') $$,
  $$ values ('2026-11-21'::date, 2), ('2026-11-28'::date, 2) $$,
  'a series has one coincidencia per date'
);
select throws_ok(
  $$ select * from public.buscar_eventos('2026-11-14', '2026-11-13') $$,
  '22023', 'A busqueda goes from desde to hasta, at most 366 days later',
  'hasta cannot be before desde'
);
select throws_ok(
  $$ select * from public.buscar_eventos('2026-01-01', '2027-01-03') $$,
  '22023', 'A busqueda goes from desde to hasta, at most 366 days later',
  'a busqueda cannot span more than a year'
);
select throws_ok(
  $$ select * from public.buscar_eventos('2026-11-14', '2026-11-14', null, 21) $$,
  '22023', 'A busqueda returns from 1 to 20 eventos',
  'a busqueda cannot return more than 20 eventos'
);
select results_eq(
  $$ select titulo, hora, lugar, descripcion, enfasis::text
     from public.buscar_eventos('2026-11-28', '2026-11-28', 'estudio') $$,
  $$ values ('Estudio bíblico', '19:00'::time, 'Templo', 'Para todos', 'discipulado') $$,
  'a date of a series without an excepcion shows the fields of the series'
);
select results_eq(
  $$ select lugar from public.buscar_eventos('2026-11-07', '2026-11-07', 'estudio') $$,
  $$ values ('Salón de jóvenes') $$,
  'a date whose excepcion picks a lugar of the list shows its nombre'
);
select results_eq(
  $$ select lugar from public.buscar_eventos('2026-11-21', '2026-11-21', 'estudio') $$,
  $$ values (null::text) $$,
  'a date whose excepcion empties the lugar shows none, not the one of the series'
);
select results_eq(
  $$ select fecha, titulo, hora, lugar, descripcion, enfasis::text
     from public.buscar_eventos('2026-12-05', '2026-12-05', null, 20)
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000008' $$,
  $$ values ('2026-12-05'::date, 'Estudio especial', '10:00'::time, 'Salón', null::text, null::text) $$,
  'a date with an excepcion shows its own titulo, hora, lugar, descripcion and enfasis'
);
select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-12-01', '2026-12-31', 'especial salon') $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000008') $$,
  'texto looks in the fields of the date itself'
);
select results_eq(
  $$ select fecha, hora from public.buscar_eventos('2026-12-14', '2026-12-14', null, 20)
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000008' $$,
  $$ values ('2026-12-14'::date, '19:00'::time) $$,
  'a date moved inside the range is found on the day it moved to'
);
select is_empty(
  $$ select 1 from public.buscar_eventos('2026-12-12', '2026-12-12', null, 20)
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000008' $$,
  'a moved date is not found on its original day'
);
select results_eq(
  $$ select fecha, total::integer from public.buscar_eventos('2026-12-01', '2026-12-31', 'estudio', 20) $$,
  $$ values ('2026-12-05'::date, 2), ('2026-12-14'::date, 2) $$,
  'a date moved outside the range and a deleted date are not found in it'
);
select results_eq(
  $$ select fecha from public.buscar_eventos('2027-01-01', '2027-01-31', 'estudio') $$,
  $$ values ('2027-01-04'::date) $$,
  'a date moved outside the range of the series is found on the day it moved to'
);
select is(
  public.get_zona_horaria_de_usuario(), 'America/Argentina/Buenos_Aires',
  'the zona horaria of the encargado is the one of their asociacion'
);

-- The pastor ------------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20) $$,
  $$ values
       ('eeeeeeee-0000-4000-8000-000000000004'),
       ('eeeeeeee-0000-4000-8000-000000000003'),
       ('eeeeeeee-0000-4000-8000-000000000001'),
       ('eeeeeeee-0000-4000-8000-000000000005') $$,
  'the pastor finds the calendarios of the iglesias of their distrito, and not those of another distrito'
);

select results_eq(
  $$ select evento_id::text, duenio, total::integer
     from public.buscar_eventos('2026-11-17', '2026-11-17', null, 20) $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000009', 'Iglesia vecina', 1) $$,
  'an evento the pastor sees both by its alcance and as sumado is found once'
);

-- The encargado of the Iglesia vecina -----------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';

select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-17', '2026-11-17', null, 20) $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000009') $$,
  'the encargado of the Iglesia vecina finds the eventos of their own iglesia'
);
select is_empty(
  $$ select 1 from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20)
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000005' $$,
  'an iglesia that neither owns an evento nor is sumada to it does not find it, though it shares their asociacion'
);

-- The admin -------------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20) $$,
  $$ values
       ('eeeeeeee-0000-4000-8000-000000000004'),
       ('eeeeeeee-0000-4000-8000-000000000003'),
       ('eeeeeeee-0000-4000-8000-000000000002'),
       ('eeeeeeee-0000-4000-8000-000000000001'),
       ('eeeeeeee-0000-4000-8000-000000000005') $$,
  'the admin finds every iglesia of their asociacion, and not those of another one'
);

-- A usuario of another asociacion -----------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

select results_eq(
  $$ select evento_id::text from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20) $$,
  $$ values ('eeeeeeee-0000-4000-8000-000000000006') $$,
  'an encargado of another asociacion finds only their own calendario'
);
select is(
  public.get_zona_horaria_de_usuario(), 'America/Sao_Paulo',
  'the zona horaria is the one of the asociacion of the usuario'
);

-- A usuario without cargos ------------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select is_empty(
  $$ select 1 from public.buscar_eventos('2026-11-14', '2026-11-14', null, 20) $$,
  'a usuario without cargos has no calendario to search'
);
select is(
  public.get_zona_horaria_de_usuario(), null,
  'a usuario without cargos has no zona horaria'
);

select * from finish();

rollback;
