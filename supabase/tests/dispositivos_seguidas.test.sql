-- Tests of how the iglesias a phone follows keep up with what the person can
-- still follow (issue #217): an iglesia dada de baja leaves every phone and
-- does not come back when reactivada, and an iglesia the pastor stops covering
-- (it moved to another distrito, or the pastor lost the cargo) leaves the
-- phones of that pastor. The cargos that still cover it keep it. A phone
-- cannot follow an iglesia de baja again by saving it.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000217', 'Asociación de la prueba');
insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000217', 'Distrito uno'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000217', 'Distrito dos');
insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000217', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia uno', 'Calle 1', 'Localidad'),
  ('22222222-0000-4000-8000-000000000217', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia dos', 'Calle 2', 'Localidad'),
  ('33333333-0000-4000-8000-000000000217', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia tres', 'Calle 3', 'Localidad');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor-uno@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'pastor-dos@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'doble@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'hermano@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'encargado@prueba.example.com');

-- The admin; the pastor of each distrito; a pastor of distrito uno who is also
-- encargado of iglesia dos; and the encargado of iglesia uno. The hermano has
-- no cargo.
insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', null, null, 'aaaaaaaa-0000-4000-8000-000000000217'),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', null, 'dddddddd-0000-4000-8000-000000000002', null),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000004', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000217', null, null),
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000217', null, null);

insert into public.dispositivos (id, token, encendido, usuario_id) values
  ('99999999-0000-4000-8000-000000000001', 'ExponentPushToken[admin]', true, 'bbbbbbbb-0000-4000-8000-000000000001'),
  ('99999999-0000-4000-8000-000000000002', 'ExponentPushToken[pastor-uno]', true, 'bbbbbbbb-0000-4000-8000-000000000002'),
  ('99999999-0000-4000-8000-000000000003', 'ExponentPushToken[pastor-dos]', true, 'bbbbbbbb-0000-4000-8000-000000000003'),
  ('99999999-0000-4000-8000-000000000004', 'ExponentPushToken[doble]', true, 'bbbbbbbb-0000-4000-8000-000000000004'),
  ('99999999-0000-4000-8000-000000000005', 'ExponentPushToken[hermano]', true, 'bbbbbbbb-0000-4000-8000-000000000005'),
  ('99999999-0000-4000-8000-000000000006', 'ExponentPushToken[sin-sesion]', true, null),
  ('99999999-0000-4000-8000-000000000007', 'ExponentPushToken[encargado]', true, 'bbbbbbbb-0000-4000-8000-000000000006');

insert into public.dispositivos_iglesias (dispositivo_id, iglesia_id) values
  ('99999999-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000217'),
  ('99999999-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000217');

-- The iglesias each phone follows, by the name of its token.
create temporary view seguidas as
select substring(d.token from '\[(.*)\]') as telefono, i.nombre as iglesia
from public.dispositivos as d
join public.dispositivos_iglesias as di on di.dispositivo_id = d.id
join public.iglesias as i on i.id = di.iglesia_id
where d.token like 'ExponentPushToken[%';

-- The trigger functions ------------------------------------------------------------

select is_definer('public', 'quitar_seguidas_de_iglesia', array[]::text[]);
select is_definer('public', 'quitar_seguidas_de_cargo', array[]::text[]);

-- An iglesia moves to another distrito -------------------------------------------------

-- The admin moves iglesia dos to distrito dos, as Gestión does (#158).
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
update public.iglesias set distrito_id = 'dddddddd-0000-4000-8000-000000000002'
where id = '22222222-0000-4000-8000-000000000217';
reset role;

select results_eq(
  $$ select iglesia from seguidas where telefono = 'pastor-uno' order by iglesia $$,
  $$ values ('Iglesia uno') $$,
  'The pastor of the old distrito loses the iglesia that moved'
);

select results_eq(
  $$ select iglesia from seguidas where telefono = 'pastor-dos' order by iglesia $$,
  $$ values ('Iglesia tres') $$,
  'The pastor of the new distrito does not gain it on their own'
);

select results_eq(
  $$ select iglesia from seguidas where telefono = 'doble' order by iglesia $$,
  $$ values ('Iglesia dos'), ('Iglesia uno') $$,
  'A pastor who is also its encargado keeps it'
);

select results_eq(
  $$ select iglesia from seguidas where telefono = 'admin' order by iglesia $$,
  $$ values ('Iglesia dos'), ('Iglesia uno') $$,
  'The admin of the asociacion keeps it'
);

select results_eq(
  $$ select iglesia from seguidas where telefono = 'hermano' $$,
  $$ values ('Iglesia dos') $$,
  'A hermano keeps their iglesia elegida wherever it moves'
);

-- A pastor loses the cargo ---------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.quitar_cargo('cccccccc-0000-4000-8000-000000000002');
select public.quitar_cargo('cccccccc-0000-4000-8000-000000000004');
reset role;

select is_empty(
  $$ select 1 from seguidas where telefono = 'pastor-uno' $$,
  'A pastor without the cargo stops following the iglesias of the distrito'
);

select results_eq(
  $$ select iglesia from seguidas where telefono = 'doble' $$,
  $$ values ('Iglesia dos') $$,
  'Without the cargo of pastor, the encargado keeps the iglesia of the other cargo'
);

select results_eq(
  $$ select iglesia from seguidas where telefono = 'pastor-dos' $$,
  $$ values ('Iglesia tres') $$,
  'Another pastor keeps their iglesias'
);

-- An iglesia dada de baja ------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.dar_de_baja_iglesia('11111111-0000-4000-8000-000000000217');
reset role;

select is_empty(
  $$ select 1 from seguidas where iglesia = 'Iglesia uno' $$,
  'An iglesia dada de baja leaves every phone that followed it'
);

select results_eq(
  $$ select telefono, iglesia from seguidas order by telefono $$,
  $$ values
    ('admin', 'Iglesia dos'),
    ('doble', 'Iglesia dos'),
    ('hermano', 'Iglesia dos'),
    ('pastor-dos', 'Iglesia tres') $$,
  'The other iglesias stay followed'
);

-- A phone that still has it saved, such as a hermano whose app kept it as its
-- iglesia elegida, does not follow it again by saving it.
set local role anon;
select public.guardar_dispositivo('ExponentPushToken[sin-sesion]', true, array['11111111-0000-4000-8000-000000000217']::uuid[]);
reset role;

select is_empty(
  $$ select 1 from seguidas where telefono = 'sin-sesion' $$,
  'Saving an iglesia de baja does not follow it again'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.guardar_dispositivo(
  'ExponentPushToken[admin]', true,
  array['11111111-0000-4000-8000-000000000217', '22222222-0000-4000-8000-000000000217']::uuid[]
);
reset role;

select results_eq(
  $$ select iglesia from seguidas where telefono = 'admin' $$,
  $$ values ('Iglesia dos') $$,
  'Saving it with active ones keeps only the active ones'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.reactivar_iglesia('11111111-0000-4000-8000-000000000217');
reset role;

select is_empty(
  $$ select 1 from seguidas where iglesia = 'Iglesia uno' $$,
  'A reactivada iglesia does not come back on its own'
);

-- What the triggers leave alone ---------------------------------------------------------------

select lives_ok(
  $$ update public.iglesias set nombre = 'Iglesia dos renombrada'
     where id = '22222222-0000-4000-8000-000000000217' $$,
  'Changing anything else of an iglesia works'
);

select results_eq(
  $$ select count(*)::int from seguidas where iglesia = 'Iglesia dos renombrada' $$,
  $$ values (3) $$,
  'and keeps who follows it'
);

select * from finish();

rollback;
