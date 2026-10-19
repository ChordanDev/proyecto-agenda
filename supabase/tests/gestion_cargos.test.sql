-- Permission tests for editing and removing a cargo (public.editar_cargo and
-- public.quitar_cargo), and for the functions only the server function
-- `invitar` calls. Whoever manages a cargo edits and removes it: a secretaria de
-- iglesia the encargados of her iglesia, a pastor the cargos of the iglesias of
-- their distrito, an admin those of their asociacion. An encargado común
-- manages nobody, and without a session nothing runs.
--
-- Acting as a usuario works as in cargos_permisos.test.sql: the `authenticated`
-- role and the claims of the session, which is where auth.uid() reads from.
--
-- The structure of the fixtures, with who holds each cargo:
--
--   Asociación de la prueba: the admin and another admin
--     Distrito del pastor: the pastor
--       Iglesia de la secretaria: a secretaria, another secretaria and two
--       encargados
--     Otro distrito: another pastor
--       Iglesia de otro distrito: one encargado
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(58);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito del pastor'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Otro distrito');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia de la secretaria', 'Calle 1', 'Ciudad', 'Provincia'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia de otro distrito', 'Calle 2', 'Ciudad', 'Provincia');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'secretaria@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'otra-secretaria@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'otro-encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'de-otro-distrito@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'otro-pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'otra-admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000010', 'authenticated', 'authenticated', 'nuevo@prueba.example.com');

-- The otro encargado has no perfil: a usuario loaded by the developers.
insert into public.perfiles (usuario_id, nombre) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Secretaria'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Otra secretaria'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'Encargado'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'De otro distrito'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'Pastor'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'Otro pastor'),
  ('bbbbbbbb-0000-4000-8000-000000000008', 'Admin'),
  ('bbbbbbbb-0000-4000-8000-000000000009', 'Otra admin');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id, es_secretaria, funcion) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null, true, 'Secretaria'),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', null, null, true, null),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', null, null, false, 'Tesorero'),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', null, null, false, null),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000002', null, null, false, null),
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000006', null, 'dddddddd-0000-4000-8000-000000000001', null, false, null),
  ('cccccccc-0000-4000-8000-000000000007', 'bbbbbbbb-0000-4000-8000-000000000007', null, 'dddddddd-0000-4000-8000-000000000002', null, false, null),
  ('cccccccc-0000-4000-8000-000000000008', 'bbbbbbbb-0000-4000-8000-000000000008', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', false, null),
  ('cccccccc-0000-4000-8000-000000000009', 'bbbbbbbb-0000-4000-8000-000000000009', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', false, null),
  -- The encargado of the Iglesia de otro distrito is also an encargado of the
  -- Iglesia de la secretaria: she manages only one of their two cargos.
  ('cccccccc-0000-4000-8000-000000000010', 'bbbbbbbb-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000001', null, null, false, null);

-- The privileges -----------------------------------------------------------------------

select function_privs_are(
  'public', 'editar_cargo', array['uuid', 'text', 'text', 'boolean'], 'anon', array[]::text[],
  'anon cannot edit a cargo'
);
select function_privs_are(
  'public', 'quitar_cargo', array['uuid'], 'anon', array[]::text[],
  'anon cannot remove a cargo'
);
select function_privs_are(
  'public', 'editar_cargo', array['uuid', 'text', 'text', 'boolean'], 'authenticated', array['EXECUTE'],
  'a usuario can try to edit a cargo, and the rule decides'
);
select function_privs_are(
  'public', 'quitar_cargo', array['uuid'], 'authenticated', array['EXECUTE'],
  'a usuario can try to remove a cargo, and the rule decides'
);
select function_privs_are(
  'public', 'can_manage_cargo', array['uuid', 'uuid', 'uuid', 'boolean'], 'authenticated', array[]::text[],
  'the rule of managing is only used inside the functions'
);
select function_privs_are(
  'public', 'get_usuario_id_por_correo', array['text'], 'authenticated', array[]::text[],
  'a usuario cannot find others by correo'
);
select function_privs_are(
  'public', 'get_usuario_id_por_correo', array['text'], 'anon', array[]::text[],
  'anon cannot find usuarios by correo'
);
select function_privs_are(
  'public', 'guardar_cargo_invitado', array['uuid', 'text', 'boolean', 'text', 'uuid', 'uuid'], 'authenticated', array[]::text[],
  'a usuario cannot write a cargo directly'
);
select function_privs_are(
  'public', 'guardar_cargo_invitado', array['uuid', 'text', 'boolean', 'text', 'uuid', 'uuid'], 'anon', array[]::text[],
  'anon cannot write a cargo'
);
select function_privs_are(
  'public', 'guardar_cargo_invitado', array['uuid', 'text', 'boolean', 'text', 'uuid', 'uuid'], 'service_role', array['EXECUTE'],
  'the server function writes the cargo of an invitado'
);
select function_privs_are(
  'public', 'get_usuario_id_por_correo', array['text'], 'service_role', array['EXECUTE'],
  'the server function finds a usuario by correo'
);

-- Without a session (anon) --------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000003', 'Nadie', null) $$,
  '42501', 'permission denied for function editar_cargo', 'anon cannot edit a cargo'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000003') $$,
  '42501', 'permission denied for function quitar_cargo', 'anon cannot remove a cargo'
);

reset role;

-- An encargado común manages nobody -----------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000004', 'Cambiado', 'Anciano') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: an encargado común does not edit another encargado'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000004') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: an encargado común does not remove another encargado'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000003') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: an encargado común does not remove even their own cargo'
);

reset role;

select is(
  (select count(*)::int from public.cargos where id in (
    'cccccccc-0000-4000-8000-000000000003', 'cccccccc-0000-4000-8000-000000000004'
  )),
  2,
  'the rejected removals left both cargos'
);

-- A secretaria de iglesia ---------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000003', '  Encargado Pérez ', ' Anciano ') $$,
  'allowed: a secretaria edits an encargado of her iglesia'
);
select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000004', 'Otro encargado', '   ') $$,
  'allowed: a secretaria gives a nombre to an encargado without a perfil'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000002', 'Cambiada', null) $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a secretaria does not edit another secretaria'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000005', 'Cambiado', null) $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a secretaria does not edit an encargado of another iglesia'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000006') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a secretaria does not remove a pastor'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-0000000000ff') $$,
  '42501', 'The usuario does not manage this cargo',
  'a cargo that does not exist answers like one not managed'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000003', '  ', null) $$,
  '23514',
  'new row for relation "perfiles" violates check constraint "perfiles_nombre_not_blank"',
  'rejected: a blank nombre'
);
select lives_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000004') $$,
  'allowed: a secretaria removes an encargado of her iglesia'
);

reset role;

select results_eq(
  $$ select perfiles.nombre, cargos.funcion
     from public.cargos join public.perfiles using (usuario_id)
     where cargos.id = 'cccccccc-0000-4000-8000-000000000003' $$,
  $$ values ('Encargado Pérez'::text, 'Anciano'::text) $$,
  'the edit trimmed and saved the nombre and the funcion'
);
select is(
  (select nombre from public.perfiles where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000004'),
  'Otro encargado',
  'editing a usuario without a perfil creates it'
);
select is(
  (select count(*)::int from public.cargos where id = 'cccccccc-0000-4000-8000-000000000004'),
  0,
  'the cargo was removed'
);
select is(
  (select count(*)::int from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000004'),
  1,
  'removing a cargo leaves the usuario in auth.users'
);
select is(
  (select count(*)::int from public.perfiles where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000004'),
  1,
  'removing a cargo leaves the perfil'
);
select is(
  (select nombre from public.perfiles where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  'Otra secretaria',
  'the rejected edit left the other secretaria as she was'
);

-- The nombre is one per usuario, and shows in all of their cargos: it changes only
-- when the gestor manages every one of them. The funcion is of the cargo.

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000010', 'Renombrado', null) $$,
  '42501', 'The usuario holds cargos this one does not manage: their nombre cannot change',
  'rejected: a secretaria renames a usuario who also holds a cargo she does not manage'
);
select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000010', 'De otro distrito', 'Diácono') $$,
  'allowed: she edits the funcion of that cargo, keeping the nombre'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000003', repeat('a', 101), null) $$,
  '22023', 'The nombre has more than 100 characters',
  'rejected: a nombre longer than 100 characters'
);
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000003', 'Encargado Pérez', repeat('a', 61)) $$,
  '22023', 'The funcion has more than 60 characters',
  'rejected: a funcion longer than 60 characters'
);

reset role;

select results_eq(
  $$ select perfiles.nombre, cargos.funcion
     from public.cargos join public.perfiles using (usuario_id)
     where cargos.id = 'cccccccc-0000-4000-8000-000000000010' $$,
  $$ values ('De otro distrito'::text, 'Diácono'::text) $$,
  'the nombre stayed and the funcion changed'
);

-- A pastor --------------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';

select lives_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000002', 'Otra secretaria', 'Secretaria') $$,
  'allowed: a pastor edits a secretaria of an iglesia of their distrito'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000005') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a pastor does not remove a cargo of another distrito'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000007') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: a pastor does not remove another pastor'
);
select lives_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000002') $$,
  'allowed: a pastor removes a secretaria of their distrito'
);

-- An admin ----------------------------------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000008", "role": "authenticated"}';

select lives_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000007') $$,
  'allowed: an admin removes a pastor of their asociacion'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000009') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: an admin does not remove another admin'
);

-- The cargo of admin is given and removed only by the developers (#13): no call
-- of an admin reaches it, not even made directly, without the app.
select throws_ok(
  $$ select public.editar_cargo('cccccccc-0000-4000-8000-000000000009', 'Otra admin', 'Admin') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: an admin does not edit the cargo of another admin'
);
select throws_ok(
  $$ select public.quitar_cargo('cccccccc-0000-4000-8000-000000000008') $$,
  '42501', 'The usuario does not manage this cargo',
  'rejected: an admin does not remove their own cargo of admin'
);
select throws_ok(
  $$ insert into public.cargos (usuario_id, asociacion_id) values
       ('bbbbbbbb-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for table cargos',
  'rejected: an admin does not give the cargo of admin by writing the cargo directly'
);
select throws_ok(
  $$ select public.guardar_cargo_invitado(
       usuario_id => 'bbbbbbbb-0000-4000-8000-000000000003', nombre => 'Encargado',
       es_secretaria => false, distrito_id => 'dddddddd-0000-4000-8000-000000000001'
     ) $$,
  '42501', 'permission denied for function guardar_cargo_invitado',
  'rejected: an admin does not call the function only `invitar` calls'
);

reset role;

select is(
  (select count(*)::int from public.cargos where id in (
    'cccccccc-0000-4000-8000-000000000002', 'cccccccc-0000-4000-8000-000000000007'
  )),
  0,
  'the pastor and the admin removed their cargos'
);

-- The server function `invitar` (service_role) ---------------------------------------------

set local role service_role;

select is(
  public.get_usuario_id_por_correo(' Encargado@Prueba.example.com '),
  'bbbbbbbb-0000-4000-8000-000000000003'::uuid,
  'a usuario is found by their correo, ignoring case and spaces'
);
select is(
  public.get_usuario_id_por_correo('nadie@prueba.example.com'),
  null,
  'a correo without an account finds nobody'
);

-- The encargado, who holds a cargo on the Iglesia de la secretaria, is invited to
-- the Iglesia de otro distrito, twice.
select isnt(
  public.guardar_cargo_invitado(
    usuario_id => 'bbbbbbbb-0000-4000-8000-000000000003', nombre => 'Encargado Pérez',
    es_secretaria => false, funcion => 'Diácono',
    iglesia_id => '11111111-0000-4000-8000-000000000002'
  ),
  null,
  'an invitation returns the cargo it saved'
);
select is(
  public.guardar_cargo_invitado(
    usuario_id => 'bbbbbbbb-0000-4000-8000-000000000003', nombre => 'Otro nombre',
    es_secretaria => false, funcion => 'Diácono mayor',
    iglesia_id => '11111111-0000-4000-8000-000000000002'
  ),
  (select id from public.cargos
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000003'
     and iglesia_id = '11111111-0000-4000-8000-000000000002'),
  'inviting the same cargo again returns the same cargo'
);

reset role;

select results_eq(
  $$ select iglesia_id, funcion from public.cargos
     where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000003' order by funcion $$,
  $$ values
       ('11111111-0000-4000-8000-000000000001'::uuid, 'Anciano'::text),
       ('11111111-0000-4000-8000-000000000002'::uuid, 'Diácono mayor'::text) $$,
  'the invitation added one cargo to the existing usuario, never two, and updated its funcion'
);
select is(
  (select nombre from public.perfiles where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000003'),
  'Encargado Pérez',
  'inviting a usuario who already has a perfil keeps their nombre'
);

set local role service_role;

select isnt(
  public.guardar_cargo_invitado(
    usuario_id => 'bbbbbbbb-0000-4000-8000-000000000010', nombre => 'Nuevo',
    es_secretaria => false, iglesia_id => '11111111-0000-4000-8000-000000000002'
  ),
  null,
  'an invitation of a usuario without a perfil saves the cargo'
);
select throws_ok(
  $$ select public.guardar_cargo_invitado(
       usuario_id => 'bbbbbbbb-0000-4000-8000-000000000010', nombre => repeat('a', 101),
       es_secretaria => false, iglesia_id => '11111111-0000-4000-8000-000000000001'
     ) $$,
  '22023', 'The nombre has more than 100 characters',
  'rejected: an invitation with a nombre longer than 100 characters'
);

reset role;

select is(
  (select nombre from public.perfiles where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000010'),
  'Nuevo',
  'inviting a usuario without a perfil creates it with the nombre'
);

set local role service_role;

-- A distrito: the pastor of the Distrito del pastor is invited as pastor of the
-- Otro distrito.
select isnt(
  public.guardar_cargo_invitado(
    usuario_id => 'bbbbbbbb-0000-4000-8000-000000000006', nombre => 'Pastor',
    es_secretaria => false, distrito_id => 'dddddddd-0000-4000-8000-000000000002'
  ),
  null,
  'an invitation as pastor saves a cargo on the distrito'
);

reset role;

select is(
  (select count(*)::int from public.cargos where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000006'),
  2,
  'the pastor holds both distritos'
);

select * from finish();

rollback;
