-- Permission tests for naming and removing a secretaria de iglesia with
-- public.editar_cargo (issue #157): the pastor of the distrito and the admin
-- of the asociacion change the mark of secretaria of a cargo on an iglesia; a
-- secretaria never does, and a null mark leaves it as it is.
--
-- Acting as a usuario works as in cargos_permisos.test.sql: the `authenticated`
-- role and the claims of the session, which is where auth.uid() reads from.
--
-- The structure of the fixtures, with who holds each cargo:
--
--   Asociación de la prueba: the admin
--     Distrito del pastor: the pastor
--       Iglesia del pastor: a secretaria and two encargados
--     Otro distrito: another pastor
--       Iglesia de otro distrito: one encargado
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito del pastor'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Otro distrito');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del pastor', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia de otro distrito', 'Calle 2', 'Ciudad', 'Provincia');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'secretaria@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'otro-encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'de-otro-distrito@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'otro-pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'admin@prueba.example.com');

insert into public.perfiles (usuario_id, nombre) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Secretaria'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Encargado'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'Otro encargado'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'De otro distrito'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'Pastor'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'Otro pastor'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'Admin');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id, es_secretaria, funcion) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null, true, 'Secretaria'),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', null, null, false, 'Tesorero'),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', null, null, false, null),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000002', null, null, false, null),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000005', null, 'dddddddd-0000-4000-8000-000000000001', null, false, null),
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000006', null, 'dddddddd-0000-4000-8000-000000000002', null, false, null),
  ('cccccccc-0000-4000-8000-000000000007', 'bbbbbbbb-0000-4000-8000-000000000007', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', false, null);

create function pg_temp.es_secretaria(cargo_id uuid) returns boolean
language sql as $$ select es_secretaria from public.cargos where id = cargo_id $$;

-- A secretaria ------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000002', 'Encargado', 'Tesorero', true) $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a secretaria does not name another secretaria'
);
select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000002', 'Encargado', 'Tesorero', false) $$,
  'allowed: a secretaria edits an encargado and leaves them an encargado'
);
select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000003', 'Otro encargado', 'Diácono') $$,
  'allowed: a secretaria edits an encargado without saying the mark'
);

reset role;

select is(pg_temp.es_secretaria('cccccccc-0000-4000-8000-000000000002'), false,
  'the encargado the secretaria tried to name is still an encargado');

-- A pastor of another distrito ----------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';

select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000002', 'Encargado', null, true) $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a pastor does not name a secretaria in another distrito'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000001', 'Secretaria', null, false) $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a pastor does not remove a secretaria of another distrito'
);

-- The pastor of the distrito --------------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000002', 'Encargado', 'Tesorero', true) $$,
  'allowed: the pastor names an encargado of their distrito secretaria'
);
select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000001', 'Secretaria', 'Secretaria') $$,
  'allowed: the pastor edits a secretaria without saying the mark'
);
select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000003', 'Otro encargado', null, false) $$,
  'allowed: the pastor leaves an encargado an encargado'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000004', 'De otro distrito', null, true) $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: the pastor does not name a secretaria of another distrito'
);

reset role;

select is(pg_temp.es_secretaria('cccccccc-0000-4000-8000-000000000002'), true,
  'the encargado the pastor named is a secretaria');
select is(pg_temp.es_secretaria('cccccccc-0000-4000-8000-000000000001'), true,
  'a null mark leaves the secretaria a secretaria');
select is(pg_temp.es_secretaria('cccccccc-0000-4000-8000-000000000004'), false,
  'the encargado of the other distrito is still an encargado');

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000001', 'Secretaria', 'Secretaria', false) $$,
  'allowed: the pastor removes the mark of a secretaria of their distrito'
);

-- The admin --------------------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';

select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000004', 'De otro distrito', null, true) $$,
  'allowed: the admin names a secretaria in any distrito of their asociacion'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000005', 'Pastor', null, true) $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a cargo on a distrito is never a secretaria de iglesia'
);

reset role;

select results_eq(
  $$ select id, es_secretaria from public.cargos
     where id in ('cccccccc-0000-4000-8000-000000000001', 'cccccccc-0000-4000-8000-000000000004')
     order by id $$,
  $$ values ('cccccccc-0000-4000-8000-000000000001'::uuid, false),
            ('cccccccc-0000-4000-8000-000000000004'::uuid, true) $$,
  'the pastor removed one mark and the admin gave another'
);

select * from finish();

rollback;
