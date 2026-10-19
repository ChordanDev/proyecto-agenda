-- Permission tests for public.excepciones, public.guardar_excepcion and
-- public.borrar_fecha, and how public.guardar_evento keeps the excepciones
-- when it saves the series again.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(67);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito de la prueba');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia duenia', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia sumada', 'Calle 2', 'Ciudad', 'Provincia');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'duenio@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'sumada@prueba.example.com');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002', null, null);

-- A weekly series of the iglesia duenia, shared with the other iglesia; an
-- evento that does not repeat; and a series with a single date left.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Culto joven', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', 'semanal', '2026-11-28'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'Serie corta', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', 'semanal', '2026-11-07');

insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000002', 'Una sola vez', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-21'),
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-28'),
  ('eeeeeeee-0000-4000-8000-000000000002', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000003', '2026-11-07');

insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002');

-- The functions themselves ---------------------------------------------------------

select isnt_definer(
  'public', 'guardar_excepcion',
  array['uuid', 'date', 'date', 'text', 'time without time zone', 'boolean', 'text', 'uuid', 'boolean', 'text', 'boolean', 'enfasis']
);
select function_privs_are(
  'public', 'guardar_excepcion',
  array['uuid', 'date', 'date', 'text', 'time without time zone', 'boolean', 'text', 'uuid', 'boolean', 'text', 'boolean', 'enfasis'],
  'anon', array[]::text[],
  'anon cannot execute guardar_excepcion'
);
select function_privs_are(
  'public', 'guardar_excepcion',
  array['uuid', 'date', 'date', 'text', 'time without time zone', 'boolean', 'text', 'uuid', 'boolean', 'text', 'boolean', 'enfasis'],
  'authenticated', array['EXECUTE'],
  'authenticated can execute guardar_excepcion'
);
select isnt_definer('public', 'borrar_fecha', array['uuid', 'date']);
select function_privs_are(
  'public', 'borrar_fecha', array['uuid', 'date'], 'anon', array[]::text[],
  'anon cannot execute borrar_fecha'
);
select function_privs_are(
  'public', 'borrar_fecha', array['uuid', 'date'], 'authenticated', array['EXECUTE'],
  'authenticated can execute borrar_fecha'
);
select isnt_definer('public', 'puede_editar_evento', array['uuid']);
select function_privs_are(
  'public', 'puede_editar_evento', array['uuid'], 'anon', array[]::text[],
  'anon cannot execute puede_editar_evento'
);

-- The encargado of the iglesia duenia ------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: a date changes its hora, and only its hora.
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-14',
    hora => '20:00') $$,
  'the encargado of the duenio changes the hora of a date'
);
select results_eq(
  $$ select hora, titulo, fecha_nueva, cambia_lugar, cambia_descripcion, cambia_enfasis, borrada
     from public.excepciones
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' and fecha = '2026-11-14' $$,
  $$ values ('20:00'::time, null::text, null::date, false, false, false, false) $$,
  'the excepcion keeps only the hora'
);

-- Allowed: the enfasis of a date becomes the actividad regular (null).
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-28',
    titulo => 'Culto joven especial',
    cambia_enfasis => true,
    enfasis => null) $$,
  'a date changes its titulo and loses its enfasis'
);

-- Allowed: a single date is deleted; the others stay.
select lives_ok(
  $$ select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000001', '2026-11-21') $$,
  'the encargado of the duenio deletes a date'
);
select results_eq(
  $$ select fecha from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values ('2026-11-07'::date), ('2026-11-14'), ('2026-11-28') $$,
  'the deleted date leaves the dates of the series'
);
select ok(
  (select borrada from public.excepciones
   where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' and fecha = '2026-11-21'),
  'the deleted date keeps an excepcion that says so'
);
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-21',
    titulo => 'Ya no existe') $$,
  '23514', null, 'a deleted date cannot be changed'
);
select lives_ok(
  $$ select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000001', '2026-11-21') $$,
  'deleting a deleted date again finds it done'
);

-- Rejected: a date cannot move onto another date of the series.
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-07',
    fecha_nueva => '2026-11-14') $$,
  '23514', null, 'a date cannot move onto another date of the series'
);

-- Allowed: a date moves to a day of no other date, the deleted one included.
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-07',
    fecha_nueva => '2026-11-10') $$,
  'a date moves to another day'
);
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-28',
    titulo => 'Culto joven especial',
    cambia_enfasis => true,
    fecha_nueva => '2026-11-21') $$,
  'a date moves onto the day of a deleted date'
);

-- Rejected: a date cannot move onto the day another date moved to.
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-14',
    hora => '20:00',
    fecha_nueva => '2026-11-10') $$,
  '23514', null, 'a date cannot move onto the day another date moved to'
);

-- Rejected: 11-07 sits on 11-10 now, so a date moved there cannot come back
-- to its own day: first 11-14 moves to 11-15, then 11-07 takes 11-14.
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-14',
    hora => '20:00',
    fecha_nueva => '2026-11-15') $$,
  'a date moves away from its own day'
);
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-07',
    fecha_nueva => '2026-11-14') $$,
  'another date takes the day it left'
);
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-14',
    hora => '20:00') $$,
  '23514', null, 'a date cannot come back to its own day once another moved there'
);

-- Written to the table, past the function, it fails when the check runs.
set constraints all immediate;
select throws_ok(
  $$ delete from public.excepciones
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' and fecha = '2026-11-14' $$,
  '23514', null, 'deleting the excepcion of a date whose day another took is rejected'
);
select throws_ok(
  $$ update public.excepciones set fecha_nueva = null
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' and fecha = '2026-11-14' $$,
  '23514', null, 'undoing the move of a date whose day another took is rejected'
);
set constraints all deferred;

-- Back to how they were: 11-07 on 11-10, 11-14 on its day at 20:00.
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-07',
    fecha_nueva => '2026-11-10') $$,
  '11-07 moves back to 11-10'
);
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-14',
    hora => '20:00') $$,
  '11-14 comes back to its own day, free again'
);

-- Rejected: an evento that does not repeat has no excepciones.
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000002',
    fecha => '2026-11-07',
    hora => '20:00') $$,
  '23514', null, 'an evento that does not repeat has no excepciones'
);
select throws_ok(
  $$ select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000002', '2026-11-07') $$,
  '22023', null, 'the only date of an evento is deleted with the evento'
);

-- Rejected: a series never stays without dates.
select throws_ok(
  $$ select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000003', '2026-11-07') $$,
  '22023', null, 'the last date of a series is deleted with the series'
);

-- Rejected: a day that is not a date of the series.
select throws_ok(
  $$ select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000001', '2026-11-08') $$,
  '23514', null, 'a day that is not a date of the series cannot be deleted'
);
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-08',
    hora => '20:00') $$,
  '23514', null, 'a day that is not a date of the series cannot change'
);

-- Allowed: a call that changes nothing takes the date back to the series.
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000003',
    fecha => '2026-11-07',
    titulo => 'Por un rato') $$,
  'a date of the short series changes its titulo'
);
select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000003',
    fecha => '2026-11-07') $$,
  'the date goes back to the series'
);
select is_empty(
  $$ select 1 from public.excepciones where evento_id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  'a date that changes nothing has no excepcion'
);

reset role;

-- The encargado of the iglesia sumada ------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-14',
    titulo => 'De la sumada') $$,
  'P0002', null, 'the encargado of an iglesia sumada cannot change a date'
);
select throws_ok(
  $$ select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14') $$,
  'P0002', null, 'the encargado of an iglesia sumada cannot delete a date'
);
select throws_ok(
  $$ insert into public.excepciones (evento_id, fecha, titulo)
     values ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14', 'De la sumada') $$,
  '42501', null, 'the encargado of an iglesia sumada cannot insert an excepcion'
);

-- The policy hides the rows: updating or deleting changes nothing.
update public.excepciones set titulo = 'De la sumada'
where evento_id = 'eeeeeeee-0000-4000-8000-000000000001';
delete from public.excepciones
where evento_id = 'eeeeeeee-0000-4000-8000-000000000001';

-- The iglesia sumada sees the excepciones of the duenio as they are.
select results_eq(
  $$ select fecha, fecha_nueva, titulo, hora, borrada from public.excepciones
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values
    ('2026-11-07'::date, '2026-11-10'::date, null::text, null::time, false),
    ('2026-11-14', null, null, '20:00', false),
    ('2026-11-21', null, null, null, true),
    ('2026-11-28', '2026-11-21', 'Culto joven especial', null, false) $$,
  'the iglesia sumada reads the excepciones and changes none'
);

reset role;

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    fecha => '2026-11-14',
    titulo => 'Del hermano') $$,
  '42501', 'permission denied for function guardar_excepcion', 'anon cannot change a date'
);
select throws_ok(
  $$ select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14') $$,
  '42501', 'permission denied for function borrar_fecha', 'anon cannot delete a date'
);
select throws_ok(
  $$ insert into public.excepciones (evento_id, fecha, titulo)
     values ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14', 'Del hermano') $$,
  '42501', null, 'anon cannot insert an excepcion'
);
select is(
  (select count(*)::int from public.excepciones
   where evento_id = 'eeeeeeee-0000-4000-8000-000000000001'),
  4,
  'anon reads the excepciones'
);

reset role;

-- Saving the series again ------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- "Hasta" goes back one week and the series gets a new titulo: 11-28 is gone.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Culto de jóvenes',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-21',
    fechas => array['2026-11-07', '2026-11-14', '2026-11-21']::date[]) $$,
  'the series is saved with an earlier "Hasta"'
);
select results_eq(
  $$ select fecha from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values ('2026-11-07'::date), ('2026-11-14') $$,
  'the deleted date is not created again and the date out of the series is gone'
);
select results_eq(
  $$ select fecha, fecha_nueva, hora, borrada from public.excepciones
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values
    ('2026-11-07'::date, '2026-11-10'::date, null::time, false),
    ('2026-11-14', null, '20:00', false),
    ('2026-11-21', null, null, true) $$,
  'the excepciones of the dates that stay are kept, the one of the date gone is dropped'
);
select is(
  (select titulo from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001'),
  'Culto de jóvenes',
  'the series takes its new titulo'
);

-- The series now has a date on the day 11-07 moved to: that move is dropped.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Culto de jóvenes',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-21',
    fechas => array['2026-11-07', '2026-11-10', '2026-11-14']::date[]) $$,
  'the series is saved with a date on the day another moved to'
);
select results_eq(
  $$ select fecha from public.excepciones
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values ('2026-11-14'::date) $$,
  'the date moved onto a date of the series loses its excepcion'
);
select lives_ok(
  $$ set constraints all immediate $$,
  'the dates of the series still fall on different days'
);
set constraints all deferred;
select results_eq(
  $$ select fecha from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by fecha $$,
  $$ values ('2026-11-07'::date), ('2026-11-10'), ('2026-11-14') $$,
  'a date outside the deleted ones is created'
);

-- The evento stops repeating: it has no excepciones any more.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Culto de jóvenes',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[]) $$,
  'the series stops repeating'
);
select is_empty(
  $$ select 1 from public.excepciones where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'an evento that stops repeating loses its excepciones'
);

-- Deleting the series deletes its excepciones -------------------------------------

select lives_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000003',
    fecha => '2026-11-07',
    titulo => 'Antes de borrar') $$,
  'the short series gets an excepcion'
);
select lives_ok(
  $$ select public.borrar_evento('eeeeeeee-0000-4000-8000-000000000003') $$,
  'the encargado deletes the series'
);

reset role;

select is_empty(
  $$ select 1 from public.excepciones where evento_id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  'deleting the series deletes its excepciones'
);

-- A lugar that is not of the duenio is rejected, for every role.
select throws_ok(
  $$ insert into public.lugares (id, nombre, duenio_iglesia_id) values
       ('ffffffff-0000-4000-8000-000000000002', 'Salón ajeno', '11111111-0000-4000-8000-000000000002');
     insert into public.eventos_fechas (evento_id, fecha) values
       ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-21');
     update public.eventos set repeticion = 'semanal', fin_de_serie = '2026-11-28'
       where id = 'eeeeeeee-0000-4000-8000-000000000001';
     insert into public.excepciones (evento_id, fecha, cambia_lugar, lugar_id) values
       ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14', true, 'ffffffff-0000-4000-8000-000000000002') $$,
  '23514', null, 'a date cannot take a lugar of another duenio'
);

-- A save that changes the duenio resets the lugar of a moved date before it
-- drops that move onto a day the series has again: the save goes through.
insert into public.lugares (id, nombre, duenio_iglesia_id) values
  ('ffffffff-0000-4000-8000-000000000001', 'Templo', '11111111-0000-4000-8000-000000000001');
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie) values
  ('eeeeeeee-0000-4000-8000-000000000004', 'Serie con lugar', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', 'semanal', '2026-11-14');
insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-14');
insert into public.excepciones (evento_id, fecha, fecha_nueva, cambia_lugar, lugar_id) values
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-07', '2026-11-10', true, 'ffffffff-0000-4000-8000-000000000001');

select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000004',
    titulo => 'Serie con lugar',
    alcance => 'distrito',
    duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-14',
    fechas => array['2026-11-07', '2026-11-10', '2026-11-14']::date[]) $$,
  'a new duenio and a date on the day another moved to save together'
);
select is_empty(
  $$ select 1 from public.excepciones where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  'the moved date with the lugar of the old duenio loses its excepcion'
);

-- Findings of the Jorge review of #210 ------------------------------------------

insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie) values
  ('eeeeeeee-0000-4000-8000-000000000005', 'Serie sin fechas', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', 'semanal', '2026-11-21');
insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000005', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000005', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000005', '2026-11-21');

-- Two days in the series must not be the same day, for every writer.
select index_is_unique(
  'public', 'excepciones', 'excepciones_evento_fecha_nueva_key',
  'two dates of a series cannot move to the same day'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000005', '2026-11-07');
select public.borrar_fecha('eeeeeeee-0000-4000-8000-000000000005', '2026-11-14');

-- "Hasta" back to the 14th: the dates left would be the two deleted ones.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000005',
    titulo => 'Serie sin fechas',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-14',
    fechas => array['2026-11-07', '2026-11-14']::date[]) $$,
  '22023', null, 'a save that would leave the series without dates is rejected'
);
select results_eq(
  $$ select fecha from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000005' $$,
  $$ values ('2026-11-21'::date) $$,
  'the series keeps the date it had'
);

-- A call that changes nothing still needs a date of a series.
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000005',
    fecha => '2026-11-07') $$,
  '23514', null, 'a deleted date cannot go back to the series either'
);
select throws_ok(
  $$ select public.guardar_excepcion(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000002',
    fecha => '2026-11-07') $$,
  '23514', null, 'an evento that does not repeat has no date to take back'
);

-- A series has at most a year of weekly dates; a save with far more is not one.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000005',
    titulo => 'Serie sin fechas',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2028-12-31',
    fechas => (select array_agg(d::date) from generate_series('2026-11-21'::date, '2028-12-31'::date, interval '1 day') as d)) $$,
  '22023', null, 'a save with too many dates is rejected'
);

-- A series renewed for years keeps saving: each date checks only its own day.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000005',
    titulo => 'Serie sin fechas',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2032-11-20',
    fechas => (select array_agg(d::date) from generate_series('2026-11-21'::date, '2032-11-20'::date, interval '1 week') as d)) $$,
  'a series of six years of weekly dates is saved'
);
set constraints all immediate;
set constraints all deferred;

-- Written to the tables, past the functions: a date deleted and written again
-- comes back to its own day while its old move still sits on another day.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie) values
  ('eeeeeeee-0000-4000-8000-000000000006', 'Serie escrita a mano', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', 'semanal', '2026-11-14');
insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000006', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000006', '2026-11-14');
select public.guardar_excepcion(
  evento_id => 'eeeeeeee-0000-4000-8000-000000000006',
  fecha => '2026-11-07',
  fecha_nueva => '2026-11-10');
set constraints all immediate;
set constraints all deferred;

-- Each write is checked on its own, as when each is a request of its own.
delete from public.eventos_fechas
where evento_id = 'eeeeeeee-0000-4000-8000-000000000006' and fecha = '2026-11-07';
set constraints all immediate;
set constraints all deferred;
insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000006', '2026-11-10');
set constraints all immediate;
set constraints all deferred;
insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000006', '2026-11-07');
select throws_ok(
  $$ set constraints all immediate $$,
  '23514', null, 'a date written back onto the series cannot bring its old move onto a taken day'
);
set constraints all deferred;

reset role;

select * from finish();

rollback;
