-- Permission tests for the reserva of a consulta of the chat: the server
-- reserves the consulta before calling the model, so the limite diario holds
-- even with consultas at the same time, and frees it when the respuesta fails.
-- Nobody but the server (service_role) reaches any of it.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'casi@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'nueva@prueba.example.com');

-- 49 consultas today: one left of a limite of 50.
insert into public.chat_consultas (usuario_id, dia, cantidad) values
  ('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', 49);

-- The functions themselves -----------------------------------------------------------

select isnt_definer('public', 'reservar_consulta', array['uuid', 'date', 'date', 'integer', 'numeric']);
select isnt_definer('public', 'confirmar_consulta', array['uuid', 'date', 'date', 'numeric']);
select isnt_definer('public', 'liberar_consulta', array['uuid', 'date']);

select function_privs_are(
  'public', 'reservar_consulta', array['uuid', 'date', 'date', 'integer', 'numeric'], 'authenticated', array[]::text[],
  'authenticated cannot execute reservar_consulta'
);
select function_privs_are(
  'public', 'confirmar_consulta', array['uuid', 'date', 'date', 'numeric'], 'authenticated', array[]::text[],
  'authenticated cannot execute confirmar_consulta'
);
select function_privs_are(
  'public', 'liberar_consulta', array['uuid', 'date'], 'authenticated', array[]::text[],
  'authenticated cannot execute liberar_consulta'
);
select function_privs_are(
  'public', 'reservar_consulta', array['uuid', 'date', 'date', 'integer', 'numeric'], 'service_role', array['EXECUTE'],
  'service_role can execute reservar_consulta'
);
select function_privs_are(
  'public', 'confirmar_consulta', array['uuid', 'date', 'date', 'numeric'], 'service_role', array['EXECUTE'],
  'service_role can execute confirmar_consulta'
);
select function_privs_are(
  'public', 'liberar_consulta', array['uuid', 'date'], 'service_role', array['EXECUTE'],
  'service_role can execute liberar_consulta'
);

-- Without a sesion and with one --------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', 50, 20) $$,
  '42501', 'permission denied for function reservar_consulta', 'anon cannot reserve a consulta'
);

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ select public.liberar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17') $$,
  '42501', 'permission denied for function liberar_consulta', 'a usuario cannot free their own consultas'
);

reset role;

-- The server (service_role) ------------------------------------------------------------

set local role service_role;

select is(
  public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', 50, 20),
  'reservada',
  'the server reserves the last consulta of the dia'
);
select is(
  (select cantidad from public.chat_consultas
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000001' and dia = '2026-10-17'),
  50,
  'a reserva counts the consulta at once, before the model answers'
);
select is(
  public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17', '2026-10-01', 50, 20),
  'limite_diario',
  'a reserva past the limite diario is rejected'
);
select is(
  (select cantidad from public.chat_consultas
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000001' and dia = '2026-10-17'),
  50,
  'a rejected reserva counts nothing'
);
select is(
  public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-18', '2026-10-01', 50, 20),
  'reservada',
  'the next dia the count starts again'
);
select is(
  public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-17', '2026-10-01', 50, 20),
  'reservada',
  'the first consulta of a usuario is reserved'
);

select lives_ok(
  $$ select public.liberar_consulta('bbbbbbbb-0000-4000-8000-000000000001', '2026-10-17') $$,
  'the server frees a consulta whose respuesta failed'
);
select is(
  (select cantidad from public.chat_consultas
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000001' and dia = '2026-10-17'),
  49,
  'a freed consulta does not count'
);
select lives_ok(
  $$ select public.liberar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-30') $$,
  'freeing a dia without consultas does nothing'
);

select results_eq(
  $$ select * from public.confirmar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-17', '2026-10-01', 0.004) $$,
  $$ values (1, 0.004::numeric) $$,
  'confirming adds the costo to the gasto and returns the consultas of the dia, without counting the consulta again'
);
select results_eq(
  $$ select * from public.confirmar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-17', '2026-10-01', 0.006) $$,
  $$ values (1, 0.010::numeric) $$,
  'the gasto of the mes adds up'
);
select throws_ok(
  $$ select * from public.confirmar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-17', '2026-10-01', -1) $$,
  '22023', 'The costo of a consulta cannot be negative',
  'a negative costo is rejected'
);

-- The presupuesto of the mes is spent.
update public.chat_gastos set usd = 20 where mes = '2026-10-01';

select is(
  public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-17', '2026-10-01', 50, 20),
  'presupuesto_agotado',
  'no consulta is reserved once the presupuesto of the mes is spent'
);
select is(
  (select cantidad from public.chat_consultas
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000002' and dia = '2026-10-17'),
  1,
  'a reserva rejected by the presupuesto counts nothing'
);
select is(
  public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-11-02', '2026-11-01', 50, 20),
  'reservada',
  'the next mes the presupuesto starts again'
);
select throws_ok(
  $$ select public.reservar_consulta('bbbbbbbb-0000-4000-8000-000000000002', '2026-10-17', '2026-10-01', 0, 20) $$,
  '22023', 'A reserva needs a limite diario of at least 1 and a presupuesto',
  'a reserva needs a limite diario'
);

select * from finish();

rollback;
