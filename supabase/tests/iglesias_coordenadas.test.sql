-- Tests for the coordinates of the iglesias: anyone reads them, only the admin
-- changes them from the app (distritos_iglesias_escritura.test.sql), and only
-- valid values are stored.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito de la prueba');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia, latitud, longitud) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia del encargado', 'Calle 1', 'Ciudad', 'Provincia', -31.4201, -64.1888),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia sin coordenadas', 'Calle 2', 'Ciudad', 'Provincia', null, null);

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null);

-- The rules of the table ------------------------------------------------------------

select throws_ok(
  $$ update public.iglesias set latitud = 90.5 where id = '11111111-0000-4000-8000-000000000001' $$,
  '23514', null, 'a latitud above 90 is rejected'
);
select throws_ok(
  $$ update public.iglesias set latitud = -90.5 where id = '11111111-0000-4000-8000-000000000001' $$,
  '23514', null, 'a latitud below -90 is rejected'
);
select throws_ok(
  $$ update public.iglesias set longitud = 180.5 where id = '11111111-0000-4000-8000-000000000001' $$,
  '23514', null, 'a longitud out of range is rejected'
);
select throws_ok(
  $$ update public.iglesias set longitud = null where id = '11111111-0000-4000-8000-000000000001' $$,
  '23514', null, 'a latitud without its longitud is rejected'
);
select lives_ok(
  $$ update public.iglesias set latitud = 90, longitud = -180 where id = '11111111-0000-4000-8000-000000000002' $$,
  'the limits of the range are valid'
);
update public.iglesias set latitud = null, longitud = null where id = '11111111-0000-4000-8000-000000000002';

-- anon ------------------------------------------------------------------------------

set local role anon;

select results_eq(
  $$ select latitud, longitud from public.iglesias
     where distrito_id = 'dddddddd-0000-4000-8000-000000000001' order by nombre $$,
  $$ values (-31.4201::double precision, -64.1888::double precision), (null, null) $$,
  'anon reads the coordinates of the iglesias, also when they are missing'
);

reset role;

-- A usuario with a cargo ------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select results_eq(
  $$ select latitud, longitud from public.iglesias where id = '11111111-0000-4000-8000-000000000001' $$,
  $$ values (-31.4201::double precision, -64.1888::double precision) $$,
  'an encargado reads the coordinates of their iglesia'
);
-- Only the admin of the asociacion places an iglesia on the map
-- (20261025400000_ciudad_y_provincia_de_iglesias.sql).
select is_empty(
  $$ update public.iglesias set latitud = 0, longitud = 0
     where id = '11111111-0000-4000-8000-000000000001' returning id $$,
  'an encargado cannot change the coordinates of their iglesia'
);

reset role;

select results_eq(
  $$ select latitud, longitud from public.iglesias where id = '11111111-0000-4000-8000-000000000001' $$,
  $$ values (-31.4201::double precision, -64.1888::double precision) $$,
  'the coordinates are unchanged after the rejected update'
);

select * from finish();

rollback;
