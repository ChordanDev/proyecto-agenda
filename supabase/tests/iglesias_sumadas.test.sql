-- Permission tests for sumar and quitar iglesias of an evento: the list of
-- iglesias sumadas saved with public.guardar_evento, and
-- public.quitar_evento_de_iglesia.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- The structure of the fixtures:
--
--   Asociación de la prueba (the admin)
--     Distrito dueño (the pastor)
--       Iglesia dueña (its encargado)
--       Iglesia vecina (its encargado)
--     Otro distrito
--       Iglesia sumada (its encargado)
--       Tercera iglesia (its encargado)
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(44);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Distrito dueño'),
  ('dddddddd-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001', 'Otro distrito');

insert into public.iglesias (id, distrito_id, nombre, direccion, localidad) values
  ('11111111-0000-4000-8000-000000000001', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia dueña', 'Calle 1', 'Localidad'),
  ('11111111-0000-4000-8000-000000000002', 'dddddddd-0000-4000-8000-000000000001', 'Iglesia vecina', 'Calle 2', 'Localidad'),
  ('11111111-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000002', 'Iglesia sumada', 'Calle 3', 'Localidad'),
  ('11111111-0000-4000-8000-000000000004', 'dddddddd-0000-4000-8000-000000000002', 'Tercera iglesia', 'Calle 4', 'Localidad');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'duenia@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'vecina@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'sumada@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'tercera@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'pastor@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'admin@prueba.example.com');

insert into public.cargos (id, usuario_id, iglesia_id, distrito_id, asociacion_id) values
  ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', null, null),
  ('cccccccc-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002', null, null),
  ('cccccccc-0000-4000-8000-000000000003', 'bbbbbbbb-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000003', null, null),
  ('cccccccc-0000-4000-8000-000000000004', 'bbbbbbbb-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000004', null, null),
  ('cccccccc-0000-4000-8000-000000000005', 'bbbbbbbb-0000-4000-8000-000000000005', null, 'dddddddd-0000-4000-8000-000000000001', null),
  ('cccccccc-0000-4000-8000-000000000006', 'bbbbbbbb-0000-4000-8000-000000000006', null, null, 'aaaaaaaa-0000-4000-8000-000000000001');

-- An evento of the Iglesia dueña shared with two iglesias of the other distrito,
-- one of the Distrito dueño and one of the asociacion.
insert into public.eventos (id, titulo, alcance, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id, hora) values
  ('eeeeeeee-0000-4000-8000-000000000001', 'Compartido', 'iglesia', '11111111-0000-4000-8000-000000000001', null, null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000002', 'Del distrito', 'distrito', null, 'dddddddd-0000-4000-8000-000000000001', null, '19:00'),
  ('eeeeeeee-0000-4000-8000-000000000003', 'De la asociación', 'asociacion', null, null, 'aaaaaaaa-0000-4000-8000-000000000001', '19:00');

insert into public.eventos_fechas (evento_id, fecha)
select id, '2026-11-14' from public.eventos where id::text like 'eeeeeeee-%';

insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003'),
  ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000004');

-- The function and the rule of the alcance -----------------------------------------

select function_returns('public', 'quitar_evento_de_iglesia', array['uuid', 'uuid'], 'void');
select isnt_definer('public', 'quitar_evento_de_iglesia', array['uuid', 'uuid']);
select function_privs_are(
  'public', 'quitar_evento_de_iglesia', array['uuid', 'uuid'], 'anon', array[]::text[],
  'anon cannot execute quitar_evento_de_iglesia'
);
select function_privs_are(
  'public', 'quitar_evento_de_iglesia', array['uuid', 'uuid'], 'authenticated', array['EXECUTE'],
  'authenticated can execute quitar_evento_de_iglesia'
);

-- The rule holds for every role: the superuser that loads data cannot break it.
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001') $$,
  '23514', null, 'the duenia of an evento of iglesia is not sumada to it'
);
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000002') $$,
  '23514', null, 'an iglesia of the distrito duenio is not sumada to its evento'
);
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000003') $$,
  '23514', 'An evento of asociacion is not shared with iglesias',
  'an evento of asociacion is not shared'
);

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000003') $$,
  '42501', 'permission denied for table iglesias_sumadas', 'anon cannot insert iglesias_sumadas'
);
select throws_ok(
  $$ delete from public.iglesias_sumadas $$,
  '42501', 'permission denied for table iglesias_sumadas', 'anon cannot delete iglesias_sumadas'
);
select throws_ok(
  $$ select public.quitar_evento_de_iglesia(
    'eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003') $$,
  '42501', 'permission denied for function quitar_evento_de_iglesia',
  'anon cannot quitar an evento'
);

reset role;

-- The encargado of the Iglesia sumada ---------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

-- Rejected: the iglesia sumada never edits the evento.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Cambiado por la sumada',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[]) $$,
  'P0002', null, 'the encargado of the iglesia sumada cannot edit the evento'
);
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Compartido',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[],
    iglesias_sumadas => array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  'P0002', null, 'the encargado of the iglesia sumada cannot change the list'
);

reset role;

select results_eq(
  $$ select titulo from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('Compartido'::text) $$,
  'the evento was not edited by the iglesia sumada'
);

-- The encargado of a third iglesia ---------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000004", "role": "authenticated"}';

-- Rejected: quitar the evento from the calendario of another iglesia. This
-- third iglesia is sumada too, but that covers its own row only.
select throws_ok(
  $$ select public.quitar_evento_de_iglesia(
    'eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003') $$,
  '42501', null, 'the encargado of a third iglesia cannot quitar the evento from another one'
);
select is_empty(
  $$ delete from public.iglesias_sumadas
     where iglesia_id = '11111111-0000-4000-8000-000000000003' returning evento_id $$,
  'the encargado of a third iglesia cannot delete the row of another one'
);

reset role;

select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' order by iglesia_id $$,
  $$ values ('11111111-0000-4000-8000-000000000003'::uuid), ('11111111-0000-4000-8000-000000000004'::uuid) $$,
  'the iglesias sumadas are intact after the rejected quitar'
);

-- The encargado of the Iglesia sumada quita it ---------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000003", "role": "authenticated"}';

select lives_ok(
  $$ select public.quitar_evento_de_iglesia(
    'eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003') $$,
  'the encargado of the iglesia sumada quita the evento from its calendario'
);
select lives_ok(
  $$ select public.quitar_evento_de_iglesia(
    'eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003') $$,
  'a quitar sent again does not fail'
);

-- Rejected: once quitada, only the duenio sums it again.
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000003') $$,
  '42501', 'new row violates row-level security policy for table "iglesias_sumadas"',
  'the iglesia quitada cannot sum itself again'
);

reset role;

select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('11111111-0000-4000-8000-000000000004'::uuid) $$,
  'quitar only removes the iglesia that quita'
);
select results_eq(
  $$ select titulo from public.eventos where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('Compartido'::text) $$,
  'the evento still exists for its duenio'
);
select isnt_empty(
  $$ select 1 from public.eventos_fechas where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  'the evento keeps its dates'
);

-- The encargado of another iglesia, the Iglesia vecina -------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}';

-- Rejected: sumar iglesias to an evento of someone else.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Compartido',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[],
    iglesias_sumadas => array['11111111-0000-4000-8000-000000000002']::uuid[]) $$,
  'P0002', null, 'the encargado of another iglesia cannot save the list of an evento'
);
select throws_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id)
     values ('eeeeeeee-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000002') $$,
  '42501', 'new row violates row-level security policy for table "iglesias_sumadas"',
  'the encargado of another iglesia cannot sumar their iglesia to an evento of someone else'
);
select is_empty(
  $$ delete from public.iglesias_sumadas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000001' returning iglesia_id $$,
  'the encargado of another iglesia cannot stop sumando an iglesia'
);

reset role;

-- The encargado of the Iglesia dueña --------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

-- Allowed: creating an evento with iglesias sumadas, one of them twice.
select is(
  public.guardar_evento(
    nuevo_evento_id => 'eeeeeeee-0000-4000-8000-000000000004',
    titulo => 'Nuevo compartido',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-28',
    fechas => array['2026-11-14', '2026-11-21', '2026-11-28']::date[],
    iglesias_sumadas => array[
      '11111111-0000-4000-8000-000000000002',
      '11111111-0000-4000-8000-000000000003',
      '11111111-0000-4000-8000-000000000003'
    ]::uuid[]),
  'eeeeeeee-0000-4000-8000-000000000004'::uuid,
  'the encargado of the iglesia duenia saves an evento with iglesias sumadas'
);
select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' order by iglesia_id $$,
  $$ values ('11111111-0000-4000-8000-000000000002'::uuid), ('11111111-0000-4000-8000-000000000003'::uuid) $$,
  'the evento is shared with each iglesia of the list once, for the whole series'
);

-- Allowed: editing with a list replaces the one it had.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000004',
    titulo => 'Nuevo compartido',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-28',
    fechas => array['2026-11-14', '2026-11-21', '2026-11-28']::date[],
    iglesias_sumadas => array['11111111-0000-4000-8000-000000000004']::uuid[]) $$,
  'the encargado of the iglesia duenia edits the list'
);
select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  $$ values ('11111111-0000-4000-8000-000000000004'::uuid) $$,
  'the list saved replaces the one the evento had'
);

-- Allowed: editing without a list keeps the one it has.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000004',
    titulo => 'Renombrado',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-28',
    fechas => array['2026-11-14', '2026-11-21', '2026-11-28']::date[]) $$,
  'the encargado of the iglesia duenia edits the evento without the list'
);
select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  $$ values ('11111111-0000-4000-8000-000000000004'::uuid) $$,
  'an edit without the list keeps the iglesias sumadas'
);

-- Allowed: the duenio sums again the iglesia that quito the evento.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000001',
    titulo => 'Compartido',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[],
    iglesias_sumadas => array[
      '11111111-0000-4000-8000-000000000003',
      '11111111-0000-4000-8000-000000000004'
    ]::uuid[]) $$,
  'the encargado of the iglesia duenia sums again the iglesia that quito it'
);

-- Rejected: the duenia itself is not sumada to its evento.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000004',
    titulo => 'Renombrado',
    alcance => 'iglesia',
    duenio_iglesia_id => '11111111-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-28',
    fechas => array['2026-11-14', '2026-11-21', '2026-11-28']::date[],
    iglesias_sumadas => array['11111111-0000-4000-8000-000000000001']::uuid[]) $$,
  '23514', null, 'the iglesia duenia cannot be sumada to its own evento'
);

-- Allowed: the duenio stops sumando an iglesia by deleting its row.
select isnt_empty(
  $$ delete from public.iglesias_sumadas
     where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' returning iglesia_id $$,
  'the encargado of the iglesia duenia stops sumando an iglesia'
);

reset role;

-- The pastor of the Distrito dueño ---------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

-- Rejected: an iglesia of the distrito already sees an evento of the distrito.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000002',
    titulo => 'Del distrito',
    alcance => 'distrito',
    duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[],
    iglesias_sumadas => array['11111111-0000-4000-8000-000000000002']::uuid[]) $$,
  '23514', null, 'an iglesia of the same distrito cannot be sumada to an evento of distrito'
);

-- Allowed: an iglesia of another distrito.
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000002',
    titulo => 'Del distrito',
    alcance => 'distrito',
    duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[],
    iglesias_sumadas => array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  'the pastor sums an iglesia of another distrito to an evento of their distrito'
);

-- Allowed: an evento of iglesia that becomes of the distrito drops the iglesias
-- of the distrito, which now see it by its alcance, even without a list.
select lives_ok(
  $$ insert into public.iglesias_sumadas (evento_id, iglesia_id) values
     ('eeeeeeee-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000002'),
     ('eeeeeeee-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000003') $$,
  'the pastor sums iglesias to an evento of an iglesia of their distrito'
);
select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000004',
    titulo => 'Renombrado',
    alcance => 'distrito',
    duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'semanal',
    fin_de_serie => '2026-11-28',
    fechas => array['2026-11-14', '2026-11-21', '2026-11-28']::date[]) $$,
  'the pastor moves the evento to their distrito'
);

reset role;

select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000004' $$,
  $$ values ('11111111-0000-4000-8000-000000000003'::uuid) $$,
  'an iglesia that now sees the evento by its alcance stops being sumada'
);

-- The admin of the asociacion -----------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000006", "role": "authenticated"}';

-- Rejected: an evento of asociacion is not shared.
select throws_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000003',
    titulo => 'De la asociación',
    alcance => 'asociacion',
    duenio_asociacion_id => 'aaaaaaaa-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[],
    iglesias_sumadas => array['11111111-0000-4000-8000-000000000003']::uuid[]) $$,
  '23514', 'An evento of asociacion is not shared with iglesias',
  'the admin cannot sumar iglesias to an evento of asociacion'
);

-- Allowed: the admin covers every iglesia, so they quitan for any of them.
select lives_ok(
  $$ select public.quitar_evento_de_iglesia(
    'eeeeeeee-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000003') $$,
  'the admin quita an evento from the calendario of an iglesia'
);

reset role;

select is_empty(
  $$ select 1 from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  'the evento of the distrito is no longer shared'
);

-- An iglesia sumada that moves into the distrito duenio ----------------------------
-- The developers move the Tercera iglesia into the Distrito dueño while it is
-- sumada. The list the app read still has it: saving that list drops it
-- instead of failing on every try.

insert into public.iglesias_sumadas (evento_id, iglesia_id) values
  ('eeeeeeee-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000004');
update public.iglesias set distrito_id = 'dddddddd-0000-4000-8000-000000000001'
  where id = '11111111-0000-4000-8000-000000000004';

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000005", "role": "authenticated"}';

select lives_ok(
  $$ select public.guardar_evento(
    evento_id => 'eeeeeeee-0000-4000-8000-000000000002',
    titulo => 'Del distrito',
    alcance => 'distrito',
    duenio_distrito_id => 'dddddddd-0000-4000-8000-000000000001',
    hora => '19:00',
    repeticion => 'ninguna',
    fechas => array['2026-11-14']::date[],
    iglesias_sumadas => array[
      '11111111-0000-4000-8000-000000000003',
      '11111111-0000-4000-8000-000000000004'
    ]::uuid[]) $$,
  'the pastor saves a list that still has an iglesia now of their distrito'
);

reset role;

select results_eq(
  $$ select iglesia_id from public.iglesias_sumadas where evento_id = 'eeeeeeee-0000-4000-8000-000000000002' $$,
  $$ values ('11111111-0000-4000-8000-000000000003'::uuid) $$,
  'the iglesia that moved into the distrito stops being sumada; the rest of the list is saved'
);

select * from finish();

rollback;
