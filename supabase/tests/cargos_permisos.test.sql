-- Permission tests for the cargos: who reads them, and which eventos a usuario
-- can write according to the cargos they hold.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql. Two things are specific to this file:
--
--   1. A usuario is a row of auth.users. To act as one, the test switches to
--      the `authenticated` role and sets the claims of the session, which is
--      where auth.uid() reads the id of the usuario from:
--
--        set local role authenticated;
--        set local request.jwt.claims to '{"sub": "<id of the usuario>", ...}';
--
--      `reset role` goes back to the superuser, which loads and removes cargos
--      the way the developers do.
--   2. A rejected write looks different depending on what rejects it. Both
--      raise 42501, so the expected message tells them apart:
--        - a policy: `new row violates row-level security policy for table …`
--          on INSERT and on an UPDATE whose new row is not covered; zero rows
--          on an UPDATE or DELETE whose current row is not covered, but only
--          where the role has the privilege (eventos, eventos_fechas).
--        - a missing privilege (the structure but the columns the admin
--          writes, cargos, auth.users, updating iglesias_sumadas):
--          `permission denied for …`, whatever the command.
--
-- The structure of the fixtures:
--
--   Asociación de la prueba (the admin)
--     Distrito del pastor (the pastor)
--       Iglesia del encargado (the encargado)
--       Iglesia vecina
--     Otro distrito
--       Iglesia de otro distrito
--   Otra asociación
--     Distrito de otra asociación
--       Iglesia de otra asociación
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(177);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Otra asociación');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito del pastor'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Otro distrito'),
  ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'Distrito de otra asociación');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del encargado', 'Calle 1', 'Localidad'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia vecina', 'Calle 2', 'Localidad'),
  ('11111111-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia de otro distrito', 'Calle 3', 'Localidad'),
  ('11111111-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000003', 'Iglesia de otra asociación', 'Calle 4', 'Localidad');

-- The usuarios. Only what the foreign key of cargos and auth.uid() need: these
-- rows never log in.
insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sin-cargos@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'dos-cargos@prueba.example.com');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  -- The encargado, the pastor and the admin.
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  -- A usuario with two cargos that have nothing to do with each other:
  -- encargado of the Iglesia de otro distrito and pastor of the Distrito de otra
  -- asociación.
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000003', null, null),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000005', null, 'dddddddd-0000-4000-8000-000000000003', null);

-- One evento per duenio, loaded by the superuser: the duenio is the level the
-- evento belongs to, not whoever loaded it.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'De la iglesia del encargado', 'iglesia', '11111111-0000-4000-8000-000000000001', null, null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'De la iglesia vecina', 'iglesia', '11111111-0000-4000-8000-000000000002', null, null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'De la iglesia de otro distrito', 'iglesia', '11111111-0000-4000-8000-000000000003', null, null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000004', 'Del distrito del pastor', 'distrito', null, 'dddddddd-0000-4000-8000-000000000001', null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'De otro distrito', 'distrito', null, 'dddddddd-0000-4000-8000-000000000002', null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000006', 'De la asociación', 'asociacion', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000007', 'De la iglesia de otra asociación', 'iglesia', '11111111-0000-4000-8000-000000000004', null, null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000008', 'De otra asociación', 'asociacion', null, null, 'aaaaaaaa-0000-4000-8000-000000000002', '19:00'),
  -- Two more of the Iglesia del encargado: one that changes its duenio and one
  -- that gets deleted with everything that hangs from it.
  ('eeeeeeee-0000-4000-8000-000000000009', 'El que cambia de dueño', 'iglesia', '11111111-0000-4000-8000-000000000001', null, null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000010', 'El que se borra entero', 'iglesia', '11111111-0000-4000-8000-000000000001', null, null, '19:00');

-- One date each. Only the eventos of this test: the seed may be loaded.
insert into public.eventos_fechas (evento_id, fecha)
select id, '2026-11-14' from public.eventos where id::text like 'eeeeeeee-%';

insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000002');

-- The policies themselves ---------------------------------------------------------
-- `policies_are` fails if someone adds a policy (for example, one that lets a
-- usuario load cargos) without updating this test. The lists of eventos and
-- eventos_fechas are pinned in eventos_permisos.test.sql.

select policies_are('public', 'cargos', array[
  'Usuarios can read their own cargos',
  -- Pinned in perfiles_gestion.test.sql, with who reads which cargos.
  'Gestores can read the cargos they oversee'
]);
select policy_cmd_is('public', 'cargos', 'Usuarios can read their own cargos', 'select', 'cargos has a read-only policy');
select policy_roles_are('public', 'cargos', 'Usuarios can read their own cargos', array['authenticated'], 'the read policy of cargos needs a session');

-- No policy lets the app modify the asociaciones either. The admin writes
-- distritos and iglesias: distritos_iglesias_escritura.test.sql.
select policies_are('public', 'asociaciones', array['Anyone can read asociaciones']);
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

-- The write policies of the eventos need a session.
select policy_roles_are('public', 'eventos', 'Usuarios can insert eventos their cargos cover', array['authenticated']);
select policy_roles_are('public', 'eventos', 'Usuarios can update eventos their cargos cover', array['authenticated']);
select policy_roles_are('public', 'eventos', 'Usuarios can delete eventos their cargos cover', array['authenticated']);
select policy_roles_are('public', 'eventos_fechas', 'Usuarios can insert eventos_fechas their cargos cover', array['authenticated']);
select policy_roles_are('public', 'eventos_fechas', 'Usuarios can update eventos_fechas their cargos cover', array['authenticated']);
select policy_roles_are('public', 'eventos_fechas', 'Usuarios can delete eventos_fechas their cargos cover', array['authenticated']);

-- The privileges ---------------------------------------------------------------
-- cargos does not depend on the privileges Supabase gives to new tables: the
-- only one left is reading with a session.

select table_privs_are('public', 'cargos', 'anon', array[]::text[], 'anon has no privilege on cargos');
select table_privs_are('public', 'cargos', 'authenticated', array['SELECT'], 'authenticated can only read cargos');

select function_returns('public', 'cargos_abarcan_duenio', array['uuid', 'uuid', 'uuid'], 'boolean');
select volatility_is('public', 'cargos_abarcan_duenio', array['uuid', 'uuid', 'uuid'], 'stable');
-- Not a security definer: it reads cargos with the permissions of the usuario.
select isnt_definer('public', 'cargos_abarcan_duenio', array['uuid', 'uuid', 'uuid']);
select function_privs_are(
  'public', 'cargos_abarcan_duenio', array['uuid', 'uuid', 'uuid'], 'anon', array[]::text[],
  'anon cannot ask whether cargos cover a duenio'
);
select function_privs_are(
  'public', 'cargos_abarcan_duenio', array['uuid', 'uuid', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated can ask whether their cargos cover a duenio'
);

-- A cargo is an assignment to exactly one level ---------------------------------
-- The superuser writes here, so the only thing that can reject a row is a
-- constraint: a check raises 23514, a unique index 23505, a foreign key 23503.

-- Allowed: a usuario with several cargos (the fixtures gave two to one of them).
select is(
  (select count(*) from public.cargos where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000005'),
  2::bigint,
  'a usuario can have several cargos'
);

-- Rejected: no level, or more than one.
select throws_ok(
  $$ insert into public.cargos (usuario_id)
     values ('bbbbbbbb-0000-4000-8000-000000000004') $$,
  '23514',
  'new row for relation "cargos" violates check constraint "cargos_exactly_one_nivel"',
  'a cargo without a level is rejected'
);
select throws_ok(
  $$ insert into public.cargos (usuario_id, iglesia_id, distrito_id)
     values ('bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001') $$,
  '23514',
  'new row for relation "cargos" violates check constraint "cargos_exactly_one_nivel"',
  'a cargo on two levels is rejected'
);

-- Rejected: the same cargo twice, at each level.
select throws_ok(
  $$ insert into public.cargos (usuario_id, iglesia_id)
     values ('bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001') $$,
  '23505',
  'duplicate key value violates unique constraint "cargos_iglesia_id_usuario_id_key"',
  'the same cargo of encargado twice is rejected'
);
select throws_ok(
  $$ insert into public.cargos (usuario_id, distrito_id)
     values ('bbbbbbbb-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001') $$,
  '23505',
  'duplicate key value violates unique constraint "cargos_distrito_id_usuario_id_key"',
  'the same cargo of pastor twice is rejected'
);
select throws_ok(
  $$ insert into public.cargos (usuario_id, asociacion_id)
     values ('bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '23505',
  'duplicate key value violates unique constraint "cargos_asociacion_id_usuario_id_key"',
  'the same cargo of admin twice is rejected'
);

-- Rejected: a cargo of nobody, or on an iglesia that does not exist.
select throws_ok(
  $$ insert into public.cargos (usuario_id, iglesia_id)
     values ('bbbbbbbb-0000-4000-8000-000000000099', '11111111-0000-4000-8000-000000000001') $$,
  '23503', null, 'a cargo of a usuario that does not exist is rejected'
);
select throws_ok(
  $$ insert into public.cargos (usuario_id, iglesia_id)
     values ('bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000099') $$,
  '23503', null, 'a cargo on an iglesia that does not exist is rejected'
);

select has_index('public', 'cargos', 'cargos_usuario_id_idx', array['usuario_id'], 'cargos.usuario_id is indexed');

-- Without a session (anon): the hermano ---------------------------------------------
-- No data of a usuario and no cargo can be read.

set local role anon;

-- Allowed: the calendario is still public.
select isnt_empty(
  $$ select 1 from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'anon can still read eventos'
);

-- Rejected: cargos, and the names and emails of the usuarios.
select throws_ok(
  $$ select * from public.cargos $$,
  '42501', 'permission denied for table cargos', 'anon cannot read cargos'
);
select throws_ok(
  $$ select count(*) from public.cargos $$,
  '42501', 'permission denied for table cargos', 'anon cannot even count cargos'
);
select throws_ok(
  $$ select email from auth.users $$,
  '42501', 'permission denied for table users', 'anon cannot read the usuarios'
);
select throws_ok(
  $$ select identity_data from auth.identities $$,
  '42501', 'permission denied for table identities', 'anon cannot read the identities of the usuarios'
);
select throws_ok(
  $$ select public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001', null, null) $$,
  '42501', 'permission denied for function cargos_abarcan_duenio', 'anon cannot ask whether cargos cover a duenio'
);

-- Rejected: writing cargos.
select throws_ok(
  $$ insert into public.cargos (usuario_id, asociacion_id)
     values ('bbbbbbbb-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for table cargos', 'anon cannot insert cargos'
);

reset role;

-- With a session: each usuario reads only their own cargos ------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: their own cargo.
select results_eq(
  $$ select id from public.cargos $$,
  $$ values ('cccccccc-0000-4000-8000-000000000001'::uuid) $$,
  'the encargado reads their cargo and no other'
);

-- Rejected: the cargos of anyone else, and the usuarios themselves.
select is_empty(
  $$ select 1 from public.cargos where usuario_id <> 'bbbbbbbb-0000-4000-8000-000000000001' $$,
  'the encargado cannot read the cargos of other usuarios'
);
select throws_ok(
  $$ select email from auth.users $$,
  '42501', 'permission denied for table users', 'a usuario cannot read the usuarios'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

select results_eq(
  $$ select id from public.cargos order by id $$,
  $$ values ('cccccccc-0000-4000-8000-000000000004'::uuid), ('cccccccc-0000-4000-8000-000000000005'::uuid) $$,
  'a usuario with two cargos reads both'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select is_empty(
  $$ select 1 from public.cargos $$,
  'the usuario without cargos reads no cargo'
);

-- A session without a usuario (no `sub`) reads nothing.
set local request.jwt.claims to '{"role": "authenticated"}';

select is_empty(
  $$ select 1 from public.cargos $$,
  'a session without a usuario reads no cargo'
);

reset role;

-- No usuario modifies the structure or the cargos ---------------------------------
-- The admin is the usuario with the widest cargo, and still only reads the
-- cargos and the asociaciones. They write the distritos and the iglesias of
-- their asociacion (distritos_iglesias_escritura.test.sql), never those of
-- another one, and never the columns the app does not write.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

-- Allowed: reading the structure.
select isnt_empty(
  $$ select 1 from public.iglesias where id = '11111111-0000-4000-8000-000000000001' $$,
  'the admin can read iglesias'
);

-- Rejected: inserting into the structure outside their asociacion raises 42501.
select throws_ok(
  $$ insert into public.asociaciones (nombre) values ('Rechazada') $$,
  '42501', null, 'the admin cannot insert asociaciones'
);
select throws_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000002', 'Rechazado') $$,
  '42501', null, 'the admin cannot insert distritos of another asociacion'
);
select throws_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, localidad)
     values ('dddddddd-0000-4000-8000-000000000003', 'Rechazada', 'Calle 9', 'Localidad') $$,
  '42501', null, 'the admin cannot insert iglesias of another asociacion'
);

-- Rejected: updating the asociaciones, the columns the app does not write, and
-- deleting the structure raise 42501, there is no privilege.
select throws_ok(
  $$ update public.asociaciones set nombre = 'Cambiada' returning id $$,
  '42501', 'permission denied for table asociaciones', 'the admin cannot update asociaciones'
);
select throws_ok(
  $$ update public.distritos set asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000002' returning id $$,
  '42501', 'permission denied for table distritos', 'the admin cannot move distritos to another asociacion'
);
select throws_ok(
  $$ update public.iglesias set excluida_del_buscador = true returning id $$,
  '42501', 'permission denied for table iglesias', 'the admin cannot hide iglesias from the buscador'
);
select throws_ok(
  $$ delete from public.iglesias returning id $$,
  '42501', 'permission denied for table iglesias', 'the admin cannot delete iglesias'
);
select throws_ok(
  $$ delete from public.distritos returning id $$,
  '42501', 'permission denied for table distritos', 'the admin cannot delete distritos'
);
select throws_ok(
  $$ delete from public.asociaciones returning id $$,
  '42501', 'permission denied for table asociaciones', 'the admin cannot delete asociaciones'
);

-- Rejected: every write on cargos, for lack of the privilege.
select throws_ok(
  $$ insert into public.cargos (usuario_id, asociacion_id)
     values ('bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002') $$,
  '42501', 'permission denied for table cargos', 'the admin cannot give themselves another cargo'
);
select throws_ok(
  $$ insert into public.cargos (usuario_id, iglesia_id)
     values ('bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for table cargos', 'the admin cannot give a cargo to another usuario'
);
select throws_ok(
  $$ update public.cargos set asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000002' $$,
  '42501', 'permission denied for table cargos', 'the admin cannot update cargos'
);
select throws_ok(
  $$ delete from public.cargos $$,
  '42501', 'permission denied for table cargos', 'the admin cannot delete cargos'
);

-- Rejected: an encargado moving their own cargo up, or dropping it.
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ update public.cargos
     set iglesia_id = null, asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000001'
     where id = 'cccccccc-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table cargos', 'an encargado cannot turn their cargo into one of admin'
);
select throws_ok(
  $$ delete from public.cargos where id = 'cccccccc-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table cargos', 'an encargado cannot delete their own cargo'
);

-- Rejected: a usuario without cargos giving themselves one.
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.cargos (usuario_id, asociacion_id)
     values ('bbbbbbbb-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for table cargos', 'a usuario without cargos cannot give themselves a cargo'
);

reset role;

-- The encargado -----------------------------------------------------------------
-- Writes the eventos of their iglesia. Another iglesia, a distrito and the
-- asociacion are out of reach.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: an evento of their iglesia, and its dates.
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000101', 'Cargado por el encargado', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  'the encargado inserts an evento of their iglesia'
);
select lives_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000101', '2026-12-05') $$,
  'the encargado inserts a date of an evento of their iglesia'
);
-- The duenio decides, not who loaded the evento: this one is a fixture.
select isnt_empty(
  $$ update public.eventos set lugar = 'Salón de la iglesia'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' returning id $$,
  'the encargado updates an evento of their iglesia'
);
select isnt_empty(
  $$ update public.eventos_fechas set fecha = '2026-11-15'
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' returning evento_id $$,
  'the encargado updates a date of an evento of their iglesia'
);
select isnt_empty(
  $$ delete from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000101' returning evento_id $$,
  'the encargado deletes a date of an evento of their iglesia'
);
select isnt_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000101' returning id $$,
  'the encargado deletes an evento of their iglesia'
);

-- Allowed: deleting an evento takes its dates and iglesias sumadas with it,
-- although the encargado has no policy to delete an iglesia sumada.
select isnt_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000010' returning id $$,
  'the encargado deletes an evento that has dates and iglesias sumadas'
);
select is_empty(
  $$ select 1 from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000010' $$,
  'the dates of the deleted evento are gone'
);
select is_empty(
  $$ select 1 from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000010' $$,
  'the iglesias sumadas of the deleted evento are gone'
);

-- Rejected: inserting an evento of another iglesia (even of the same distrito),
-- of a distrito (even their own) and of the asociacion.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000002', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the encargado cannot insert an evento of another iglesia of their distrito'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000003', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the encargado cannot insert an evento of an iglesia of another distrito'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_distrito_id, hora)
     values ('Rechazado', 'distrito', 'dddddddd-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the encargado cannot insert an evento of their distrito'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_asociacion_id, hora)
     values ('Rechazado', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the encargado cannot insert an evento of the asociacion'
);

-- Rejected: updating them affects zero rows.
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000002' returning id $$,
  'the encargado cannot update an evento of another iglesia'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000004' returning id $$,
  'the encargado cannot update an evento of their distrito'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000006' returning id $$,
  'the encargado cannot update an evento of the asociacion'
);

-- Rejected: deleting them affects zero rows.
select is_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000002' returning id $$,
  'the encargado cannot delete an evento of another iglesia'
);
select is_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000004' returning id $$,
  'the encargado cannot delete an evento of their distrito'
);
select is_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000006' returning id $$,
  'the encargado cannot delete an evento of the asociacion'
);

-- Rejected: the dates of those eventos.
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000002', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the encargado cannot insert a date of an evento of another iglesia'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000004', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the encargado cannot insert a date of an evento of their distrito'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000006', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the encargado cannot insert a date of an evento of the asociacion'
);
select is_empty(
  $$ update public.eventos_fechas set fecha = '2026-12-25'
     where evento_id in ('eeeeeeee-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000004', 'eeeeeeee-0000-4000-8000-000000000006')
     returning evento_id $$,
  'the encargado cannot update the dates of eventos their cargo does not cover'
);
select is_empty(
  $$ delete from public.eventos_fechas
     where evento_id in ('eeeeeeee-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000004', 'eeeeeeee-0000-4000-8000-000000000006')
     returning evento_id $$,
  'the encargado cannot delete the dates of eventos their cargo does not cover'
);
-- A date they can write cannot be handed to an evento they cannot.
select throws_ok(
  $$ update public.eventos_fechas set evento_id = 'eeeeeeee-0000-4000-8000-000000000002'
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the encargado cannot move a date to an evento of another iglesia'
);

-- Rejected: changing the duenio of an evento of their iglesia to a level their
-- cargo does not cover.
select throws_ok(
  $$ update public.eventos set duenio_iglesia_id = '11111111-0000-4000-8000-000000000002'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the encargado cannot move an evento to another iglesia'
);
select throws_ok(
  $$ update public.eventos
     set alcance = 'distrito', duenio_iglesia_id = null, duenio_distrito_id = 'dddddddd-0000-4000-8000-000000000001'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the encargado cannot move an evento to their distrito'
);
select throws_ok(
  $$ update public.eventos
     set alcance = 'asociacion', duenio_iglesia_id = null, duenio_asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000001'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the encargado cannot move an evento to the asociacion'
);
-- Nor the other way around: taking an evento of another iglesia for theirs.
select is_empty(
  $$ update public.eventos set duenio_iglesia_id = '11111111-0000-4000-8000-000000000001'
     where id = 'eeeeeeee-0000-4000-8000-000000000002' returning id $$,
  'the encargado cannot take an evento of another iglesia'
);

reset role;

-- The pastor ----------------------------------------------------------------------
-- Writes the eventos of their distrito and of its iglesias. Another distrito,
-- its iglesias and the asociacion are out of reach.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

-- Allowed: eventos of their distrito and of two of its iglesias, and their dates.
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_distrito_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000102', 'Cargado por el pastor en su distrito', 'distrito', 'dddddddd-0000-4000-8000-000000000001', '10:00') $$,
  'the pastor inserts an evento of their distrito'
);
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora)
     values
       ('eeeeeeee-0000-4000-8000-000000000103', 'Cargado por el pastor en una iglesia', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00'),
       ('eeeeeeee-0000-4000-8000-000000000104', 'Cargado por el pastor en otra iglesia', 'iglesia', '11111111-0000-4000-8000-000000000002', '10:00') $$,
  'the pastor inserts eventos of the iglesias of their distrito'
);
select lives_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values
       ('eeeeeeee-0000-4000-8000-000000000102', '2026-12-05'),
       ('eeeeeeee-0000-4000-8000-000000000104', '2026-12-05') $$,
  'the pastor inserts dates of eventos of their distrito and of its iglesias'
);
select isnt_empty(
  $$ update public.eventos set lugar = 'Salón del distrito'
     where id = 'eeeeeeee-0000-4000-8000-000000000004' returning id $$,
  'the pastor updates an evento of their distrito'
);
select isnt_empty(
  $$ update public.eventos set lugar = 'Salón de la iglesia vecina'
     where id = 'eeeeeeee-0000-4000-8000-000000000002' returning id $$,
  'the pastor updates an evento of an iglesia of their distrito'
);
select isnt_empty(
  $$ update public.eventos_fechas set fecha = '2026-11-15'
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' returning evento_id $$,
  'the pastor updates a date of an evento of their distrito'
);
select isnt_empty(
  $$ delete from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000104' returning evento_id $$,
  'the pastor deletes a date of an evento of an iglesia of their distrito'
);
select results_eq(
  $$ with borrados as (
       delete from public.eventos
       where id in ('eeeeeeee-0000-4000-8000-000000000102', 'eeeeeeee-0000-4000-8000-000000000103', 'eeeeeeee-0000-4000-8000-000000000104')
       returning id
     )
     select count(*) from borrados $$,
  $$ values (3::bigint) $$,
  'the pastor deletes eventos of their distrito and of its iglesias'
);

-- Allowed: changing the duenio of an evento between levels their cargo covers.
select isnt_empty(
  $$ update public.eventos set duenio_iglesia_id = '11111111-0000-4000-8000-000000000002'
     where id = 'eeeeeeee-0000-4000-8000-000000000009' returning id $$,
  'the pastor moves an evento between two iglesias of their distrito'
);
select isnt_empty(
  $$ update public.eventos
     set alcance = 'distrito', duenio_iglesia_id = null, duenio_distrito_id = 'dddddddd-0000-4000-8000-000000000001'
     where id = 'eeeeeeee-0000-4000-8000-000000000009' returning id $$,
  'the pastor moves an evento from an iglesia to their distrito'
);

-- Rejected: changing it to a level their cargo does not cover.
select throws_ok(
  $$ update public.eventos set duenio_distrito_id = 'dddddddd-0000-4000-8000-000000000002'
     where id = 'eeeeeeee-0000-4000-8000-000000000009' $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the pastor cannot move an evento to another distrito'
);
select throws_ok(
  $$ update public.eventos
     set alcance = 'iglesia', duenio_distrito_id = null, duenio_iglesia_id = '11111111-0000-4000-8000-000000000003'
     where id = 'eeeeeeee-0000-4000-8000-000000000009' $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the pastor cannot move an evento to an iglesia of another distrito'
);
select throws_ok(
  $$ update public.eventos
     set alcance = 'asociacion', duenio_distrito_id = null, duenio_asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000001'
     where id = 'eeeeeeee-0000-4000-8000-000000000009' $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the pastor cannot move an evento to the asociacion'
);

-- Rejected: inserting an evento of another distrito, of one of its iglesias and
-- of the asociacion.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_distrito_id, hora)
     values ('Rechazado', 'distrito', 'dddddddd-0000-4000-8000-000000000002', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the pastor cannot insert an evento of another distrito'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000003', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the pastor cannot insert an evento of an iglesia of another distrito'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_asociacion_id, hora)
     values ('Rechazado', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the pastor cannot insert an evento of the asociacion'
);

-- Rejected: updating them affects zero rows.
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000005' returning id $$,
  'the pastor cannot update an evento of another distrito'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000003' returning id $$,
  'the pastor cannot update an evento of an iglesia of another distrito'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000006' returning id $$,
  'the pastor cannot update an evento of the asociacion'
);

-- Rejected: deleting them affects zero rows.
select is_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000005' returning id $$,
  'the pastor cannot delete an evento of another distrito'
);
select is_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000003' returning id $$,
  'the pastor cannot delete an evento of an iglesia of another distrito'
);
select is_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000006' returning id $$,
  'the pastor cannot delete an evento of the asociacion'
);

-- Rejected: the dates of those eventos.
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000005', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the pastor cannot insert a date of an evento of another distrito'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000003', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the pastor cannot insert a date of an evento of an iglesia of another distrito'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000006', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the pastor cannot insert a date of an evento of the asociacion'
);
select is_empty(
  $$ update public.eventos_fechas set fecha = '2026-12-25'
     where evento_id in ('eeeeeeee-0000-4000-8000-000000000005', 'eeeeeeee-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000006')
     returning evento_id $$,
  'the pastor cannot update the dates of eventos their cargo does not cover'
);
select is_empty(
  $$ delete from public.eventos_fechas
     where evento_id in ('eeeeeeee-0000-4000-8000-000000000005', 'eeeeeeee-0000-4000-8000-000000000003', 'eeeeeeee-0000-4000-8000-000000000006')
     returning evento_id $$,
  'the pastor cannot delete the dates of eventos their cargo does not cover'
);

reset role;

-- The admin -----------------------------------------------------------------------
-- Writes at the three levels of their asociacion. Another asociacion is out of
-- reach: a cargo never covers sideways.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

-- Allowed: an evento of an iglesia, of a distrito and of the asociacion.
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000105', 'Cargado por el admin en una iglesia', 'iglesia', '11111111-0000-4000-8000-000000000003', '10:00') $$,
  'the admin inserts an evento of an iglesia'
);
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_distrito_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000106', 'Cargado por el admin en un distrito', 'distrito', 'dddddddd-0000-4000-8000-000000000002', '10:00') $$,
  'the admin inserts an evento of a distrito'
);
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_asociacion_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000107', 'Cargado por el admin en la asociación', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000001', '10:00') $$,
  'the admin inserts an evento of the asociacion'
);
select lives_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values
       ('eeeeeeee-0000-4000-8000-000000000105', '2026-12-05'),
       ('eeeeeeee-0000-4000-8000-000000000106', '2026-12-05'),
       ('eeeeeeee-0000-4000-8000-000000000107', '2026-12-05') $$,
  'the admin inserts dates of eventos of the three levels'
);
select isnt_empty(
  $$ update public.eventos set lugar = 'Salón de otro distrito'
     where id = 'eeeeeeee-0000-4000-8000-000000000003' returning id $$,
  'the admin updates an evento of an iglesia'
);
select isnt_empty(
  $$ update public.eventos set lugar = 'Salón de otro distrito'
     where id = 'eeeeeeee-0000-4000-8000-000000000005' returning id $$,
  'the admin updates an evento of a distrito'
);
select isnt_empty(
  $$ update public.eventos set lugar = 'Sede de la asociación'
     where id = 'eeeeeeee-0000-4000-8000-000000000006' returning id $$,
  'the admin updates an evento of the asociacion'
);
select isnt_empty(
  $$ update public.eventos_fechas set fecha = '2026-11-15'
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000006' returning evento_id $$,
  'the admin updates a date of an evento of the asociacion'
);
select isnt_empty(
  $$ delete from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000107' returning evento_id $$,
  'the admin deletes a date of an evento of the asociacion'
);
select results_eq(
  $$ with borrados as (
       delete from public.eventos
       where id in ('eeeeeeee-0000-4000-8000-000000000105', 'eeeeeeee-0000-4000-8000-000000000106', 'eeeeeeee-0000-4000-8000-000000000107')
       returning id
     )
     select count(*) from borrados $$,
  $$ values (3::bigint) $$,
  'the admin deletes eventos of the three levels'
);
-- Allowed: changing the duenio across the whole asociacion.
select isnt_empty(
  $$ update public.eventos
     set alcance = 'asociacion', duenio_distrito_id = null, duenio_asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000001'
     where id = 'eeeeeeee-0000-4000-8000-000000000009' returning id $$,
  'the admin moves an evento from a distrito to the asociacion'
);

-- Rejected: everything of another asociacion.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_asociacion_id, hora)
     values ('Rechazado', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000002', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the admin cannot insert an evento of another asociacion'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_distrito_id, hora)
     values ('Rechazado', 'distrito', 'dddddddd-0000-4000-8000-000000000003', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the admin cannot insert an evento of a distrito of another asociacion'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000004', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the admin cannot insert an evento of an iglesia of another asociacion'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id in ('eeeeeeee-0000-4000-8000-000000000007', 'eeeeeeee-0000-4000-8000-000000000008') returning id $$,
  'the admin cannot update eventos of another asociacion'
);
select is_empty(
  $$ delete from public.eventos
     where id in ('eeeeeeee-0000-4000-8000-000000000007', 'eeeeeeee-0000-4000-8000-000000000008') returning id $$,
  'the admin cannot delete eventos of another asociacion'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000008', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the admin cannot insert a date of an evento of another asociacion'
);
select throws_ok(
  $$ update public.eventos set duenio_asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000002'
     where id = 'eeeeeeee-0000-4000-8000-000000000006' $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the admin cannot move an evento to another asociacion'
);

-- Rejected: sumar an iglesia to an evento of another asociacion. Who sums and
-- quita iglesias is tested in iglesias_sumadas.test.sql.
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000001') $$,
  '42501', 'new row violates row-level security policy for table "iglesias_sumadas"',
  'the admin cannot sumar an iglesia to an evento of another asociacion'
);

-- The rule itself: a duenio is exactly one level.
select is(
  public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000001', null, null),
  true,
  'the cargo of the admin covers an iglesia of their asociacion'
);
select is(
  public.cargos_abarcan_duenio('11111111-0000-4000-8000-000000000004', null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  false,
  'two duenios at once are covered by no cargo, even if one of them is'
);
select is(
  public.cargos_abarcan_duenio(null, null, null),
  false,
  'no duenio is covered by no cargo'
);

reset role;

-- The usuario without cargos --------------------------------------------------------
-- A session alone gives nothing: every write is rejected.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

-- Allowed: reading, like anyone.
select isnt_empty(
  $$ select 1 from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'the usuario without cargos can read eventos'
);

-- Rejected: inserting at any level.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the usuario without cargos cannot insert an evento of an iglesia'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_distrito_id, hora)
     values ('Rechazado', 'distrito', 'dddddddd-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the usuario without cargos cannot insert an evento of a distrito'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_asociacion_id, hora)
     values ('Rechazado', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'the usuario without cargos cannot insert an evento of the asociacion'
);

-- Rejected: updating and deleting affect zero rows, whatever the evento.
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado' returning id $$,
  'the usuario without cargos cannot update any evento'
);
select is_empty(
  $$ delete from public.eventos returning id $$,
  'the usuario without cargos cannot delete any evento'
);

-- Rejected: the dates.
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000001', '2026-12-25') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'the usuario without cargos cannot insert a date'
);
select is_empty(
  $$ update public.eventos_fechas set fecha = '2026-12-25' returning evento_id $$,
  'the usuario without cargos cannot update any date'
);
select is_empty(
  $$ delete from public.eventos_fechas returning evento_id $$,
  'the usuario without cargos cannot delete any date'
);

-- Rejected: a session that claims cargos. Nothing but the id of the usuario is
-- read from the session, so what it says about cargos changes nothing.
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated", "cargo": "admin", "app_metadata": {"cargos": [{"asociacion_id": "aaaaaaaa-0000-4000-8000-000000000001"}]}, "user_metadata": {"cargo": "admin"}}';

select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_asociacion_id, hora)
     values ('Rechazado', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'a cargo claimed by the session and absent from the table does not let insert'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado' returning id $$,
  'a cargo claimed by the session and absent from the table does not let update'
);

reset role;

-- A session without a usuario (no `sub`), which is what the write policies see
-- when auth.uid() is null.
set local role authenticated;
set local request.jwt.claims to '{"role": "authenticated"}';

select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'a session without a usuario cannot insert eventos'
);

reset role;

-- A usuario with several cargos ---------------------------------------------------
-- Encargado of the Iglesia de otro distrito and pastor of the Distrito de otra
-- asociación: covers what each cargo covers, and nothing in between.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

-- Allowed: what either cargo covers.
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000108', 'Cargado como encargado', 'iglesia', '11111111-0000-4000-8000-000000000003', '10:00') $$,
  'a usuario with two cargos inserts an evento of the iglesia of the first'
);
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_distrito_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000109', 'Cargado como pastor', 'distrito', 'dddddddd-0000-4000-8000-000000000003', '10:00') $$,
  'a usuario with two cargos inserts an evento of the distrito of the second'
);
select isnt_empty(
  $$ update public.eventos set lugar = 'Salón de otra asociación'
     where id = 'eeeeeeee-0000-4000-8000-000000000007' returning id $$,
  'a usuario with two cargos updates an evento of an iglesia of the distrito of the second'
);

-- Rejected: the distrito above the first cargo, the asociacion above the
-- second, and an iglesia neither covers.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_distrito_id, hora)
     values ('Rechazado', 'distrito', 'dddddddd-0000-4000-8000-000000000002', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'a cargo of encargado does not cover the distrito of its iglesia'
);
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_asociacion_id, hora)
     values ('Rechazado', 'asociacion', 'aaaaaaaa-0000-4000-8000-000000000002', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'a cargo of pastor does not cover the asociacion of its distrito'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' returning id $$,
  'a usuario with two cargos cannot update an evento neither of them covers'
);

reset role;

-- Removing a cargo blocks writing at once -----------------------------------------
-- Same usuario, same session and same claims before and after: the only thing
-- that changes is the row of cargos, so that is what every write reads.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: while the cargo exists.
select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000111', 'Cargado antes de perder el cargo', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  'the encargado inserts an evento while they have the cargo'
);
select lives_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000111', '2026-12-05') $$,
  'the encargado inserts a date while they have the cargo'
);

-- The developers remove the cargo. The claims of the session are left as they are.
reset role;
delete from public.cargos where id = 'cccccccc-0000-4000-8000-000000000001';
set local role authenticated;

select is(
  (select auth.uid()),
  'bbbbbbbb-0000-4000-8000-000000000001'::uuid,
  'the session is still the one of the encargado'
);
select is_empty(
  $$ select 1 from public.cargos $$,
  'the encargado reads no cargo once it is removed'
);

-- Rejected: every write, from the next statement on.
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'without the cargo, the same session cannot insert an evento of the iglesia'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' returning id $$,
  'without the cargo, the same session cannot update an evento of the iglesia'
);
-- Having loaded the evento gives nothing either.
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000111' returning id $$,
  'without the cargo, the same session cannot update the evento it inserted'
);
select is_empty(
  $$ delete from public.eventos
     where id = 'eeeeeeee-0000-4000-8000-000000000111' returning id $$,
  'without the cargo, the same session cannot delete the evento it inserted'
);
select throws_ok(
  $$ insert into public.eventos_fechas (evento_id, fecha)
     values ('eeeeeeee-0000-4000-8000-000000000111', '2026-12-12') $$,
  '42501', 'new row violates row-level security policy for table "eventos_fechas"',
  'without the cargo, the same session cannot insert a date'
);
select is_empty(
  $$ delete from public.eventos_fechas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000111' returning evento_id $$,
  'without the cargo, the same session cannot delete a date'
);

reset role;

-- And the other way around: a cargo loaded by the developers lets write at once.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Rechazado', 'iglesia', '11111111-0000-4000-8000-000000000002', '10:00') $$,
  '42501', 'new row violates row-level security policy for table "eventos"',
  'before getting a cargo, the usuario cannot insert an evento of the iglesia'
);

reset role;
insert into public.cargos (id, usuario_id, iglesia_id) values
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000002');
set local role authenticated;

select lives_ok(
  $$ insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora)
     values ('eeeeeeee-0000-4000-8000-000000000112', 'Cargado al recibir el cargo', 'iglesia', '11111111-0000-4000-8000-000000000002', '10:00') $$,
  'once they get a cargo, the same session inserts an evento of the iglesia'
);

reset role;
set local request.jwt.claims to '';

-- The data is intact after every rejected attempt -----------------------------

select is(
  (select count(*) from public.eventos where titulo in ('Rechazado', 'Cambiado')),
  0::bigint,
  'no evento was inserted or renamed by a rejected write'
);
select results_eq(
  $$ select id from public.eventos where id::text like 'eeeeeeee-%' order by id $$,
  $$ values
       ('eeeeeeee-0000-4000-8000-000000000001'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000002'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000003'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000004'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000005'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000006'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000007'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000008'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000009'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000108'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000109'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000111'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000112'::uuid) $$,
  'the only eventos added or deleted are the ones of the allowed writes'
);
-- The duenios that a rejected write tried to change.
select results_eq(
  $$ select id, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id from public.eventos
     where id in ('eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000006', 'eeeeeeee-0000-4000-8000-000000000009')
     order by id $$,
  $$ values
       ('eeeeeeee-0000-4000-8000-000000000001'::uuid, '11111111-0000-4000-8000-000000000001'::uuid, null::uuid, null::uuid),
       ('eeeeeeee-0000-4000-8000-000000000002'::uuid, '11111111-0000-4000-8000-000000000002'::uuid, null::uuid, null::uuid),
       ('eeeeeeee-0000-4000-8000-000000000006'::uuid, null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid),
       ('eeeeeeee-0000-4000-8000-000000000009'::uuid, null::uuid, null::uuid, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid) $$,
  'every evento has the duenio the last allowed write left'
);
select is(
  -- Only the eventos of this test: the seed may be loaded, and nothing keeps it
  -- from having an evento on that day.
  (select count(*) from public.eventos_fechas
    where fecha = '2026-12-25' and evento_id::text like 'eeeeeeee-%'),
  0::bigint,
  'no date was inserted or moved by a rejected write'
);
select is(
  (select count(*) from public.eventos_fechas where evento_id in (
    'eeeeeeee-0000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002', 'eeeeeeee-0000-4000-8000-000000000003',
    'eeeeeeee-0000-4000-8000-000000000004', 'eeeeeeee-0000-4000-8000-000000000005', 'eeeeeeee-0000-4000-8000-000000000006',
    'eeeeeeee-0000-4000-8000-000000000007', 'eeeeeeee-0000-4000-8000-000000000008', 'eeeeeeee-0000-4000-8000-000000000009',
    'eeeeeeee-0000-4000-8000-000000000111'
  )),
  10::bigint,
  'no date was deleted by a rejected write'
);
select results_eq(
  $$ select id from public.cargos where id::text like 'cccccccc-%' order by id $$,
  $$ values
       ('cccccccc-0000-4000-8000-000000000002'::uuid),
       ('cccccccc-0000-4000-8000-000000000003'::uuid),
       ('cccccccc-0000-4000-8000-000000000004'::uuid),
       ('cccccccc-0000-4000-8000-000000000005'::uuid),
       ('cccccccc-0000-4000-8000-000000000006'::uuid) $$,
  'the only cargos added or removed are the ones the developers changed'
);
select results_eq(
  $$ select asociacion_id from public.cargos where id = 'cccccccc-0000-4000-8000-000000000003' $$,
  $$ values ('aaaaaaaa-0000-4000-8000-000000000001'::uuid) $$,
  'the cargo of the admin was not modified'
);
select is(
  (select count(*) from public.iglesias where nombre in ('Rechazada', 'Cambiada'))
    + (select count(*) from public.distritos where nombre in ('Rechazado', 'Cambiado'))
    + (select count(*) from public.asociaciones where nombre in ('Rechazada', 'Cambiada')),
  0::bigint,
  'the structure was neither extended nor renamed'
);
select is(
  (select count(*) from public.iglesias where id::text like '11111111-0000-4000-8000-%'),
  4::bigint,
  'no iglesia was deleted'
);

-- Deleting a usuario deletes their cargos ------------------------------------------

select lives_ok(
  $$ delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000005' $$,
  'a usuario with cargos can be deleted'
);
select is_empty(
  $$ select 1 from public.cargos where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000005' $$,
  'deleting a usuario deletes their cargos'
);

select * from finish();
rollback;
