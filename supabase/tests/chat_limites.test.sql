-- Permission tests for the limits and the consentimiento of the chat: a usuario
-- reads and saves only their own consentimiento, nobody but the server touches
-- the counters, and the hermano reaches none of it.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

-- Fixtures ---------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Asociación de la prueba');

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'acepta@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'otro@prueba.example.com');

insert into public.chat_consentimientos (usuario_id) values
  ('bbbbbbbb-0000-4000-8000-000000000002');

-- The zona horaria of the asociacion --------------------------------------------

select has_column('public', 'asociaciones', 'zona_horaria', 'asociaciones has a zona horaria');
select is(
  (select zona_horaria from public.asociaciones where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'America/Argentina/Buenos_Aires',
  'an asociacion is in the hora of Buenos Aires unless told otherwise'
);
select throws_ok(
  $$ update public.asociaciones set zona_horaria = 'America/Ciudad_Inventada'
     where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '23514', 'The zona horaria America/Ciudad_Inventada does not exist',
  'a zona horaria Postgres does not know is rejected'
);

-- The policies and the function themselves ---------------------------------------

select policies_are('public', 'chat_consentimientos', array[
  'Usuarios can read their own consentimiento',
  'Usuarios can save their own consentimiento'
]);
select policies_are('public', 'chat_consultas', array[]::name[], 'chat_consultas has no policies');
select policies_are('public', 'chat_gastos', array[]::name[], 'chat_gastos has no policies');

select isnt_definer('public', 'registrar_consulta', array['uuid', 'date', 'date', 'numeric']);
select function_privs_are(
  'public', 'registrar_consulta', array['uuid', 'date', 'date', 'numeric'], 'anon', array[]::text[],
  'anon cannot execute registrar_consulta'
);
select function_privs_are(
  'public', 'registrar_consulta', array['uuid', 'date', 'date', 'numeric'], 'authenticated', array[]::text[],
  'authenticated cannot execute registrar_consulta'
);
select function_privs_are(
  'public', 'registrar_consulta', array['uuid', 'date', 'date', 'numeric'], 'service_role', array['EXECUTE'],
  'service_role can execute registrar_consulta'
);

select ok(
  has_column_privilege('authenticated', 'public.chat_consentimientos', 'usuario_id', 'INSERT')
    and not has_column_privilege('authenticated', 'public.chat_consentimientos', 'aceptado_en', 'INSERT'),
  'a usuario saves who accepted, never when'
);

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.chat_consentimientos $$,
  '42501', 'permission denied for table chat_consentimientos', 'anon cannot read consentimientos'
);
select throws_ok(
  $$ insert into public.chat_consentimientos (usuario_id) values ('bbbbbbbb-0000-4000-8000-000000000001') $$,
  '42501', 'permission denied for table chat_consentimientos', 'anon cannot save a consentimiento'
);
select throws_ok(
  $$ select * from public.chat_consultas $$,
  '42501', 'permission denied for table chat_consultas', 'anon cannot read the consultas'
);
select throws_ok(
  $$ select * from public.chat_gastos $$,
  '42501', 'permission denied for table chat_gastos', 'anon cannot read the gasto'
);
select throws_ok(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', 0) $$,
  '42501', 'permission denied for function registrar_consulta', 'anon cannot register a consulta'
);

reset role;

-- A usuario ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.chat_consentimientos (usuario_id) values ('bbbbbbbb-0000-4000-8000-000000000001') $$,
  'a usuario saves their own consentimiento'
);
select is(
  (select count(*)::integer from public.chat_consentimientos
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  1,
  'a usuario reads their own consentimiento'
);
select is(
  (select count(*)::integer from public.chat_consentimientos
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  0,
  'a usuario does not read the consentimiento of another'
);
select throws_ok(
  $$ insert into public.chat_consentimientos (usuario_id) values ('bbbbbbbb-0000-4000-8000-000000000002') $$,
  '42501', 'new row violates row-level security policy for table "chat_consentimientos"',
  'a usuario cannot save the consentimiento of another'
);
select throws_ok(
  $$ insert into public.chat_consentimientos (usuario_id, aceptado_en)
     values ('bbbbbbbb-0000-4000-8000-000000000001', '2020-01-01') $$,
  '42501', 'permission denied for table chat_consentimientos',
  'a usuario cannot choose when they accepted'
);
select throws_ok(
  $$ select * from public.chat_consultas $$,
  '42501', 'permission denied for table chat_consultas', 'a usuario cannot read the consultas'
);
select throws_ok(
  $$ insert into public.chat_consultas (usuario_id, dia, cantidad)
     values ('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', 0) $$,
  '42501', 'permission denied for table chat_consultas', 'a usuario cannot write the consultas'
);
select throws_ok(
  $$ update public.chat_consultas set cantidad = 0 $$,
  '42501', 'permission denied for table chat_consultas', 'a usuario cannot reset the consultas'
);
select throws_ok(
  $$ insert into public.chat_gastos (mes, usd) values ('2026-10-01', 0) $$,
  '42501', 'permission denied for table chat_gastos', 'a usuario cannot write the gasto'
);
select throws_ok(
  $$ update public.chat_gastos set usd = 0 $$,
  '42501', 'permission denied for table chat_gastos', 'a usuario cannot reset the gasto'
);
select throws_ok(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', 0) $$,
  '42501', 'permission denied for function registrar_consulta', 'a usuario cannot register a consulta'
);

reset role;

-- The server (service_role) -------------------------------------------------------------

set local role service_role;

select results_eq(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', 0.002) $$,
  $$ values (1, 0.002::numeric) $$,
  'the server registers the first consulta of a dia and its costo'
);
select results_eq(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', 0.003) $$,
  $$ values (2, 0.005::numeric) $$,
  'another consulta adds to the dia and to the mes'
);
select results_eq(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-17', '2026-10-01', 0.001) $$,
  $$ values (1, 0.006::numeric) $$,
  'each usuario has their own consultas, and the gasto is one for all'
);
select results_eq(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-18', '2026-10-01', 0) $$,
  $$ values (1, 0.006::numeric) $$,
  'a new dia counts the consultas from zero'
);
select results_eq(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-11-01', '2026-11-01', 0.001) $$,
  $$ values (1, 0.001::numeric) $$,
  'a new mes counts the gasto from zero'
);
select throws_ok(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', -1) $$,
  '22023', 'The costo of a consulta cannot be negative', 'a costo cannot be negative'
);
select throws_ok(
  $$ select * from public.registrar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-17', 0) $$,
  '23514', null, 'the mes is its first day'
);

reset role;

select is(
  (select cantidad from public.chat_consultas
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000001' and dia = '2026-10-17'),
  2,
  'the consultas are kept by usuario and dia'
);

select * from finish();
rollback;
