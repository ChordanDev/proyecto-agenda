-- Permission tests for the reportes of the chat (issue #147): a usuario saves
-- only their own reportes, nobody reads them from the app, and the hermano
-- reaches none of it. They are read from the dashboard of Supabase.
--
-- The way permission tests are written is explained at the top of
-- estructura_permisos.test.sql, and how a test acts as a usuario at the top of
-- cargos_permisos.test.sql.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(20);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'reporta@prueba.example.com'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'otro@prueba.example.com');

-- The table itself ---------------------------------------------------------------

select columns_are('public', 'chat_reportes', array['id', 'usuario_id', 'motivo', 'reportado_en'],
  'a reporte keeps who, when and the motivo, never a word of the conversation');
select policies_are('public', 'chat_reportes', array[
  'Usuarios can save their own reportes'
]);
select ok(
  has_column_privilege('authenticated', 'public.chat_reportes', 'id', 'INSERT')
    and has_column_privilege('authenticated', 'public.chat_reportes', 'usuario_id', 'INSERT')
    and has_column_privilege('authenticated', 'public.chat_reportes', 'motivo', 'INSERT')
    and not has_column_privilege('authenticated', 'public.chat_reportes', 'reportado_en', 'INSERT'),
  'a usuario saves who and why, never when'
);

-- Without a session (anon): the hermano ---------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.chat_reportes $$,
  '42501', 'permission denied for table chat_reportes', 'anon cannot read reportes'
);
select throws_ok(
  $$ insert into public.chat_reportes (usuario_id, motivo)
     values ('bbbbbbbb-0000-4000-8000-000000000001', 'incorrecta') $$,
  '42501', 'permission denied for table chat_reportes', 'anon cannot save a reporte'
);

reset role;

-- A usuario ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.chat_reportes (id, usuario_id, motivo)
     values ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'incorrecta') $$,
  'a usuario saves their own reporte'
);
select lives_ok(
  $$ insert into public.chat_reportes (usuario_id, motivo)
     values ('bbbbbbbb-0000-4000-8000-000000000001', 'ofensiva') $$,
  'a usuario saves a reporte of an offensive respuesta'
);
select lives_ok(
  $$ insert into public.chat_reportes (usuario_id, motivo)
     values ('bbbbbbbb-0000-4000-8000-000000000001', 'otro') $$,
  'a usuario saves a reporte for another motivo'
);
select throws_ok(
  $$ insert into public.chat_reportes (id, usuario_id, motivo)
     values ('cccccccc-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000001', 'otro') $$,
  '23505', null,
  'a reporte sent again with its id is not saved twice'
);
select throws_ok(
  $$ insert into public.chat_reportes (usuario_id, motivo)
     values ('bbbbbbbb-0000-4000-8000-000000000002', 'incorrecta') $$,
  '42501', 'new row violates row-level security policy for table "chat_reportes"',
  'a usuario cannot save a reporte in the name of another'
);
select throws_ok(
  $$ insert into public.chat_reportes (usuario_id, motivo)
     values ('bbbbbbbb-0000-4000-8000-000000000001', 'aburrida') $$,
  '23514', null,
  'a motivo other than incorrecta, ofensiva or otro is rejected'
);
select throws_ok(
  $$ insert into public.chat_reportes (usuario_id, motivo, reportado_en)
     values ('bbbbbbbb-0000-4000-8000-000000000001', 'otro', '2020-01-01') $$,
  '42501', 'permission denied for table chat_reportes',
  'a usuario cannot choose when they reported'
);
select throws_ok(
  $$ select * from public.chat_reportes $$,
  '42501', 'permission denied for table chat_reportes', 'a usuario cannot read reportes, not even their own'
);
select throws_ok(
  $$ update public.chat_reportes set motivo = 'otro' $$,
  '42501', 'permission denied for table chat_reportes', 'a usuario cannot change a reporte'
);
select throws_ok(
  $$ delete from public.chat_reportes $$,
  '42501', 'permission denied for table chat_reportes', 'a usuario cannot delete a reporte'
);

reset role;

-- What was saved ------------------------------------------------------------------------

select is(
  (select count(*)::integer from public.chat_reportes
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  3,
  'the reportes of the usuario were saved once each'
);
select is(
  (select count(*)::integer from public.chat_reportes
   where usuario_id = 'bbbbbbbb-0000-4000-8000-000000000002'),
  0,
  'no reporte was saved in the name of another'
);
select is(
  (select array_agg(motivo order by motivo) from public.chat_reportes),
  array['incorrecta', 'ofensiva', 'otro'],
  'each reporte keeps its motivo'
);
select ok(
  (select bool_and(reportado_en is not null and reportado_en <= now()) from public.chat_reportes),
  'the moment of a reporte is the one of the database'
);

-- A reporte goes with the usuario when they delete their account.
delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000001';
select is(
  (select count(*)::integer from public.chat_reportes),
  0,
  'the reportes of a usuario go with their account'
);

select * from finish();
rollback;
