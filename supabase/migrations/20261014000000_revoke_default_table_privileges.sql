-- Take the default table privileges away from the API roles.
--
-- Supabase gives every privilege (select, insert, update, delete, truncate,
-- references, trigger, and maintain since Postgres 17) on each new table to
-- anon and authenticated. Until now only row level security stood between the
-- API and a bad write, and it does not apply to truncate. This gives each role
-- on each table only what the app needs, so a policy written wrong is not the
-- only barrier.
--
-- Already merged migrations are not edited: cargos already did this for
-- itself, and this migration does it for the other six tables.

revoke all on
  public.asociaciones,
  public.distritos,
  public.iglesias,
  public.eventos,
  public.eventos_fechas,
  public.iglesias_sumadas
from anon, authenticated;

-- Reading is public, with or without a session.
grant select on
  public.asociaciones,
  public.distritos,
  public.iglesias,
  public.eventos,
  public.eventos_fechas,
  public.iglesias_sumadas
to anon, authenticated;

-- Writing is only for a session, and the policies still decide which rows.
-- iglesias_sumadas has no write privilege: it stays read-only for the API.
grant insert, update, delete on
  public.eventos,
  public.eventos_fechas
to authenticated;

-- A new table starts with nothing for anon and authenticated. Its migration
-- grants explicitly what it needs, as cargos does. service_role keeps its
-- defaults. Migrations run as postgres, which creates the tables, so these are
-- its defaults. The ones of supabase_admin cannot be changed from a migration.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
