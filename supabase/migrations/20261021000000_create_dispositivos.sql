-- The phones that receive recordatorios (issue #162).
--
-- A recordatorio is tied to the phone, not to the person, like the iglesia
-- elegida. Each phone is known by its Expo push token, which works as its
-- secret: a phone registers and changes its own row through the functions below
-- by giving its token, with or without a session, and nothing reads or changes
-- the row of another token. The tables themselves are closed to the API roles;
-- the daily sending (#163) reads them from the server.
--
--   1. public.dispositivos: the token, the switch and the usuario of the session
--      that last saved it, if any.
--   2. public.dispositivos_iglesias: the iglesias each phone follows.
--   3. public.guardar_dispositivo() and public.get_dispositivo().

create table public.dispositivos (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  encendido boolean not null,
  -- Whoever saved it last with a session; null when it was saved without one.
  -- Deleting the usuario ("Eliminar mi cuenta") deletes it: the app saves the
  -- phone again with the initial values of a hermano, as on signing out.
  usuario_id uuid references auth.users (id) on delete cascade,
  actualizado_at timestamptz not null default now()
);

create index dispositivos_usuario_id_idx on public.dispositivos (usuario_id);

create table public.dispositivos_iglesias (
  dispositivo_id uuid not null references public.dispositivos (id) on delete cascade,
  iglesia_id uuid not null references public.iglesias (id) on delete cascade,
  primary key (dispositivo_id, iglesia_id)
);

-- The sending looks for the phones that follow an iglesia.
create index dispositivos_iglesias_iglesia_id_idx on public.dispositivos_iglesias (iglesia_id);

alter table public.dispositivos enable row level security;
alter table public.dispositivos_iglesias enable row level security;

-- No policy and no privilege: the API roles only reach these tables through the
-- functions below.
revoke all on public.dispositivos, public.dispositivos_iglesias from anon, authenticated;

-- Saving a phone ----------------------------------------------------------------------
-- Registers the phone of `token`, or replaces its switch and its iglesias.
--
-- Which iglesias it may follow depends on the session, never on an argument:
--
--   - without a session, or with a usuario without cargos (a hermano): at most
--     one, any of them, which is their iglesia elegida;
--   - with cargos (encargado, secretaria, pastor, admin): only iglesias their
--     cargos cover, the same rule as writing an evento of that iglesia.
--
-- Security definer: as the owner it writes the closed tables. It only touches
-- the row of the token it is given.
create function public.guardar_dispositivo(token text, encendido boolean, iglesia_ids uuid[])
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  usuario uuid := (select auth.uid());
  ids uuid[];
  guardado_id uuid;
begin
  -- The token Expo gives: ExponentPushToken[...] (or ExpoPushToken[...]).
  if token is null or length(token) > 200 or token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    raise exception 'The token is not an Expo push token' using errcode = '22023';
  end if;

  if encendido is null or iglesia_ids is null or array_position(iglesia_ids, null) is not null then
    raise exception 'The switch and the iglesias are required' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct i), array[]::uuid[]) into ids from unnest(iglesia_ids) as i;

  if usuario is null or not exists (select 1 from public.cargos where cargos.usuario_id = usuario) then
    if cardinality(ids) > 1 then
      raise exception 'Without cargos a phone follows only its iglesia elegida' using errcode = '42501';
    end if;
  elsif exists (
    select 1 from unnest(ids) as i where not public.cargos_abarcan_duenio(i, null, null)
  ) then
    raise exception 'The cargos do not cover every iglesia' using errcode = '42501';
  end if;

  insert into public.dispositivos as d (token, encendido, usuario_id, actualizado_at)
  values (guardar_dispositivo.token, guardar_dispositivo.encendido, usuario, now())
  on conflict on constraint dispositivos_token_key do update
    set encendido = excluded.encendido,
        usuario_id = excluded.usuario_id,
        actualizado_at = excluded.actualizado_at
  returning d.id into guardado_id;

  delete from public.dispositivos_iglesias where dispositivo_id = guardado_id;
  insert into public.dispositivos_iglesias (dispositivo_id, iglesia_id)
  select guardado_id, i from unnest(ids) as i;
end;
$$;

revoke execute on function public.guardar_dispositivo(text, boolean, uuid[]) from public;
grant execute on function public.guardar_dispositivo(text, boolean, uuid[]) to anon, authenticated;

-- Reading a phone ------------------------------------------------------------------------
-- What the phone of `token` has saved, or no row when it was never saved.
-- `con_usuario` says whether it was saved with a session, and `del_usuario`
-- whether by the usuario of this session: the app starts again from the
-- initial values when whoever uses the phone changed. The usuario id itself is
-- never returned.
create function public.get_dispositivo(token text)
returns table (encendido boolean, iglesia_ids uuid[], con_usuario boolean, del_usuario boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.encendido,
    coalesce(
      (select array_agg(di.iglesia_id order by di.iglesia_id)
       from public.dispositivos_iglesias as di
       where di.dispositivo_id = d.id),
      array[]::uuid[]
    ),
    d.usuario_id is not null,
    coalesce(d.usuario_id = (select auth.uid()), false)
  from public.dispositivos as d
  where d.token = get_dispositivo.token;
$$;

revoke execute on function public.get_dispositivo(text) from public;
grant execute on function public.get_dispositivo(text) to anon, authenticated;
