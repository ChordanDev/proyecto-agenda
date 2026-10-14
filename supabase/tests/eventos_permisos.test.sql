-- Permission tests for the event model: eventos, eventos_fechas and
-- iglesias_sumadas. They also cover the constraints that keep an evento
-- coherent (a single duenio, the series columns), the keys and cascades of its
-- dates and iglesias sumadas, and the local date and time types.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(66);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito de la prueba');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia dueña', 'Calle 1', 'Localidad'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia sumada', 'Calle 2', 'Localidad'),
  ('11111111-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000001', 'Otra iglesia', 'Calle 3', 'Localidad');

insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Evento de la prueba', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14');

insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002');

-- The policies themselves ---------------------------------------------------------
-- `policies_are` fails if someone adds a policy without updating this test.
-- Who the write policies let through is tested in cargos_permisos.test.sql.

select policies_are('public', 'eventos', array[
  'Anyone can read eventos',
  'Usuarios can insert eventos their cargos cover',
  'Usuarios can update eventos their cargos cover',
  'Usuarios can delete eventos their cargos cover'
]);
select policies_are('public', 'eventos_fechas', array[
  'Anyone can read eventos_fechas',
  'Usuarios can insert eventos_fechas their cargos cover',
  'Usuarios can update eventos_fechas their cargos cover',
  'Usuarios can delete eventos_fechas their cargos cover'
]);
select policies_are('public', 'iglesias_sumadas', array['Anyone can read iglesias_sumadas']);

select policy_cmd_is('public', 'eventos', 'Anyone can read eventos', 'select', 'eventos has a read policy');
select policy_cmd_is('public', 'eventos', 'Usuarios can insert eventos their cargos cover', 'insert', 'eventos has an insert policy');
select policy_cmd_is('public', 'eventos', 'Usuarios can update eventos their cargos cover', 'update', 'eventos has an update policy');
select policy_cmd_is('public', 'eventos', 'Usuarios can delete eventos their cargos cover', 'delete', 'eventos has a delete policy');
select policy_cmd_is('public', 'eventos_fechas', 'Anyone can read eventos_fechas', 'select', 'eventos_fechas has a read policy');
select policy_cmd_is('public', 'eventos_fechas', 'Usuarios can insert eventos_fechas their cargos cover', 'insert', 'eventos_fechas has an insert policy');
select policy_cmd_is('public', 'eventos_fechas', 'Usuarios can update eventos_fechas their cargos cover', 'update', 'eventos_fechas has an update policy');
select policy_cmd_is('public', 'eventos_fechas', 'Usuarios can delete eventos_fechas their cargos cover', 'delete', 'eventos_fechas has a delete policy');
select policy_cmd_is('public', 'iglesias_sumadas', 'Anyone can read iglesias_sumadas', 'select', 'iglesias_sumadas has a read-only policy');

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

-- Allowed: reading the eventos, their dates and their iglesias sumadas.
select isnt_empty(
  $$ select 1 from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'anon can read eventos'
);
select isnt_empty(
  $$ select 1 from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'anon can read eventos_fechas'
);
select isnt_empty(
  $$ select 1 from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'anon can read iglesias_sumadas'
);

-- Rejected: inserting raises 42501. Every row is valid, so the only thing that
-- can reject it is the lack of a policy.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Otro', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '42501', null, 'anon cannot insert eventos'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-21') $$,
  '42501', null, 'anon cannot insert eventos_fechas'
);
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003') $$,
  '42501', null, 'anon cannot insert iglesias_sumadas'
);

-- Rejected: updating and deleting raise 42501 too, anon has no write privilege.
select throws_ok(
  $$ update public.eventos set titulo = 'Cambiado' returning id $$,
  '42501', 'permission denied for table eventos', 'anon cannot update eventos'
);
select throws_ok(
  $$ update public.eventos_fechas set fecha = '2026-12-25' returning evento_id $$,
  '42501', 'permission denied for table eventos_fechas', 'anon cannot update eventos_fechas'
);
select throws_ok(
  $$ update public.iglesias_sumadas set iglesia_id = '11111111-0000-4000-8000-000000000003' returning evento_id $$,
  '42501', 'permission denied for table iglesias_sumadas', 'anon cannot update iglesias_sumadas'
);
select throws_ok(
  $$ delete from public.iglesias_sumadas returning evento_id $$,
  '42501', 'permission denied for table iglesias_sumadas', 'anon cannot delete iglesias_sumadas'
);
select throws_ok(
  $$ delete from public.eventos_fechas returning evento_id $$,
  '42501', 'permission denied for table eventos_fechas', 'anon cannot delete eventos_fechas'
);
select throws_ok(
  $$ delete from public.eventos returning id $$,
  '42501', 'permission denied for table eventos', 'anon cannot delete eventos'
);

reset role;

-- With a session (authenticated) -----------------------------------------------
-- A session alone does not add any permission over the eventos: writing takes
-- a cargo that covers the duenio. This session belongs to no usuario, so it has
-- no cargos; the usuarios with cargos are in cargos_permisos.test.sql.

set local role authenticated;

-- Allowed: reading the eventos, their dates and their iglesias sumadas.
select isnt_empty(
  $$ select 1 from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'authenticated can read eventos'
);
select isnt_empty(
  $$ select 1 from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'authenticated can read eventos_fechas'
);
select isnt_empty(
  $$ select 1 from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'authenticated can read iglesias_sumadas'
);

-- Rejected: inserting raises 42501.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Otro', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '42501', null, 'authenticated cannot insert eventos'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-21') $$,
  '42501', null, 'authenticated cannot insert eventos_fechas'
);
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003') $$,
  '42501', null, 'authenticated cannot insert iglesias_sumadas'
);

-- Rejected: with the privilege on eventos and eventos_fechas but no cargo,
-- updating and deleting affect zero rows. iglesias_sumadas has no write
-- privilege, so there they raise 42501.
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado' returning id $$,
  'authenticated cannot update eventos'
);
select is_empty(
  $$ update public.eventos_fechas set fecha = '2026-12-25' returning evento_id $$,
  'authenticated cannot update eventos_fechas'
);
select throws_ok(
  $$ update public.iglesias_sumadas set iglesia_id = '11111111-0000-4000-8000-000000000003' returning evento_id $$,
  '42501', 'permission denied for table iglesias_sumadas', 'authenticated cannot update iglesias_sumadas'
);
select throws_ok(
  $$ delete from public.iglesias_sumadas returning evento_id $$,
  '42501', 'permission denied for table iglesias_sumadas', 'authenticated cannot delete iglesias_sumadas'
);
select is_empty(
  $$ delete from public.eventos_fechas returning evento_id $$,
  'authenticated cannot delete eventos_fechas'
);
select is_empty(
  $$ delete from public.eventos returning id $$,
  'authenticated cannot delete eventos'
);

reset role;

-- The data is intact after every rejected attempt -----------------------------

select results_eq(
  $$ select titulo from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('Evento de la prueba'::text) $$,
  'the evento was neither modified nor deleted'
);
select results_eq(
  $$ select fecha from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('2026-11-14'::date) $$,
  'the date of the evento was neither modified, deleted nor joined by another'
);
select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('11111111-0000-4000-8000-000000000002'::uuid) $$,
  'the iglesia sumada was neither modified, deleted nor joined by another'
);
select is(
  (select count(*) from public.eventos where titulo in ('Otro', 'Cambiado')),
  0::bigint,
  'no evento was inserted or renamed'
);

-- A single duenio, coherent with the alcance ------------------------------------
-- From here on the superuser writes, so the only thing that can reject a row
-- is a constraint. A violated check constraint raises 23514; the expected
-- message pins each case to the constraint it is meant to exercise.

-- Allowed: one evento per alcance, with the duenio of that alcance.
select lives_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('De iglesia', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  'an evento of alcance iglesia is owned by an iglesia'
);
select lives_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_distrito_id, hora)
     values ('De distrito', 'distrito', 'dddddddd-0000-4000-8000-000000000001', '10:00') $$,
  'an evento of alcance distrito is owned by a distrito'
);
select lives_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_asociacion_id, hora)
     values ('De asociación', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000001', '10:00') $$,
  'an evento of alcance asociacion is owned by an asociacion'
);

-- Rejected: no duenio, two duenios, or a duenio of another level.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, hora)
     values ('Sin dueño', 'iglesia', '10:00') $$,
  '23514',
  'new row for relation "eventos" violates check constraint "eventos_duenio_matches_alcance"',
  'an evento without a duenio is rejected'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, duenio_distrito_id, hora)
     values ('Con dos dueños', 'iglesia', '11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', '10:00') $$,
  '23514',
  'new row for relation "eventos" violates check constraint "eventos_duenio_matches_alcance"',
  'an evento with two duenios is rejected'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Dueño de otro nivel', 'distrito', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '23514',
  'new row for relation "eventos" violates check constraint "eventos_duenio_matches_alcance"',
  'an evento whose duenio does not match its alcance is rejected'
);

-- The series columns -----------------------------------------------------------

-- Allowed: a series with its end, and an evento of several days that does not repeat.
select lives_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie)
     values ('Serie semanal', 'iglesia', '11111111-0000-4000-8000-000000000001', '20:00', 'semanal', '2027-01-27') $$,
  'a series with a fin_de_serie is accepted'
);
select lives_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora, fecha_fin)
     values ('De varios días', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', '2026-11-01') $$,
  'an evento of several days that does not repeat is accepted'
);

-- Rejected: a series without an end, an end without a series, and an evento of
-- several days that repeats.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora, repeticion)
     values ('Serie sin fin', 'iglesia', '11111111-0000-4000-8000-000000000001', '20:00', 'semanal') $$,
  '23514',
  'new row for relation "eventos" violates check constraint "eventos_fin_de_serie_iff_repeticion"',
  'a series without a fin_de_serie is rejected'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora, fin_de_serie)
     values ('Fin sin serie', 'iglesia', '11111111-0000-4000-8000-000000000001', '20:00', '2027-01-27') $$,
  '23514',
  'new row for relation "eventos" violates check constraint "eventos_fin_de_serie_iff_repeticion"',
  'a fin_de_serie on an evento that does not repeat is rejected'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora, fecha_fin, repeticion, fin_de_serie)
     values ('Varios días y serie', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00', '2026-11-01', 'mensual', '2027-01-27') $$,
  '23514',
  'new row for relation "eventos" violates check constraint "eventos_fecha_fin_excludes_repeticion"',
  'an evento with a fecha_fin that repeats is rejected'
);

-- Rejected: a blank titulo.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('   ', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '23514',
  'new row for relation "eventos" violates check constraint "eventos_titulo_not_blank"',
  'an evento with a blank titulo is rejected'
);

-- Keys and cascades ------------------------------------------------------------
-- An evento has each date once and each iglesia sumada once, and its dates and
-- iglesias sumadas do not outlive it. A violated primary key raises 23505.

-- Rejected: a date or an iglesia sumada the evento already has.
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14') $$,
  '23505',
  'duplicate key value violates unique constraint "eventos_fechas_pkey"',
  'the same date twice on an evento is rejected'
);
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002') $$,
  '23505',
  'duplicate key value violates unique constraint "iglesias_sumadas_pkey"',
  'the same iglesia sumada twice on an evento is rejected'
);

-- Allowed: deleting an evento, which takes its dates and iglesias sumadas with it.
select lives_ok(
  $$ delete from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'an evento with dates and iglesias sumadas can be deleted'
);
select is_empty(
  $$ select 1 from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'deleting an evento deletes its dates'
);
select is_empty(
  $$ select 1 from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'deleting an evento deletes its iglesias sumadas'
);

-- Local date and time ------------------------------------------------------------
-- Dates and times are stored as they are written, with no time zone, so an
-- evento never moves to another day or hour depending on the phone.

select col_type_is('public', 'eventos', 'hora', 'time without time zone', 'eventos.hora is a local time');
select col_type_is('public', 'eventos', 'fecha_fin', 'date', 'eventos.fecha_fin is a date');
select col_type_is('public', 'eventos', 'fin_de_serie', 'date', 'eventos.fin_de_serie is a date');
select col_type_is('public', 'eventos_fechas', 'fecha', 'date', 'eventos_fechas.fecha is a date');
select is_empty(
  $$ select table_name, column_name from information_schema.columns
     where table_schema = 'public'
       and table_name in ('eventos', 'eventos_fechas', 'iglesias_sumadas')
       and (data_type like 'timestamp%' or data_type = 'time with time zone') $$,
  'no column of the event model carries a time zone or a timestamp'
);

-- The indexes -----------------------------------------------------------------------
-- The read of a month looks for the eventos of several days that started before
-- it and still reach it, by their fecha_fin.

select has_index(
  'public', 'eventos', 'eventos_fecha_fin_idx', array['fecha_fin'],
  'eventos.fecha_fin is indexed'
);

-- The enums ------------------------------------------------------------------------
-- There are exactly four enfasis: the actividad regular is a null, not a label.

select enum_has_labels('public', 'enfasis', array['identidad', 'liderazgo', 'nuevas_generaciones', 'discipulado']);
select enum_has_labels('public', 'alcance', array['iglesia', 'distrito', 'asociacion']);
select enum_has_labels('public', 'repeticion', array['ninguna', 'semanal', 'mensual']);

select * from finish();
rollback;
