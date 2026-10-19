-- Writing the distritos and the iglesias: only the admin of their asociacion.
--
-- 1. The admin creates and edits the distritos and the iglesias of their
--    asociacion, and moves an iglesia between its distritos.
-- 2. The pastor, the encargado, the admin of another asociacion and anon do
--    not.
-- 3. A create sent again with the same id (its answer was lost) saves once.
-- 4. After moving an iglesia, the pastor of the old distrito stops covering it
--    and the one of the new distrito starts, without any other step, and its
--    calendario shows the eventos of the new distrito and keeps its own.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(47);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Otra asociación');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Norte'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Sur'),
  ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000002', 'Distrito de la otra');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia Las Rosas', 'Pringles 820', 'San Luis');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor.norte@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'pastor.sur@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'admin.otra@prueba.example.com');

insert into public.cargos (usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('bbbbbbbb-0000-4000-8000-000000000001', null, null, 'aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('bbbbbbbb-0000-4000-8000-000000000003', null, 'dddddddd-0000-4000-8000-000000000002', null),
  ('bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', null, null),
  ('bbbbbbbb-0000-4000-8000-000000000005', null, null, 'aaaaaaaa-0000-4000-8000-000000000002');

-- An evento of the iglesia and one of each distrito, for its calendario.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, duenio_distrito_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Culto joven', 'iglesia', '11111111-0000-4000-8000-000000000001', null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'Congreso del Norte', 'distrito', null, 'dddddddd-0000-4000-8000-000000000001', '10:00'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'Congreso del Sur', 'distrito', null, 'dddddddd-0000-4000-8000-000000000002', '10:00');

insert into public.lugares (nombre, duenio_iglesia_id) values
  ('Salón de jóvenes', '11111111-0000-4000-8000-000000000001');

-- The policies themselves -------------------------------------------------------

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

-- The admin of the asociacion -----------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: creating and editing distritos and iglesias of their asociacion.
select lives_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Centro') $$,
  'the admin can create a distrito of their asociacion'
);
select isnt_empty(
  $$ update public.distritos set nombre = 'Distrito Norte Grande'
     where id = 'dddddddd-0000-4000-8000-000000000001' returning id $$,
  'the admin can rename a distrito of their asociacion'
);
select lives_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, localidad)
     values ('dddddddd-0000-4000-8000-000000000002', 'Iglesia Juana Koslay', 'Av. Los Fresnos 1450', 'Juana Koslay') $$,
  'the admin can create an iglesia in a distrito of their asociacion'
);
select isnt_empty(
  $$ update public.iglesias set nombre = 'Iglesia Las Rosas Centro', direccion = 'Pringles 822', localidad = 'San Luis Capital'
     where id = '11111111-0000-4000-8000-000000000001' returning id $$,
  'the admin can edit an iglesia of their asociacion'
);

-- Rejected: anything outside their asociacion.
select throws_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000002', 'Ajeno') $$,
  '42501', null, 'the admin cannot create a distrito of another asociacion'
);
select is_empty(
  $$ update public.distritos set nombre = 'Ajeno'
     where id = 'dddddddd-0000-4000-8000-000000000003' returning id $$,
  'the admin cannot rename a distrito of another asociacion'
);
select throws_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, localidad)
     values ('dddddddd-0000-4000-8000-000000000003', 'Ajena', 'Calle 2', 'Localidad') $$,
  '42501', null, 'the admin cannot create an iglesia in a distrito of another asociacion'
);
select throws_ok(
  $$ update public.iglesias set distrito_id = 'dddddddd-0000-4000-8000-000000000003'
     where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', null, 'the admin cannot move an iglesia to a distrito of another asociacion'
);

-- Rejected: what stays closed to the app even for the admin.
select throws_ok(
  $$ update public.distritos set asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000002'
     where id = 'dddddddd-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table distritos', 'the admin cannot change the asociacion of a distrito'
);
select throws_ok(
  $$ update public.iglesias set latitud = 0, longitud = 0
     where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table iglesias', 'the admin cannot write the coordinates of an iglesia'
);
select throws_ok(
  $$ update public.iglesias set excluida_del_buscador = true
     where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table iglesias', 'the admin cannot hide an iglesia from the buscador'
);
select throws_ok(
  $$ delete from public.iglesias where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table iglesias', 'the admin cannot delete an iglesia'
);
select throws_ok(
  $$ delete from public.distritos where id = 'dddddddd-0000-4000-8000-000000000002' $$,
  '42501', 'permission denied for table distritos', 'the admin cannot delete a distrito'
);

-- Rejected: blank texts.
select throws_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000001', '   ') $$,
  '23514', null, 'a distrito needs a nombre'
);
select throws_ok(
  $$ update public.iglesias set localidad = ''
     where id = '11111111-0000-4000-8000-000000000001' $$,
  '23514', null, 'an iglesia needs a localidad'
);

-- A create sent again: the app chooses the id and sends the same one on every
-- try, so a try whose answer was lost does not create a second row.
select lives_ok(
  $$ insert into public.distritos (id, asociacion_id, nombre)
     values ('dddddddd-0000-4000-8000-000000000010', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Oeste') $$,
  'the admin can create a distrito with the id the app chose'
);
select throws_ok(
  $$ insert into public.distritos (id, asociacion_id, nombre)
     values ('dddddddd-0000-4000-8000-000000000010', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Oeste') $$,
  '23505', null, 'creating the same distrito again is rejected as a duplicate'
);
select is(
  (select count(*) from public.distritos where nombre = 'Distrito Oeste'),
  1::bigint,
  'a distrito sent twice is saved once'
);
select lives_ok(
  $$ insert into public.iglesias (id, distrito_id, nombre, direccion, localidad)
     values ('11111111-0000-4000-8000-000000000010', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia La Florida', 'Calle 3', 'La Florida') $$,
  'the admin can create an iglesia with the id the app chose'
);
select throws_ok(
  $$ insert into public.iglesias (id, distrito_id, nombre, direccion, localidad)
     values ('11111111-0000-4000-8000-000000000010', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia La Florida', 'Calle 3', 'La Florida') $$,
  '23505', null, 'creating the same iglesia again is rejected as a duplicate'
);
select is(
  (select count(*) from public.iglesias where nombre = 'Iglesia La Florida'),
  1::bigint,
  'an iglesia sent twice is saved once'
);

reset role;

-- The admin of another asociacion ---------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

select is_empty(
  $$ update public.iglesias set nombre = 'Ajena'
     where id = '11111111-0000-4000-8000-000000000001' returning id $$,
  'the admin of another asociacion cannot edit the iglesia'
);

reset role;

-- The pastor -----------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'Del pastor') $$,
  '42501', null, 'the pastor cannot create a distrito'
);
select is_empty(
  $$ update public.distritos set nombre = 'Del pastor'
     where id = 'dddddddd-0000-4000-8000-000000000001' returning id $$,
  'the pastor cannot rename their distrito'
);
select throws_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, localidad)
     values ('dddddddd-0000-4000-8000-000000000001', 'Del pastor', 'Calle 2', 'Localidad') $$,
  '42501', null, 'the pastor cannot create an iglesia in their distrito'
);
select is_empty(
  $$ update public.iglesias set distrito_id = 'dddddddd-0000-4000-8000-000000000002'
     where id = '11111111-0000-4000-8000-000000000001' returning id $$,
  'the pastor cannot move an iglesia of their distrito'
);

reset role;

-- The encargado ----------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, localidad)
     values ('dddddddd-0000-4000-8000-000000000001', 'Del encargado', 'Calle 2', 'Localidad') $$,
  '42501', null, 'the encargado cannot create an iglesia'
);
select is_empty(
  $$ update public.iglesias set nombre = 'Del encargado'
     where id = '11111111-0000-4000-8000-000000000001' returning id $$,
  'the encargado cannot edit their iglesia'
);
select is_empty(
  $$ update public.distritos set nombre = 'Del encargado'
     where id = 'dddddddd-0000-4000-8000-000000000001' returning id $$,
  'the encargado cannot rename the distrito of their iglesia'
);

reset role;

-- Without a session -------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ insert into public.distritos (asociacion_id, nombre)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'Sin sesión') $$,
  '42501', null, 'anon cannot create a distrito'
);
select throws_ok(
  $$ update public.iglesias set nombre = 'Sin sesión'
     where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', 'permission denied for table iglesias', 'anon cannot edit an iglesia'
);

reset role;

-- The data is intact after every rejected attempt -----------------------------

select results_eq(
  $$ select nombre, direccion, localidad, distrito_id, excluida_del_buscador, latitud
     from public.iglesias where id = '11111111-0000-4000-8000-000000000001' $$,
  $$ values ('Iglesia Las Rosas Centro'::text, 'Pringles 822'::text, 'San Luis Capital'::text,
             'dddddddd-0000-4000-8000-000000000001'::uuid, false, null::double precision) $$,
  'the iglesia only has the changes of the admin'
);
select results_eq(
  $$ select nombre, asociacion_id from public.distritos
     where id = 'dddddddd-0000-4000-8000-000000000001' $$,
  $$ values ('Distrito Norte Grande'::text, 'aaaaaaaa-0000-4000-8000-000000000001'::uuid) $$,
  'the distrito only has the changes of the admin'
);
select is(
  (select count(*) from public.distritos where nombre in ('Ajeno', 'Del pastor', 'Del encargado', 'Sin sesión')),
  0::bigint,
  'no distrito was created or renamed by anyone else'
);

-- Moving an iglesia to another distrito -------------------------------------------------

-- Before: the pastor of the Norte covers the iglesia, the one of the Sur does not.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Antes, del pastor del Norte', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  'before the move, the pastor of the old distrito can create eventos in the iglesia'
);
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Antes, del pastor del Sur', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '42501', null, 'before the move, the pastor of the new distrito cannot create eventos in the iglesia'
);
reset role;

-- The admin moves it, and nothing else.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select isnt_empty(
  $$ update public.iglesias set distrito_id = 'dddddddd-0000-4000-8000-000000000002'
     where id = '11111111-0000-4000-8000-000000000001' returning id $$,
  'the admin can move an iglesia to another distrito of their asociacion'
);
reset role;

-- After: the pastor of the Norte no longer covers it, the one of the Sur does.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Después, del pastor del Norte', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  '42501', null, 'after the move, the pastor of the old distrito cannot create eventos in the iglesia'
);
select is_empty(
  $$ update public.eventos set titulo = 'Cambiado'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' returning id $$,
  'after the move, the pastor of the old distrito cannot edit its eventos'
);
reset role;

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';
select lives_ok(
  $$ insert into public.eventos (titulo, alcance, duenio_iglesia_id, hora)
     values ('Después, del pastor del Sur', 'iglesia', '11111111-0000-4000-8000-000000000001', '10:00') $$,
  'after the move, the pastor of the new distrito can create eventos in the iglesia'
);
reset role;

-- Its encargado keeps their cargo and still writes its eventos.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select isnt_empty(
  $$ update public.eventos set titulo = 'Culto joven del sábado'
     where id = 'eeeeeeee-0000-4000-8000-000000000001' returning id $$,
  'after the move, the encargado of the iglesia still edits its eventos'
);
reset role;

-- Its calendario: the eventos of the new distrito, not those of the old one, and
-- its own eventos.
select ok(
  public.iglesia_ve_evento_por_alcance('eeeeeeee-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001'),
  'after the move, the iglesia sees the eventos of the new distrito'
);
select ok(
  not public.iglesia_ve_evento_por_alcance('eeeeeeee-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000001'),
  'after the move, the iglesia no longer sees the eventos of the old distrito'
);
select ok(
  public.iglesia_ve_evento_por_alcance('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001'),
  'after the move, the iglesia keeps its own eventos'
);

select is(
  (select count(*) from public.lugares where duenio_iglesia_id = '11111111-0000-4000-8000-000000000001'),
  1::bigint,
  'after the move, the iglesia keeps its lugares'
);

select * from finish();
rollback;
