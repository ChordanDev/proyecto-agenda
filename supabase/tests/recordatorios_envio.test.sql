-- Tests of the daily sending of recordatorios (issue #163) on the database
-- side: the hourly schedule, the function it calls, which only the schedule
-- may run, and the reading of the phones, which only the server does.
--
-- The sending itself (the domain, the reading through the API and Expo Push)
-- is tested by supabase/functions/enviar-recordatorios/envio_test.ts.
--
-- Run with: npm run db:test

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

-- The schedule -------------------------------------------------------------------

select is(
  (select schedule from cron.job where jobname = 'enviar-recordatorios'),
  '0 * * * *',
  'The schedule calls the sending every hour, at minute 0'
);

select is(
  (select command from cron.job where jobname = 'enviar-recordatorios'),
  'select public.disparar_recordatorios()',
  'The schedule runs disparar_recordatorios'
);

-- Who may call it -------------------------------------------------------------------

set local role anon;
select throws_ok(
  'select public.disparar_recordatorios()',
  '42501',
  null,
  'Without a session nobody calls the sending'
);
reset role;

set local role authenticated;
select throws_ok(
  'select public.disparar_recordatorios()',
  '42501',
  null,
  'A usuario does not call the sending'
);
reset role;

set local role service_role;
select throws_ok(
  'select public.disparar_recordatorios()',
  '42501',
  null,
  'Not even service_role calls it: only the schedule'
);
reset role;

-- What it sends ------------------------------------------------------------------------

-- Without the secrets in Vault it sends nothing.
delete from vault.secrets where name in ('project_url', 'service_role_key');
create temporary table pedidos_antes as select coalesce(max(id), 0) as id from net.http_request_queue;

select lives_ok(
  'select public.disparar_recordatorios()',
  'Without the secrets in Vault the schedule does not fail'
);

select is(
  (select count(*)::int from net.http_request_queue where id > (select id from pedidos_antes)),
  0,
  'Without the secrets in Vault nothing is sent'
);

select vault.create_secret('https://proyecto.supabase.co/', 'project_url');
select vault.create_secret('clave-de-la-prueba', 'service_role_key');
select public.disparar_recordatorios();

select is(
  (select url from net.http_request_queue where id > (select id from pedidos_antes)),
  'https://proyecto.supabase.co/functions/v1/enviar-recordatorios',
  'With the secrets it calls enviar-recordatorios of the project'
);

select is(
  (select headers ->> 'Authorization' from net.http_request_queue where id > (select id from pedidos_antes)),
  'Bearer clave-de-la-prueba',
  'The call carries the service_role key from Vault'
);

-- The phones it reads ------------------------------------------------------------------

insert into public.asociaciones (id, nombre) values
  ('aaaaaaaa-0000-4000-8000-000000000163', 'Asociación de la prueba');
insert into public.distritos (id, asociacion_id, nombre) values
  ('dddddddd-0000-4000-8000-000000000163', 'aaaaaaaa-0000-4000-8000-000000000163', 'Distrito');
insert into public.iglesias (id, distrito_id, nombre, direccion, ciudad, provincia) values
  ('11111111-0000-4000-8000-000000000163', 'dddddddd-0000-4000-8000-000000000163', 'Iglesia central', 'Calle 1', 'Ciudad', 'Provincia'),
  ('22222222-0000-4000-8000-000000000163', 'dddddddd-0000-4000-8000-000000000163', 'Iglesia norte', 'Calle 2', 'Ciudad', 'Provincia');

-- Two phones that follow different iglesias, and one turned off.
insert into public.dispositivos (id, token, encendido) values
  ('99999999-0000-4000-8000-000000000001', 'ExponentPushToken[central]', true),
  ('99999999-0000-4000-8000-000000000002', 'ExponentPushToken[norte]', true),
  ('99999999-0000-4000-8000-000000000003', 'ExponentPushToken[apagado]', false);
insert into public.dispositivos_iglesias (dispositivo_id, iglesia_id) values
  ('99999999-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000163'),
  ('99999999-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000163'),
  ('99999999-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000163');

set local role service_role;
select results_eq(
  $$
    select d.token, di.iglesia_id
    from public.dispositivos as d
    join public.dispositivos_iglesias as di on di.dispositivo_id = d.id
    join public.iglesias as i on i.id = di.iglesia_id
    where d.encendido and i.distrito_id = 'dddddddd-0000-4000-8000-000000000163'
    order by d.token
  $$,
  $$ values
    ('ExponentPushToken[central]', '11111111-0000-4000-8000-000000000163'::uuid),
    ('ExponentPushToken[norte]', '22222222-0000-4000-8000-000000000163'::uuid)
  $$,
  'The server reads the phones turned on with the iglesias each one follows'
);

select lives_ok(
  $$ update public.dispositivos set encendido = false where token = 'ExponentPushToken[norte]' $$,
  'The server turns off a phone whose token is no longer valid'
);
reset role;

set local role anon;
select throws_ok(
  'select token from public.dispositivos',
  '42501',
  null,
  'Without a session the phones are not read'
);
reset role;

select * from finish();

rollback;
