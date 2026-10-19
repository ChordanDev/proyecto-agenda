-- Permission tests for the phones that receive recordatorios
-- (public.guardar_dispositivo and public.get_dispositivo). A phone registers
-- and changes its own row by its token, with or without a session; it neither
-- reads nor changes the row of another token, and the tables are not read
-- directly. With cargos, a phone only follows iglesias its cargos cover, and
-- deleting the usuario deletes the phones they saved.
--
-- Acting as a usuario works as in cargos_permisos.test.sql: the `authenticated`
-- role and the claims of the session, which is where auth.uid() reads from.
--
-- The structure of the fixtures:
--
--   Asociación de la prueba: the admin
--     Distrito del pastor: the pastor
--       Iglesia del pastor: the encargado
--       Otra iglesia del pastor
--     Otro distrito
--       Iglesia de otro distrito
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(31);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito del pastor'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Otro distrito');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del pastor', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Otra iglesia del pastor', 'Calle 2', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia de otro distrito', 'Calle 3', 'Ciudad', 'Provincia');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sin-cargos@prueba.example.com');

insert into public.cargos (usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('bbbbbbbb-0000-4000-8000-000000000003', null, null, 'aaaaaaaa-0000-4000-8000-000000000001');

-- The privileges -----------------------------------------------------------------------

select function_privs_are(
  'public', 'guardar_dispositivo', array['text', 'boolean', 'uuid[]'], 'anon', array['EXECUTE'],
  'a phone without a session can save itself'
);
select function_privs_are(
  'public', 'get_dispositivo', array['text'], 'anon', array['EXECUTE'],
  'a phone without a session can read itself'
);
select function_privs_are(
  'public', 'guardar_dispositivo', array['text', 'boolean', 'uuid[]'], 'authenticated', array['EXECUTE'],
  'a phone with a session can save itself'
);
select function_privs_are(
  'public', 'get_dispositivo', array['text'], 'authenticated', array['EXECUTE'],
  'a phone with a session can read itself'
);

-- Without a session (anon) --------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.dispositivos $$,
  '42501', 'permission denied for table dispositivos',
  'anon cannot read the phones directly'
);
select throws_ok(
  $$ select * from public.dispositivos_iglesias $$,
  '42501', 'permission denied for table dispositivos_iglesias',
  'anon cannot read the iglesias of the phones directly'
);
select throws_ok(
  $$ update public.dispositivos set encendido = false $$,
  '42501', 'permission denied for table dispositivos',
  'anon cannot change the phones directly'
);

select is_empty(
  $$ select * from public.get_dispositivo('ExponentPushToken[telefono-a]') $$,
  'a phone never saved reads nothing'
);

select lives_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-a]', true, array['11111111-0000-4000-8000-000000000001']::uuid[]) $$,
  'a phone without a session registers itself with its iglesia elegida'
);
select results_eq(
  $$ select encendido, iglesia_ids, con_usuario, del_usuario from public.get_dispositivo('ExponentPushToken[telefono-a]') $$,
  $$ values (true, array['11111111-0000-4000-8000-000000000001']::uuid[], false, false) $$,
  'the phone reads what it saved, without a usuario'
);

select lives_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-a]', false, array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  'a phone without a session changes its own row'
);
select results_eq(
  $$ select encendido, iglesia_ids from public.get_dispositivo('ExponentPushToken[telefono-a]') $$,
  $$ values (false, array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  'the change replaces the switch and the iglesia'
);

select lives_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-b]', true, array['11111111-0000-4000-8000-000000000002']::uuid[]) $$,
  'another phone registers itself'
);
select results_eq(
  $$ select encendido, iglesia_ids from public.get_dispositivo('ExponentPushToken[telefono-a]') $$,
  $$ values (false, array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  'saving another token leaves the first phone as it was'
);
select is_empty(
  $$ select * from public.get_dispositivo('ExponentPushToken[telefono-c]') $$,
  'a token never saved does not read the row of another phone'
);

select throws_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-a]', true, array['11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002']::uuid[]) $$,
  '42501', 'Without cargos a phone follows only its iglesia elegida',
  'without a session a phone cannot follow two iglesias'
);
select throws_ok(
  $$ select public.guardar_dispositivo('cualquier-cosa', true, array[]::uuid[]) $$,
  '22023', 'The token is not an Expo push token',
  'only an Expo push token is saved'
);

reset role;

-- An encargado ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ select * from public.dispositivos $$,
  '42501', 'permission denied for table dispositivos',
  'a usuario cannot read the phones directly'
);
select lives_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-encargado]', true, array['11111111-0000-4000-8000-000000000001']::uuid[]) $$,
  'an encargado follows their iglesia'
);
select throws_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-encargado]', true, array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  '42501', 'The cargos do not cover every iglesia',
  'an encargado cannot follow another iglesia'
);

reset role;

-- A pastor -----------------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

select lives_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-pastor]', true, array['11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002']::uuid[]) $$,
  'a pastor follows several iglesias of their distrito'
);
select results_eq(
  $$ select encendido, iglesia_ids, con_usuario, del_usuario from public.get_dispositivo('ExponentPushToken[telefono-pastor]') $$,
  $$ values (true, array['11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002']::uuid[], true, true) $$,
  'the pastor reads the phone as saved by them'
);
select throws_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-pastor]', true, array['11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  '42501', 'The cargos do not cover every iglesia',
  'a pastor cannot follow an iglesia their cargos do not cover'
);
select results_eq(
  $$ select iglesia_ids from public.get_dispositivo('ExponentPushToken[telefono-pastor]') $$,
  $$ values (array['11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002']::uuid[]) $$,
  'the rejected change leaves the iglesias as they were'
);
select results_eq(
  $$ select con_usuario, del_usuario from public.get_dispositivo('ExponentPushToken[telefono-a]') $$,
  $$ values (false, false) $$,
  'a phone saved without a session is not the pastor''s'
);

reset role;

-- The phone of the pastor, once signed out, is not anyone's.
reset request.jwt.claims;
set local role anon;

select results_eq(
  $$ select con_usuario, del_usuario from public.get_dispositivo('ExponentPushToken[telefono-pastor]') $$,
  $$ values (true, false) $$,
  'without a session the phone was saved by a usuario who is not there'
);
select lives_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-pastor]', true, array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  'signed out, the phone follows its iglesia elegida again'
);
select results_eq(
  $$ select iglesia_ids, con_usuario from public.get_dispositivo('ExponentPushToken[telefono-pastor]') $$,
  $$ values (array['11111111-0000-4000-8000-000000000003']::uuid[], false) $$,
  'saved without a session, it no longer has a usuario'
);

reset role;

-- An admin -----------------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

select lives_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-admin]', true, array['11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  'an admin follows iglesias of any distrito of their asociacion'
);

reset role;

-- A usuario without cargos is a hermano ---------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$ select public.guardar_dispositivo('ExponentPushToken[telefono-sin-cargos]', true, array['11111111-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  '42501', 'Without cargos a phone follows only its iglesia elegida',
  'a usuario without cargos cannot follow two iglesias'
);

reset role;

-- Eliminar mi cuenta ---------------------------------------------------------------------------
-- The phones the usuario saved go with them, so the app saves the phone again
-- with the initial values of a hermano, as on signing out.

delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000001';

reset request.jwt.claims;
set local role anon;

select is_empty(
  $$ select * from public.get_dispositivo('ExponentPushToken[telefono-encargado]') $$,
  'deleting the usuario deletes the phones they saved'
);

reset role;

select * from finish();

rollback;
