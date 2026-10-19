-- Permission tests for "Eliminar mi cuenta": public.delete_own_usuario()
-- deletes the usuario who calls it and their cargos, nobody else, and leaves
-- the eventos they loaded in the calendario.
--
-- Acting as a usuario works as in cargos_permisos.test.sql: the `authenticated`
-- role and the claims of the session, which is where auth.uid() reads from.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito de la prueba');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia de la prueba', 'Calle 1', 'Ciudad', 'Provincia');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'se-va@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'se-queda@prueba.example.com');

-- Both are encargados of the same iglesia; the one who leaves is also pastor.
insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000001', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001', null, null);

-- Both have a perfil, which goes with its usuario like the cargos.
insert into public.perfiles (usuario_id, nombre) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'Se va'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Se queda');

-- Without a session --------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select public.delete_own_usuario() $$,
  '42501', 'permission denied for function delete_own_usuario',
  'anon cannot delete a usuario'
);

-- A token of the role without a usuario: there is nobody to delete.
set local role authenticated;
set local request.jwt.claims to '{"role": "authenticated"}';

select throws_ok(
  $$ select public.delete_own_usuario() $$,
  '42501', 'There is no usuario signed in',
  'a session without a usuario deletes nobody'
);

reset role;

select is(
  (select count(*) from auth.users where id in (
    'bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002')),
  2::bigint,
  'the rejected calls delete no usuario'
);

-- The usuario who leaves loads an evento, then deletes themselves ------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Evento que cargó', 'iglesia', '11111111-0000-4000-8000-000000000001', '19:00');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-14');

select lives_ok(
  $$ select public.delete_own_usuario() $$,
  'a usuario can delete themselves'
);

reset role;

select is(
  (select count(*) from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  0::bigint,
  'the usuario who called it is deleted'
);

select is(
  (select count(*) from public.cargos where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  0::bigint,
  'their cargos are deleted'
);

select results_eq(
  $$ select usuario_id from public.perfiles
     where usuario_id in ('bbbbbbbb-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002') $$,
  $$ values ('bbbbbbbb-0000-4000-8000-000000000002'::uuid) $$,
  'their perfil is deleted, and only theirs'
);

select is(
  (select count(*) from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  1::bigint,
  'the other usuario stays'
);

select results_eq(
  $$ select id from public.cargos where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  $$ values ('cccccccc-0000-4000-8000-000000000003'::uuid) $$,
  'the cargo of the other usuario of the same iglesia stays'
);

select is(
  (select count(*) from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001'),
  1::bigint,
  'the evento they loaded stays'
);

select is(
  (select count(*) from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001'),
  1::bigint,
  'the fechas of that evento stay'
);

-- The session of the deleted usuario is still a valid token until it expires.
-- Calling again finds nobody to delete and touches nobody else.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ select public.delete_own_usuario() $$,
  'calling it again after the usuario is gone does nothing'
);

reset role;

select results_eq(
  $$ select id from public.cargos where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  $$ values ('cccccccc-0000-4000-8000-000000000003'::uuid) $$,
  'the second call leaves the cargos of the other usuario alone'
);

select * from finish();

rollback;
