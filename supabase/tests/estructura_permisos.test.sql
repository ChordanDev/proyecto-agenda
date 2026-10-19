-- Permission tests for the structure: asociaciones, distritos and iglesias.
--
-- How permission tests are written in this project:
--   1. Everything runs inside a transaction that is rolled back at the end, so
--      a test never leaves data behind and does not depend on the seed.
--   2. Fixtures are created first, as the superuser (row level security does
--      not apply to it).
--   3. `set local role` switches to the role under test. Each block has at
--      least one ALLOWED case and one REJECTED case.
--   4. How a rejection looks depends on the command:
--        - Where the role has no privilege on the table, any write (INSERT,
--          UPDATE or DELETE) raises error 42501. anon has no write privilege
--          on the structure, and authenticated only on some columns of
--          distritos and iglesias.
--        - Where the role has the privilege but no policy covers the row,
--          INSERT raises 42501, while UPDATE and DELETE raise nothing: they
--          simply affect zero rows. The test asserts that `returning` gives
--          back no row, and checks at the end that the data is intact.
--      Privileges are taken away from the API roles in
--      20261014000000_revoke_default_table_privileges.sql, and
--      privilegios_tablas.test.sql checks exactly which ones remain.
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

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia de la prueba', 'Calle 1', 'Ciudad', 'Provincia');

-- The policies themselves ---------------------------------------------------------
-- `policies_are` fails if someone adds a policy (for example, a write policy)
-- without updating this test.

select policies_are('public', 'asociaciones', array['Anyone can read asociaciones']);
-- The admin writes distritos and iglesias: distritos_iglesias_escritura.test.sql.
select policies_are('public', 'distritos', array[
  'Anyone can read distritos',
  'Admins can insert distritos of their asociacion',
  'Admins can update distritos of their asociacion'
]);
select policies_are('public', 'iglesias', array[
  'Anyone can read iglesias',
  'Admins can insert iglesias of their asociacion',
  'Admins can update iglesias of their asociacion'
]);

select policy_cmd_is('public', 'asociaciones', 'Anyone can read asociaciones', 'select', 'asociaciones has a read-only policy');
select policy_cmd_is('public', 'distritos', 'Anyone can read distritos', 'select', 'distritos has a read policy');
select policy_cmd_is('public', 'iglesias', 'Anyone can read iglesias', 'select', 'iglesias has a read policy');

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

-- Allowed: reading the structure.
select isnt_empty(
  $$ select 1 from public.asociaciones where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  'anon can read asociaciones'
);
select isnt_empty(
  $$ select 1 from public.distritos where id = 'dddddddd-0000-4000-8000-000000000001' $$,
  'anon can read distritos'
);
select isnt_empty(
  $$ select 1 from public.iglesias where id = '11111111-0000-4000-8000-000000000001' $$,
  'anon can read iglesias'
);

-- Rejected: inserting raises 42501.
select throws_ok(
  $$ insert into public.asociaciones (nombre) values ('Otra') $$,
  '42501', null, 'anon cannot insert asociaciones'
);
select throws_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'Otro') $$,
  '42501', null, 'anon cannot insert distritos'
);
select throws_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, ciudad, provincia)
     values ('dddddddd-0000-4000-8000-000000000001', 'Otra', 'Calle 2', 'Ciudad', 'Provincia') $$,
  '42501', null, 'anon cannot insert iglesias'
);

-- Rejected: updating and deleting raise 42501 too, there is no privilege.
select throws_ok(
  $$ update public.asociaciones set nombre = 'Cambiada' returning id $$,
  '42501', 'permission denied for table asociaciones', 'anon cannot update asociaciones'
);
select throws_ok(
  $$ update public.distritos set nombre = 'Cambiado' returning id $$,
  '42501', 'permission denied for table distritos', 'anon cannot update distritos'
);
select throws_ok(
  $$ update public.iglesias set nombre = 'Cambiada' returning id $$,
  '42501', 'permission denied for table iglesias', 'anon cannot update iglesias'
);
select throws_ok(
  $$ delete from public.iglesias returning id $$,
  '42501', 'permission denied for table iglesias', 'anon cannot delete iglesias'
);
select throws_ok(
  $$ delete from public.distritos returning id $$,
  '42501', 'permission denied for table distritos', 'anon cannot delete distritos'
);
select throws_ok(
  $$ delete from public.asociaciones returning id $$,
  '42501', 'permission denied for table asociaciones', 'anon cannot delete asociaciones'
);

reset role;

-- With a session (authenticated) -----------------------------------------------
-- A session without a cargo does not add any permission over the structure.
-- The admin writes distritos and iglesias through the columns granted to
-- authenticated: those writes are in distritos_iglesias_escritura.test.sql.

set local role authenticated;

-- Allowed: reading the structure.
select isnt_empty(
  $$ select 1 from public.iglesias where id = '11111111-0000-4000-8000-000000000001' $$,
  'authenticated can read iglesias'
);

-- Rejected: inserting raises 42501.
select throws_ok(
  $$ insert into public.asociaciones (nombre) values ('Otra') $$,
  '42501', null, 'authenticated cannot insert asociaciones'
);
select throws_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'Otro') $$,
  '42501', null, 'authenticated cannot insert distritos'
);
select throws_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, ciudad, provincia)
     values ('dddddddd-0000-4000-8000-000000000001', 'Otra', 'Calle 2', 'Ciudad', 'Provincia') $$,
  '42501', null, 'authenticated cannot insert iglesias'
);

-- Rejected: updating and deleting raise 42501 too, there is no privilege.
select throws_ok(
  $$ update public.iglesias set excluida_del_buscador = true returning id $$,
  '42501', 'permission denied for table iglesias', 'authenticated cannot update iglesias'
);
select throws_ok(
  $$ delete from public.iglesias returning id $$,
  '42501', 'permission denied for table iglesias', 'authenticated cannot delete iglesias'
);
select throws_ok(
  $$ delete from public.distritos returning id $$,
  '42501', 'permission denied for table distritos', 'authenticated cannot delete distritos'
);

reset role;

-- The data is intact after every rejected attempt -----------------------------

select results_eq(
  $$ select nombre, excluida_del_buscador from public.iglesias
     where id = '11111111-0000-4000-8000-000000000001' $$,
  $$ values ('Iglesia de la prueba'::text, false) $$,
  'the iglesia was neither modified nor deleted'
);
select is(
  (select count(*) from public.iglesias where nombre in ('Otra', 'Cambiada')),
  0::bigint,
  'no iglesia was inserted or renamed'
);

select * from finish();
rollback;
