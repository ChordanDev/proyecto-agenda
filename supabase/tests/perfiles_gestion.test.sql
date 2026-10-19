-- Permission tests for the perfiles, the emails and the cargos that a gestor
-- reads: a secretaria de iglesia those of her iglesia, a pastor those of the
-- iglesias of their distrito, an admin all of their asociacion, and every
-- usuario their own. Without a session nothing is read.
--
-- Acting as a usuario works as in cargos_permisos.test.sql: the `authenticated`
-- role and the claims of the session, which is where auth.uid() reads from.
--
-- The structure of the fixtures, with who holds each cargo:
--
--   Asociación de la prueba: the admin and another admin
--     Distrito del pastor: the pastor and a co-pastor
--       Iglesia de las secretarias: two secretarias and two encargados
--       Iglesia vecina: one encargado
--     Otro distrito: another pastor
--       Iglesia de otro distrito: one encargado
--   Otra asociación: an admin
--     Distrito de otra asociación
--       Iglesia de otra asociación: one encargado
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(61);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Otra asociación');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito del pastor'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Otro distrito'),
  ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'Distrito de otra asociación');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia de las secretarias', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia vecina', 'Calle 2', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia de otro distrito', 'Calle 3', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000003', 'Iglesia de otra asociación', 'Calle 4', 'Ciudad', 'Provincia');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'secretaria@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'otra-secretaria@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'otro-encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'vecino@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'de-otro-distrito@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'otro-pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'de-otra-asociacion@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000011', 'authenticated', 'authenticated', 'otra-admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000012', 'authenticated', 'authenticated', 'admin-de-otra-asociacion@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000013', 'authenticated', 'authenticated', 'copastor@prueba.example.com');

insert into public.perfiles (usuario_id, nombre) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Secretaria'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Otra secretaria'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'Encargado'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'Otro encargado'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'Vecino'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'De otro distrito'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'Pastor'),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'Otro pastor'),
  ('bbbbbbbb-0000-4000-8000-000000000009', 'Admin'),
  ('bbbbbbbb-0000-4000-8000-000000000010', 'De otra asociación'),
  ('bbbbbbbb-0000-4000-8000-000000000011', 'Otra admin'),
  ('bbbbbbbb-0000-4000-8000-000000000012', 'Admin de otra asociación'),
  ('bbbbbbbb-0000-4000-8000-000000000013', 'Copastor');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id, es_secretaria, funcion) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null, true, 'Secretaria'),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', null, null, true, 'Secretaria'),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', null, null, false, 'Tesorero'),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', null, null, false, null),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000002', null, null, false, 'Anciano'),
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000003', null, null, false, null),
  ('cccccccc-0000-4000-8000-000000000007', 'bbbbbbbb-0000-4000-8000-000000000007', null, 'dddddddd-0000-4000-8000-000000000001', null, false, null),
  ('cccccccc-0000-4000-8000-000000000008', 'bbbbbbbb-0000-4000-8000-000000000008', null, 'dddddddd-0000-4000-8000-000000000002', null, false, null),
  ('cccccccc-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-000000000009', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', false, null),
  ('cccccccc-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000004', null, null, false, null),
  -- A second admin of the same asociacion, an admin of the other one, and a
  -- second pastor of the Distrito del pastor.
  ('cccccccc-0000-4000-8000-000000000011', 'bbbbbbbb-0000-4000-8000-000000000011', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', false, null),
  ('cccccccc-0000-4000-8000-000000000012', 'bbbbbbbb-0000-4000-8000-000000000012', null, null, 'aaaaaaaa-0000-4000-8000-000000000002', false, null),
  ('cccccccc-0000-4000-8000-000000000013', 'bbbbbbbb-0000-4000-8000-000000000013', null, 'dddddddd-0000-4000-8000-000000000001', null, false, null);

-- The schema --------------------------------------------------------------------------

select policies_are('public', 'perfiles', array[
  'Usuarios can read their own perfil',
  'Gestores can read the perfiles of the cargos they oversee'
]);
select policy_cmd_is('public', 'perfiles', 'Usuarios can read their own perfil', 'select', 'the own perfil is only read');
select policy_cmd_is('public', 'perfiles', 'Gestores can read the perfiles of the cargos they oversee', 'select', 'the perfiles of others are only read');
select policy_roles_are('public', 'perfiles', 'Usuarios can read their own perfil', array['authenticated']);
select policy_roles_are('public', 'perfiles', 'Gestores can read the perfiles of the cargos they oversee', array['authenticated']);
select policy_cmd_is('public', 'cargos', 'Gestores can read the cargos they oversee', 'select', 'the cargos of others are only read');
select policy_roles_are('public', 'cargos', 'Gestores can read the cargos they oversee', array['authenticated']);

select table_privs_are('public', 'perfiles', 'anon', array[]::text[], 'anon has no privilege on perfiles');
select table_privs_are('public', 'perfiles', 'authenticated', array['SELECT'], 'authenticated can only read perfiles');

select function_privs_are(
  'public', 'get_usuario_emails', array[]::text[], 'anon', array[]::text[],
  'anon cannot read emails'
);
select function_privs_are(
  'public', 'get_usuario_emails', array[]::text[], 'authenticated', array['EXECUTE'],
  'authenticated can read the emails the rule allows'
);
select function_privs_are(
  'public', 'can_read_cargo', array['uuid', 'uuid', 'uuid'], 'anon', array[]::text[],
  'anon cannot ask whether they read a cargo'
);

-- Allowed: an iglesia with two secretarias at once.
select is(
  (select count(*)::int from public.cargos
   where iglesia_id = '11111111-0000-4000-8000-000000000001' and es_secretaria),
  2,
  'an iglesia can have two secretarias at once'
);

-- Rejected: a secretaria that is not on an iglesia.
select throws_ok(
  $$ insert into public.cargos (usuario_id, distrito_id, es_secretaria)
     values ('bbbbbbbb-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002', true) $$,
  '23514',
  'new row for relation "cargos" violates check constraint "cargos_secretaria_only_on_iglesia"',
  'a secretaria is only a cargo on an iglesia'
);

-- Rejected: a blank funcion, and a blank nombre.
select throws_ok(
  $$ update public.cargos set funcion = '  ' where id = 'cccccccc-0000-4000-8000-000000000003' $$,
  '23514',
  'new row for relation "cargos" violates check constraint "cargos_funcion_not_blank"',
  'a funcion is never blank'
);
select throws_ok(
  $$ update public.perfiles set nombre = '' where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000003' $$,
  '23514',
  'new row for relation "perfiles" violates check constraint "perfiles_nombre_not_blank"',
  'a nombre is never blank'
);

-- Without a session (anon): the hermano -----------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.perfiles $$,
  '42501', 'permission denied for table perfiles', 'anon cannot read perfiles'
);
select throws_ok(
  $$ select * from public.get_usuario_emails() $$,
  '42501', 'permission denied for function get_usuario_emails', 'anon cannot read emails'
);
select throws_ok(
  $$ select * from public.cargos $$,
  '42501', 'permission denied for table cargos', 'anon cannot read cargos'
);
select throws_ok(
  $$ select public.can_read_cargo('11111111-0000-4000-8000-000000000001', null, null) $$,
  '42501', 'permission denied for function can_read_cargo', 'anon cannot ask whether they read a cargo'
);

reset role;

-- The pastor: those of the iglesias of their distrito -----------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';

-- Allowed: the encargados and secretarias of both iglesias of their distrito,
-- and themselves.
select results_eq(
  $$ select nombre from public.perfiles order by nombre $$,
  $$ values ('Encargado'), ('Otra secretaria'), ('Otro encargado'), ('Pastor'), ('Secretaria'), ('Vecino') $$,
  'the pastor reads the nombres of the encargados of their distrito'
);
select results_eq(
  $$ select email from public.get_usuario_emails() order by email $$,
  $$ values
       ('encargado@prueba.example.com'), ('otra-secretaria@prueba.example.com'),
       ('otro-encargado@prueba.example.com'), ('pastor@prueba.example.com'),
       ('secretaria@prueba.example.com'), ('vecino@prueba.example.com') $$,
  'the pastor reads the emails of the encargados of their distrito'
);
select results_eq(
  $$ select funcion from public.cargos where funcion is not null order by funcion $$,
  $$ values ('Anciano'), ('Secretaria'), ('Secretaria'), ('Tesorero') $$,
  'the pastor reads the cargos of the encargados of their distrito'
);

-- The cargos the pastor holds are only their own: whoever wants those, and not
-- the ones they oversee, filters by the usuario (getCargosDelUsuario).
select results_eq(
  $$ select id from public.cargos where usuario_id = (select auth.uid()) $$,
  $$ values ('cccccccc-0000-4000-8000-000000000007'::uuid) $$,
  'filtered by the usuario, the pastor reads only the cargo they hold'
);

-- Rejected: those of another distrito, of another asociacion, the other pastor
-- of their own distrito, and the admins above them.
select is_empty(
  $$ select 1 from public.perfiles
     where usuario_id in ('bbbbbbbb-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000008',
                          'bbbbbbbb-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-000000000010',
                          'bbbbbbbb-0000-4000-8000-000000000011', 'bbbbbbbb-0000-4000-8000-000000000013') $$,
  'the pastor does not read the nombres of another distrito'
);
select is_empty(
  $$ select 1 from public.get_usuario_emails()
     where usuario_id in ('bbbbbbbb-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000008',
                          'bbbbbbbb-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-000000000010',
                          'bbbbbbbb-0000-4000-8000-000000000011', 'bbbbbbbb-0000-4000-8000-000000000013') $$,
  'the pastor does not read the emails of another distrito'
);
select is_empty(
  $$ select 1 from public.cargos
     where id in ('cccccccc-0000-4000-8000-000000000006', 'cccccccc-0000-4000-8000-000000000008',
                  'cccccccc-0000-4000-8000-000000000009', 'cccccccc-0000-4000-8000-000000000010',
                  'cccccccc-0000-4000-8000-000000000011', 'cccccccc-0000-4000-8000-000000000013') $$,
  'the pastor does not read the cargos of another distrito'
);

-- The secretaria de iglesia: those of her iglesia ---------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: the encargados and the other secretaria of her iglesia.
select results_eq(
  $$ select nombre from public.perfiles order by nombre $$,
  $$ values ('Encargado'), ('Otra secretaria'), ('Otro encargado'), ('Secretaria') $$,
  'the secretaria reads the nombres of her iglesia'
);
select results_eq(
  $$ select email from public.get_usuario_emails() order by email $$,
  $$ values
       ('encargado@prueba.example.com'), ('otra-secretaria@prueba.example.com'),
       ('otro-encargado@prueba.example.com'), ('secretaria@prueba.example.com') $$,
  'the secretaria reads the emails of her iglesia'
);
select results_eq(
  $$ select id from public.cargos order by id $$,
  $$ values
       ('cccccccc-0000-4000-8000-000000000001'::uuid), ('cccccccc-0000-4000-8000-000000000002'::uuid),
       ('cccccccc-0000-4000-8000-000000000003'::uuid), ('cccccccc-0000-4000-8000-000000000004'::uuid) $$,
  'the secretaria reads the cargos of her iglesia'
);

-- Rejected: another iglesia of her distrito, and her pastor.
select is_empty(
  $$ select 1 from public.perfiles
     where usuario_id in ('bbbbbbbb-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000007') $$,
  'the secretaria does not read the nombres of another iglesia of her distrito'
);
select is_empty(
  $$ select 1 from public.get_usuario_emails()
     where usuario_id in ('bbbbbbbb-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000007') $$,
  'the secretaria does not read the emails of another iglesia of her distrito'
);
select is_empty(
  $$ select 1 from public.cargos
     where id in ('cccccccc-0000-4000-8000-000000000005', 'cccccccc-0000-4000-8000-000000000007') $$,
  'the secretaria does not read the cargos of another iglesia of her distrito'
);

-- A common encargado: only their own ----------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

-- Allowed: their own.
select results_eq(
  $$ select nombre from public.perfiles $$,
  $$ values ('Encargado') $$,
  'the encargado reads their own nombre'
);
select results_eq(
  $$ select email from public.get_usuario_emails() $$,
  $$ values ('encargado@prueba.example.com') $$,
  'the encargado reads their own email'
);
select results_eq(
  $$ select id from public.cargos $$,
  $$ values ('cccccccc-0000-4000-8000-000000000003'::uuid) $$,
  'the encargado reads their own cargo'
);

-- Rejected: the other encargados and the secretarias of their iglesia.
select is_empty(
  $$ select 1 from public.perfiles where usuario_id <> 'bbbbbbbb-0000-4000-8000-000000000003' $$,
  'the encargado does not read the nombres of the other encargados of their iglesia'
);
select is_empty(
  $$ select 1 from public.get_usuario_emails() where usuario_id <> 'bbbbbbbb-0000-4000-8000-000000000003' $$,
  'the encargado does not read the emails of the other encargados of their iglesia'
);
select is_empty(
  $$ select 1 from public.cargos where usuario_id <> 'bbbbbbbb-0000-4000-8000-000000000003' $$,
  'the encargado does not read the cargos of the other encargados of their iglesia'
);

-- The admin: all of their asociacion -----------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';

-- Allowed: every usuario of their asociacion, pastores and the other admin
-- included.
select results_eq(
  $$ select nombre from public.perfiles order by nombre $$,
  $$ values
       ('Admin'), ('Copastor'), ('De otro distrito'), ('Encargado'), ('Otra admin'), ('Otra secretaria'),
       ('Otro encargado'), ('Otro pastor'), ('Pastor'), ('Secretaria'), ('Vecino') $$,
  'the admin reads the nombres of all their asociacion'
);
select is(
  (select count(*)::int from public.get_usuario_emails()),
  11,
  'the admin reads the emails of all their asociacion'
);
select is(
  (select count(*)::int from public.cargos),
  11,
  'the admin reads the cargos of all their asociacion'
);

-- Allowed: the other admin of their asociacion, whom they read but never manage.
select isnt_empty(
  $$ select 1 from public.perfiles where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000011' $$,
  'the admin reads the nombre of another admin of their asociacion'
);
select isnt_empty(
  $$ select 1 from public.get_usuario_emails() where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000011' $$,
  'the admin reads the email of another admin of their asociacion'
);
select isnt_empty(
  $$ select 1 from public.cargos where id = 'cccccccc-0000-4000-8000-000000000011' $$,
  'the admin reads the cargo of another admin of their asociacion'
);

-- Rejected: another asociacion, its admin included.
select is_empty(
  $$ select 1 from public.perfiles
     where usuario_id in ('bbbbbbbb-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000012') $$,
  'the admin does not read the nombres of another asociacion'
);
select is_empty(
  $$ select 1 from public.get_usuario_emails()
     where usuario_id in ('bbbbbbbb-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000012') $$,
  'the admin does not read the emails of another asociacion'
);
select is_empty(
  $$ select 1 from public.cargos
     where id in ('cccccccc-0000-4000-8000-000000000010', 'cccccccc-0000-4000-8000-000000000012') $$,
  'the admin does not read the cargos of another asociacion'
);

-- can_read_cargo called directly -------------------------------------------------------
-- Any session can call it with any arguments. It answers only for a cargo on
-- exactly one level, and only about the cargos of the usuario who asks.

-- The admin: an iglesia of their asociacion alone is read, but not mixed with
-- another level, and nothing with no level at all.
select is(
  public.can_read_cargo('11111111-0000-4000-8000-000000000001', null, null),
  true,
  'called directly, the admin reads a cargo on an iglesia of their asociacion'
);
select is(
  public.can_read_cargo(null, null, null),
  false,
  'called directly, a cargo with no level is never read'
);
select is(
  public.can_read_cargo('11111111-0000-4000-8000-000000000001', null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  false,
  'called directly, an iglesia mixed with an asociacion is never read'
);
select is(
  public.can_read_cargo('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', null),
  false,
  'called directly, an iglesia mixed with a distrito is never read'
);

-- The pastor: nothing outside the iglesias of their distrito.
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';

select is(
  public.can_read_cargo('11111111-0000-4000-8000-000000000003', null, null),
  false,
  'called directly, the pastor does not read a cargo on an iglesia of another distrito'
);
select is(
  public.can_read_cargo(null, 'dddddddd-0000-4000-8000-000000000001', null),
  false,
  'called directly, the pastor does not read a cargo on their own distrito'
);
select is(
  public.can_read_cargo(null, null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  false,
  'called directly, the pastor does not read a cargo on their asociacion'
);

-- A common encargado: not even the cargos of their own iglesia.
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

select is(
  public.can_read_cargo('11111111-0000-4000-8000-000000000001', null, null),
  false,
  'called directly, a common encargado does not read the cargos of their iglesia'
);

-- A session without a usuario (no `sub`) reads nothing ------------------------------------

set local request.jwt.claims to '{"role": "authenticated"}';

select is_empty($$ select 1 from public.perfiles $$, 'a session without a usuario reads no perfil');
select is_empty($$ select 1 from public.get_usuario_emails() $$, 'a session without a usuario reads no email');
select is_empty($$ select 1 from public.cargos $$, 'a session without a usuario reads no cargo');

-- Nobody writes perfiles from the app ---------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000009", "role": "authenticated"}';

select throws_ok(
  $$ update public.perfiles set nombre = 'Otro nombre' $$,
  '42501', 'permission denied for table perfiles', 'the admin cannot edit a perfil from the app yet'
);

reset role;

-- A perfil goes with its usuario -----------------------------------------------------------

delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000003';

select is_empty(
  $$ select 1 from public.perfiles where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000003' $$,
  'deleting a usuario deletes their perfil'
);

select * from finish();

rollback;
