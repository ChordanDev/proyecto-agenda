-- Permission tests for the lugares: who reads them, who creates them, and the
-- rule that a nombre is not repeated within a duenio.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito de la prueba');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del encargado', 'Calle 1', 'Localidad'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Otra iglesia', 'Calle 2', 'Localidad');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor@prueba.example.com');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null);

insert into public.lugares (id, nombre, duenio_iglesia_id) values
  ('ffffffff-0000-4000-8000-000000000001', 'Salón de jóvenes', '11111111-0000-4000-8000-000000000001'),
  ('ffffffff-0000-4000-8000-000000000002', 'Templo', '11111111-0000-4000-8000-000000000002');

-- The policies and the function themselves ---------------------------------------

select policies_are('public', 'lugares', array[
  'Anyone can read lugares',
  'Usuarios can insert lugares their cargos cover'
]);
select policy_cmd_is('public', 'lugares', 'Anyone can read lugares', 'select', 'lugares has a read policy');
select policy_cmd_is('public', 'lugares', 'Usuarios can insert lugares their cargos cover', 'insert', 'lugares has an insert policy');

select isnt_definer('public', 'guardar_lugar', array['text', 'uuid', 'uuid', 'uuid']);
select function_privs_are(
  'public', 'guardar_lugar', array['text', 'uuid', 'uuid', 'uuid'], 'anon', array[]::text[],
  'anon cannot execute guardar_lugar'
);
select function_privs_are(
  'public', 'guardar_lugar', array['text', 'uuid', 'uuid', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated can execute guardar_lugar'
);

-- The rules of the table ------------------------------------------------------------

select throws_ok(
  $$ insert into public.lugares (nombre, duenio_iglesia_id)
     values ('salon de JOVENES', '11111111-0000-4000-8000-000000000001') $$,
  '23505', null, 'a duenio cannot repeat a nombre, without telling capitals or accents apart'
);
select throws_ok(
  $$ insert into public.lugares (nombre, duenio_iglesia_id)
     values ('  Salón   de jóvenes ', '11111111-0000-4000-8000-000000000001') $$,
  '23505', null, 'nor with other spaces'
);
select lives_ok(
  $$ insert into public.lugares (nombre, duenio_iglesia_id)
     values ('Salón de jóvenes', '11111111-0000-4000-8000-000000000002') $$,
  'another duenio can have a lugar of the same nombre'
);
select throws_ok(
  $$ insert into public.lugares (nombre, duenio_iglesia_id) values ('   ', '11111111-0000-4000-8000-000000000001') $$,
  '23514', null, 'a lugar needs a nombre'
);
select throws_ok(
  $$ insert into public.lugares (nombre) values ('Sin dueño') $$,
  '23514', null, 'a lugar needs a duenio'
);
select throws_ok(
  $$ insert into public.lugares (nombre, duenio_iglesia_id, duenio_distrito_id)
     values ('Con dos', '11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001') $$,
  '23514', null, 'a lugar has a single duenio'
);

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

-- Allowed: reading the lugares, whose nombre the eventos show.
select isnt_empty(
  $$ select 1 from public.lugares where id = 'ffffffff-0000-4000-8000-000000000001' $$,
  'anon can read lugares'
);

-- Rejected: creating one.
select throws_ok(
  $$ insert into public.lugares (nombre, duenio_iglesia_id)
     values ('Plaza', '11111111-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for table lugares', 'anon cannot insert lugares'
);
select throws_ok(
  $$ select public.guardar_lugar(nombre => 'Plaza', duenio_iglesia_id => '11111111-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for function guardar_lugar', 'anon cannot save a lugar'
);

reset role;

-- The encargado --------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: reading the lugares, theirs and the others.
select isnt_empty(
  $$ select 1 from public.lugares where id = 'ffffffff-0000-4000-8000-000000000002' $$,
  'the encargado can read the lugares of another iglesia'
);

-- Allowed: creating a lugar of their iglesia, saved trimmed.
select results_eq(
  $$ select nombre, duenio_iglesia_id from public.guardar_lugar(
       nombre => '  Plaza   San Martín ', duenio_iglesia_id => '11111111-0000-4000-8000-000000000001') $$,
  $$ values ('Plaza San Martín'::text, '11111111-0000-4000-8000-000000000001'::uuid) $$,
  'the encargado creates a lugar of their iglesia, with single spaces'
);

-- Allowed: a nombre the list already has gives that lugar back, without a
-- second one.
select results_eq(
  $$ select id, nombre from public.guardar_lugar(
       nombre => 'salon de jovenes', duenio_iglesia_id => '11111111-0000-4000-8000-000000000001') $$,
  $$ values ('ffffffff-0000-4000-8000-000000000001'::uuid, 'Salón de jóvenes'::text) $$,
  'saving a nombre already in the list gives that lugar back'
);
select is(
  (select count(*)::int from public.lugares where duenio_iglesia_id = '11111111-0000-4000-8000-000000000001'),
  2,
  'and does not repeat it'
);

-- Rejected: a lugar of another iglesia, by the function and by the table.
select throws_ok(
  $$ select public.guardar_lugar(nombre => 'Patio', duenio_iglesia_id => '11111111-0000-4000-8000-000000000002') $$,
  '42501', 'new row violates row-level security policy for table "lugares"',
  'the encargado cannot create a lugar of another iglesia'
);
select throws_ok(
  $$ select public.guardar_lugar(nombre => 'templo', duenio_iglesia_id => '11111111-0000-4000-8000-000000000002') $$,
  '42501', 'new row violates row-level security policy for table "lugares"',
  'nor learn by it whether another iglesia has a nombre'
);
select throws_ok(
  $$ insert into public.lugares (nombre, duenio_distrito_id) values ('Campamento', 'dddddddd-0000-4000-8000-000000000001') $$,
  '42501', 'new row violates row-level security policy for table "lugares"',
  'the encargado cannot create a lugar of their distrito'
);

-- Rejected: renaming or deleting lugares, which belongs to Gestión (v2).
select throws_ok(
  $$ update public.lugares set nombre = 'Otro' where id = 'ffffffff-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table lugares', 'the encargado cannot rename a lugar'
);
select throws_ok(
  $$ delete from public.lugares where id = 'ffffffff-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table lugares', 'the encargado cannot delete a lugar'
);

reset role;

-- The pastor -----------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

-- Allowed: a lugar of their distrito and one of an iglesia of it.
select lives_ok(
  $$ select public.guardar_lugar(nombre => 'Campamento', duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001') $$,
  'the pastor creates a lugar of their distrito'
);
select lives_ok(
  $$ select public.guardar_lugar(nombre => 'Patio', duenio_iglesia_id => '11111111-0000-4000-8000-000000000002') $$,
  'the pastor creates a lugar of an iglesia of their distrito'
);

-- Rejected: a lugar of the asociacion.
select throws_ok(
  $$ select public.guardar_lugar(nombre => 'Congreso', duenio_asociacion_id => 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', 'new row violates row-level security policy for table "lugares"',
  'the pastor cannot create a lugar of the asociacion'
);

reset role;

select * from finish();

rollback;
