-- Dar de baja and reactivar iglesias and distritos (issue #159).
--
-- 1. Only the admin of the asociacion gives de baja and reactiva; the pastor,
--    the encargado, the admin of another asociacion and anon do not.
-- 2. An iglesia de baja loses its cargos; its eventos leave every calendario,
--    also the iglesias they are shared with, and come back when it is
--    reactivada. The cargos do not.
-- 3. A distrito with active iglesias is not given de baja. Without them, its
--    pastor loses the cargo and its eventos de distrito leave every
--    calendario; reactivarlo brings the eventos back, not the cargo.
-- 4. No active iglesia is left in a distrito de baja, and nobody gets a cargo
--    on something de baja.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;
-- To see which locks the triggers take on a row.
create extension if not exists pgrowlocks with schema extensions;

select plan(51);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba'),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'Otra asociación');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Norte'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Sur'),
  ('dddddddd-0000-4000-8000-000000000003', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Vacío'),
  -- Touched by no step but the last one: no earlier lock hides the one of a new cargo.
  ('dddddddd-0000-4000-8000-000000000004', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito Este');

insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia Las Rosas', 'Pringles 820', 'San Luis', 'San Luis'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia El Trapiche', 'Ruta 9', 'El Trapiche', 'San Luis');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'admin@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'pastor.norte@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'encargado@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'secretaria@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'admin.otra@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'pastor.vacio@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'encargado.trapiche@prueba.example.com');

insert into public.cargos (usuario_id, iglesia_id, distrito_id, asociacion_id, es_secretaria) values
  ('bbbbbbbb-0000-4000-8000-000000000001', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', false),
  ('bbbbbbbb-0000-4000-8000-000000000002', null, 'dddddddd-0000-4000-8000-000000000001', null, false),
  ('bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001', null, null, false),
  ('bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000001', null, null, true),
  ('bbbbbbbb-0000-4000-8000-000000000005', null, null, 'aaaaaaaa-0000-4000-8000-000000000002', false),
  ('bbbbbbbb-0000-4000-8000-000000000006', null, 'dddddddd-0000-4000-8000-000000000003', null, false),
  ('bbbbbbbb-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000002', null, null, false);

-- An evento of Las Rosas shared with El Trapiche, and one of the Distrito Vacío.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, duenio_distrito_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Culto joven', 'iglesia', '11111111-0000-4000-8000-000000000001', null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'Congreso del Vacío', 'distrito', null, 'dddddddd-0000-4000-8000-000000000003', '10:00'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'Retiro del Trapiche', 'iglesia', '11111111-0000-4000-8000-000000000002', null, '09:00');

-- A weekly series of Las Rosas with one date changed.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, hora, repeticion, fin_de_serie) values
  ('eeeeeeee-0000-4000-8000-000000000004', 'Culto de oración', 'iglesia', '11111111-0000-4000-8000-000000000001', '20:00', 'semanal', '2026-11-14');

insert into public.eventos_fechas (evento_id, fecha) values
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-14'),
  ('eeeeeeee-0000-4000-8000-000000000001', '2026-11-07'),
  ('eeeeeeee-0000-4000-8000-000000000002', '2026-11-08'),
  ('eeeeeeee-0000-4000-8000-000000000003', '2026-11-09');

insert into public.excepciones (evento_id, fecha, titulo) values
  ('eeeeeeee-0000-4000-8000-000000000004', '2026-11-14', 'Culto especial');

insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002'),
  ('eeeeeeee-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001');

-- Rejected: whoever is not the admin of the asociacion ------------------------------

set local role authenticated;

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.dar_de_baja_iglesia('11111111-0000-4000-8000-000000000001') $$,
  '42501', null, 'the pastor cannot give an iglesia of their distrito de baja'
);
select throws_ok(
  $$ select public.dar_de_baja_distrito('dddddddd-0000-4000-8000-000000000001') $$,
  '42501', null, 'the pastor cannot give their distrito de baja'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';
select throws_ok(
  $$ select public.dar_de_baja_iglesia('11111111-0000-4000-8000-000000000001') $$,
  '42501', null, 'the secretaria cannot give her iglesia de baja'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';
select throws_ok(
  $$ select public.dar_de_baja_iglesia('11111111-0000-4000-8000-000000000001') $$,
  '42501', null, 'the admin of another asociacion cannot give the iglesia de baja'
);
select throws_ok(
  $$ select public.dar_de_baja_iglesia('11111111-0000-4000-8000-0000000000ff') $$,
  '42501', null, 'an iglesia that does not exist is answered as one of another asociacion'
);

-- The mark changes only through the functions, not even for the admin.
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$ update public.iglesias set de_baja = true where id = '11111111-0000-4000-8000-000000000001' $$,
  '42501', null, 'the admin cannot write the mark de_baja of an iglesia directly'
);
select throws_ok(
  $$ update public.distritos set de_baja = true where id = 'dddddddd-0000-4000-8000-000000000003' $$,
  '42501', null, 'the admin cannot write the mark de_baja of a distrito directly'
);

set local role anon;
select throws_ok(
  $$ select public.dar_de_baja_iglesia('11111111-0000-4000-8000-000000000001') $$,
  '42501', null, 'anon cannot give an iglesia de baja'
);

reset role;
select is(
  -- Only the rows of this test: the seed has an iglesia de baja of its own.
  (select count(*)::int from public.iglesias where de_baja and id::text like '11111111-%')
    + (select count(*)::int from public.distritos where de_baja and id::text like 'dddddddd-%'),
  0,
  'nothing was given de baja by the rejected calls'
);

-- Dar de baja an iglesia --------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ select public.dar_de_baja_iglesia('11111111-0000-4000-8000-000000000001') $$,
  'the admin can give an iglesia of their asociacion de baja'
);
select ok(
  (select de_baja from public.iglesias where id = '11111111-0000-4000-8000-000000000001'),
  'the iglesia is de baja, and still readable'
);

reset role;
select is(
  (select count(*)::int from public.cargos where iglesia_id = '11111111-0000-4000-8000-000000000001'),
  0,
  'its encargado and its secretaria lose the cargo'
);
select is(
  (select count(*)::int from public.cargos where distrito_id = 'dddddddd-0000-4000-8000-000000000001'),
  1,
  'the pastor of its distrito keeps the cargo'
);
select ok(
  exists (select 1 from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001'),
  'its eventos stay stored'
);

-- Its eventos leave every calendario: the hermano, the admin, and the iglesia
-- it shares them with.
set local role anon;
select is_empty(
  $$ select id from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'the hermano does not see an evento of an iglesia de baja'
);
select is_empty(
  $$ select fecha from public.eventos_fechas join public.eventos on eventos.id = eventos_fechas.evento_id
     where eventos.id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'nor its dates, read through their evento'
);
select is_empty(
  $$ select fecha from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'nor its dates, read on their own'
);
select is_empty(
  $$ select fecha from public.excepciones where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  'nor the excepciones of its series'
);
select is_empty(
  $$ select evento_id from public.iglesias_sumadas
     where iglesia_id = '11111111-0000-4000-8000-000000000002'
       and evento_id = 'eeeeeeee-0000-4000-8000-000000000001'
       and exists (select 1 from public.eventos where eventos.id = iglesias_sumadas.evento_id) $$,
  'an evento shared by an iglesia de baja leaves the calendario of the iglesia sumada'
);
select is_empty(
  $$ select evento_id from public.iglesias_sumadas where iglesia_id = '11111111-0000-4000-8000-000000000001' $$,
  'an iglesia de baja is sumada to nothing'
);
select isnt_empty(
  $$ select id from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  'the eventos of the other iglesias are still seen'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select is_empty(
  $$ select id from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'the admin does not see an evento of an iglesia de baja either'
);
select is_empty(
  $$ select evento_id from public.buscar_eventos('2026-11-01', '2026-11-30', 'culto joven') $$,
  'nor does the chat find it'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000007", "role": "authenticated"}';
select is_empty(
  $$ select evento_id from public.buscar_eventos('2026-11-01', '2026-11-30', 'culto joven') $$,
  'the encargado of the iglesia sumada does not find it in the chat'
);

-- Nobody gets a cargo on it.
reset role;
select throws_ok(
  $$ insert into public.cargos (usuario_id, iglesia_id)
     values ('bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000001') $$,
  '23514', null, 'nobody gets a cargo on an iglesia de baja'
);

-- Reactivar the iglesia -----------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.reactivar_iglesia('11111111-0000-4000-8000-000000000001') $$,
  '42501', null, 'the pastor cannot reactivar an iglesia'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ select public.reactivar_iglesia('11111111-0000-4000-8000-000000000001') $$,
  'the admin can reactivar an iglesia of their asociacion'
);

set local role anon;
select isnt_empty(
  $$ select id from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'reactivada, its eventos come back'
);
select isnt_empty(
  $$ select fecha from public.excepciones where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  'with the excepciones of their series'
);
select isnt_empty(
  $$ select evento_id from public.iglesias_sumadas
     where iglesia_id = '11111111-0000-4000-8000-000000000002'
       and evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'and the evento it shares comes back to the iglesia sumada'
);
select isnt_empty(
  $$ select evento_id from public.iglesias_sumadas where iglesia_id = '11111111-0000-4000-8000-000000000001' $$,
  'and it is sumada again to what it was sumada to'
);

reset role;
select is(
  (select count(*)::int from public.cargos where iglesia_id = '11111111-0000-4000-8000-000000000001'),
  0,
  'reactivada, its cargos do not come back on their own'
);

-- A sumada made redundant while it was hidden goes when it is reactivada:
-- here the evento it was sumada to moves to the asociacion.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select public.dar_de_baja_iglesia('11111111-0000-4000-8000-000000000001');

reset role;
update public.eventos
  set alcance = 'asociacion', duenio_iglesia_id = null, duenio_asociacion_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  where id = 'eeeeeeee-0000-4000-8000-000000000003';

set local role authenticated;
select lives_ok(
  $$ select public.reactivar_iglesia('11111111-0000-4000-8000-000000000001') $$,
  'the iglesia is reactivada after the evento moved to the asociacion'
);

reset role;
select is_empty(
  $$ select evento_id from public.iglesias_sumadas
     where iglesia_id = '11111111-0000-4000-8000-000000000001'
       and evento_id = 'eeeeeeee-0000-4000-8000-000000000003' $$,
  'reactivada, it is no longer sumada to an evento it now sees by its alcance'
);

-- Dar de baja a distrito ----------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ select public.dar_de_baja_distrito('dddddddd-0000-4000-8000-000000000001') $$,
  '23514', null, 'a distrito with active iglesias cannot be given de baja'
);
select lives_ok(
  $$ select public.dar_de_baja_distrito('dddddddd-0000-4000-8000-000000000003') $$,
  'the admin can give a distrito without active iglesias de baja'
);

reset role;
select is(
  (select count(*)::int from public.cargos where distrito_id = 'dddddddd-0000-4000-8000-000000000003'),
  0,
  'its pastor loses the cargo'
);

set local role anon;
select is_empty(
  $$ select id from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  'its eventos de distrito leave the calendario'
);

-- No active iglesia ends up in it, and nobody gets a cargo on it.
set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$ update public.iglesias set distrito_id = 'dddddddd-0000-4000-8000-000000000003'
     where id = '11111111-0000-4000-8000-000000000002' $$,
  '23514', null, 'an iglesia cannot be moved to a distrito de baja'
);
select throws_ok(
  $$ insert into public.iglesias (distrito_id, nombre, direccion, ciudad, provincia)
     values ('dddddddd-0000-4000-8000-000000000003', 'Iglesia Nueva', 'Calle 1', 'Ciudad', 'Provincia') $$,
  '23514', null, 'an iglesia cannot be created in a distrito de baja'
);

reset role;
select throws_ok(
  $$ insert into public.cargos (usuario_id, distrito_id)
     values ('bbbbbbbb-0000-4000-8000-000000000006', 'dddddddd-0000-4000-8000-000000000003') $$,
  '23514', null, 'nobody gets a cargo on a distrito de baja'
);

-- An iglesia de baja in it stays de baja until the distrito is reactivado.
update public.iglesias set distrito_id = 'dddddddd-0000-4000-8000-000000000003', de_baja = true
  where id = '11111111-0000-4000-8000-000000000002';

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select throws_ok(
  $$ select public.reactivar_iglesia('11111111-0000-4000-8000-000000000002') $$,
  '23514', null, 'an iglesia cannot be reactivada in a distrito de baja'
);

-- Reactivar the distrito ----------------------------------------------------------------

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';
select throws_ok(
  $$ select public.reactivar_distrito('dddddddd-0000-4000-8000-000000000003') $$,
  '42501', null, 'the pastor cannot reactivar a distrito'
);

set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
select lives_ok(
  $$ select public.reactivar_distrito('dddddddd-0000-4000-8000-000000000003') $$,
  'the admin can reactivar a distrito of their asociacion'
);
select ok(
  (select de_baja from public.iglesias where id = '11111111-0000-4000-8000-000000000002'),
  'its iglesias de baja stay de baja'
);
select lives_ok(
  $$ select public.reactivar_iglesia('11111111-0000-4000-8000-000000000002') $$,
  'once the distrito is reactivado, its iglesia can be reactivada'
);

set local role anon;
select isnt_empty(
  $$ select id from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  'reactivado, its eventos de distrito come back'
);

reset role;
select is(
  (select count(*)::int from public.cargos where distrito_id = 'dddddddd-0000-4000-8000-000000000003'),
  0,
  'reactivado, the cargo of its pastor does not come back on its own'
);

-- A cargo locks the iglesia or the distrito it is on for share, so a baja
-- running at the same time waits for it and then removes it: a key share
-- lock, the one of the foreign key, does not make the baja wait.
reset role;
insert into public.cargos (usuario_id, iglesia_id)
  values ('bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000002');
select ok(
  exists (
    select 1
    from extensions.pgrowlocks('public.iglesias')
    where locked_row = (select ctid from public.iglesias where id = '11111111-0000-4000-8000-000000000002')
      and 'For Share' = any (modes)
  ),
  'a new cargo on an iglesia locks it for share'
);
select ok(
  not exists (
    select 1
    from extensions.pgrowlocks('public.distritos')
    where locked_row = (select ctid from public.distritos where id = 'dddddddd-0000-4000-8000-000000000004')
  ),
  'the distrito has no lock before the cargo'
);
insert into public.cargos (usuario_id, distrito_id)
  values ('bbbbbbbb-0000-4000-8000-000000000006', 'dddddddd-0000-4000-8000-000000000004');
select ok(
  exists (
    select 1
    from extensions.pgrowlocks('public.distritos')
    where locked_row = (select ctid from public.distritos where id = 'dddddddd-0000-4000-8000-000000000004')
      and 'For Share' = any (modes)
  ),
  'a new cargo on a distrito locks it for share'
);

select * from finish();
rollback;
