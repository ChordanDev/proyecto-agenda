-- The schedule of the daily recordatorios (issue #163).
--
-- pg_cron runs in UTC and each asociacion has its own zona horaria, so the
-- schedule calls the server function enviar-recordatorios every hour, at
-- minute 0, and the function sends only for the asociaciones that are at
-- their 20 h (src/features/recordatorios/dominio/envio.ts). Summer time and a
-- new zona horaria need no change here.
--
-- The call goes through pg_net with the URL of the project and the
-- service_role key, which are not versioned: each project keeps them in Vault,
-- under the names `project_url` and `service_role_key`. Without them the
-- schedule does nothing and leaves a warning in the log of the database.
--
-- `service_role_key` must be exactly the value the function sees as
-- SUPABASE_SERVICE_ROLE_KEY: the legacy service_role key, a JWT that starts
-- with `eyJ` (Project Settings, API Keys, Legacy API keys). A new secret key
-- (`sb_secret_...`) gets a 401, and since pg_net does not wait for the answer
-- it only shows in net._http_response.
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<legacy service_role JWT, eyJ...>', 'service_role_key');

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Calls enviar-recordatorios once. pg_net sends the request after the
-- transaction commits and does not wait for the answer: the function logs its
-- own result.
--
-- Security definer: as the owner it reads Vault, which no API role reaches.
create function public.disparar_recordatorios()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  url text;
  clave text;
begin
  select decrypted_secret into url
  from vault.decrypted_secrets
  where name = 'project_url';

  select decrypted_secret into clave
  from vault.decrypted_secrets
  where name = 'service_role_key';

  if url is null or clave is null then
    raise warning 'The recordatorios are not sent: Vault has no project_url or service_role_key';
    return;
  end if;

  perform net.http_post(
    url := rtrim(url, '/') || '/functions/v1/enviar-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || clave
    ),
    body := '{}'::jsonb,
    -- The function reads every phone and every evento of tomorrow.
    timeout_milliseconds := 60000
  );
end;
$$;

-- Only the schedule (which runs as postgres, the owner) calls it.
revoke execute on function public.disparar_recordatorios() from public, anon, authenticated, service_role;

select cron.schedule(
  'enviar-recordatorios',
  '0 * * * *',
  'select public.disparar_recordatorios()'
);
