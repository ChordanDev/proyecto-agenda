-- Permission tests for the Expo tickets kept until their receipt is read
-- (public.recibos_pendientes, issue #211). The table is closed to the API
-- roles: neither anon nor a usuario reads, writes or truncates it. The server
-- function writes it with the service_role. A ticket belongs to a phone that
-- exists, and deleting the phone deletes its tickets.
--
-- Acting as a usuario works as in cargos_permisos.test.sql: the `authenticated`
-- role and the claims of the session.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- Fixtures ---------------------------------------------------------------------

insert into auth.users (id, aud, role, email) values
  ('bbbbbbbb-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'encargado@prueba.example.com');

insert into public.dispositivos (token, encendido) values
  ('ExponentPushToken[recibos-a]', true),
  ('ExponentPushToken[recibos-b]', true);

-- The privileges ---------------------------------------------------------------------

select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('anon', 'public.recibos_pendientes', p)
  ), array[]::text[]),
  array[]::text[],
  'anon has no privilege on recibos_pendientes'
);
select is(
  coalesce((
    select array_agg(p order by p)
    from unnest(array['DELETE','INSERT','MAINTAIN','REFERENCES','SELECT','TRIGGER','TRUNCATE','UPDATE']) as p
    where has_table_privilege('authenticated', 'public.recibos_pendientes', p)
  ), array[]::text[]),
  array[]::text[],
  'authenticated has no privilege on recibos_pendientes'
);
select ok(
  has_table_privilege('service_role', 'public.recibos_pendientes', 'INSERT')
    and has_table_privilege('service_role', 'public.recibos_pendientes', 'SELECT')
    and has_table_privilege('service_role', 'public.recibos_pendientes', 'DELETE'),
  'the server function writes, reads and deletes the tickets'
);

-- The server keeps a ticket -----------------------------------------------------------

set local role service_role;

select lives_ok(
  $$ insert into public.recibos_pendientes (ticket, token) values ('ticket-a', 'ExponentPushToken[recibos-a]') $$,
  'the server keeps the ticket of a phone'
);
select throws_ok(
  $$ insert into public.recibos_pendientes (ticket, token) values ('ticket-x', 'ExponentPushToken[no-existe]') $$,
  '23503', null,
  'a ticket of a token that is no phone is rejected'
);

reset role;

insert into public.recibos_pendientes (ticket, token) values
  ('ticket-b', 'ExponentPushToken[recibos-b]');

-- Without a session (anon) ------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.recibos_pendientes $$,
  '42501', 'permission denied for table recibos_pendientes',
  'anon cannot read the tickets'
);
select throws_ok(
  $$ insert into public.recibos_pendientes (ticket, token) values ('ticket-c', 'ExponentPushToken[recibos-a]') $$,
  '42501', 'permission denied for table recibos_pendientes',
  'anon cannot keep a ticket'
);

reset role;

-- A usuario ------------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims to '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';

select throws_ok(
  $$ select * from public.recibos_pendientes $$,
  '42501', 'permission denied for table recibos_pendientes',
  'a usuario cannot read the tickets'
);
select throws_ok(
  $$ delete from public.recibos_pendientes $$,
  '42501', 'permission denied for table recibos_pendientes',
  'a usuario cannot delete the tickets'
);
select throws_ok(
  $$ truncate public.recibos_pendientes $$,
  '42501', 'permission denied for table recibos_pendientes',
  'a usuario cannot truncate the tickets'
);

reset role;

-- Deleting a phone ------------------------------------------------------------------------

delete from public.dispositivos where token = 'ExponentPushToken[recibos-a]';

select results_eq(
  $$ select ticket from public.recibos_pendientes where ticket in ('ticket-a', 'ticket-b') order by ticket $$,
  $$ values ('ticket-b') $$,
  'deleting a phone deletes its tickets, and only its tickets'
);

-- Turning a phone off keeps its tickets until their receipt is read.
update public.dispositivos set encendido = false where token = 'ExponentPushToken[recibos-b]';

select results_eq(
  $$ select ticket from public.recibos_pendientes where ticket = 'ticket-b' $$,
  $$ values ('ticket-b') $$,
  'turning a phone off keeps its tickets'
);

select * from finish();

rollback;
