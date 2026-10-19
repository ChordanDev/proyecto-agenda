-- Dar de baja and reactivar an iglesia or a distrito (issue #159).
--
-- Nothing of the structure is deleted from the app: the admin of the asociacion
-- gives an iglesia or a distrito de baja instead, and can reactivar it later.
--
--   1. An iglesia de baja leaves the buscador, the calendario and the gestion.
--      Its encargados and secretarias lose the cargo. Its eventos stay stored,
--      out of every calendario, and come back when it is reactivada; the cargos
--      do not.
--   2. A distrito is given de baja only without active iglesias: the admin moves
--      them to another distrito first. Its pastor loses the cargo; its eventos
--      de distrito stay stored and come back when it is reactivado; the cargo
--      does not.
--   3. An evento shared by an iglesia de baja also leaves the iglesias sumadas,
--      and comes back with its duenio.
--
-- The rows stay readable, with their mark: a phone whose iglesia elegida was
-- given de baja reads it and goes back to "Elegir iglesia", and the admin lists
-- what is de baja to reactivar it. Which eventos, dates and excepciones are
-- read is decided here, by the read policies, so the calendario, the detalle
-- and the chat (public.buscar_eventos, security invoker) all follow the same
-- rule. The recordatorios read with the service_role, which skips them, and
-- apply the same rule on their own (enviar-recordatorios/puertos.ts).
--
-- The iglesias seguidas of the recordatorios are kept in step by #217.

alter table public.distritos add column de_baja boolean not null default false;
alter table public.iglesias add column de_baja boolean not null default false;

-- Reading the eventos ------------------------------------------------------------
-- Same names as in 20261008031111_create_eventos.sql and
-- 20261022000000_create_excepciones.sql, dropped and created again with the
-- rule. A duenio de baja hides the evento for everyone, the admin included,
-- until it is reactivado, and its dates and excepciones with it.

drop policy "Anyone can read eventos" on public.eventos;

create policy "Anyone can read eventos"
  on public.eventos for select
  to anon, authenticated
  using (
    not exists (
      select 1
      from public.iglesias
      where iglesias.id = eventos.duenio_iglesia_id
        and iglesias.de_baja
    )
    and not exists (
      select 1
      from public.distritos
      where distritos.id = eventos.duenio_distrito_id
        and distritos.de_baja
    )
  );

-- A date or an excepcion is read when its evento is: the subquery applies the
-- policy above.
drop policy "Anyone can read eventos_fechas" on public.eventos_fechas;

create policy "Anyone can read eventos_fechas"
  on public.eventos_fechas for select
  to anon, authenticated
  using (exists (select 1 from public.eventos where eventos.id = eventos_fechas.evento_id));

drop policy "Anyone can read excepciones" on public.excepciones;

create policy "Anyone can read excepciones"
  on public.excepciones for select
  to anon, authenticated
  using (exists (select 1 from public.eventos where eventos.id = excepciones.evento_id));

-- An iglesia de baja is sumada to nothing while it is de baja. Hiding the row
-- (not deleting it) gives the evento back to it when it is reactivada, and a
-- save of the evento, which replaces the sumadas it reads, leaves it alone.
drop policy "Anyone can read iglesias_sumadas" on public.iglesias_sumadas;

create policy "Anyone can read iglesias_sumadas"
  on public.iglesias_sumadas for select
  to anon, authenticated
  using (
    not exists (
      select 1
      from public.iglesias
      where iglesias.id = iglesias_sumadas.iglesia_id
        and iglesias.de_baja
    )
  );

-- The rules of the structure ---------------------------------------------------------
-- Written as triggers, so they hold for every write, also the ones the
-- developers make by hand.

-- An active iglesia is always in an active distrito: no iglesia is created in,
-- moved to or reactivada in a distrito de baja.
--
-- The distrito is locked for share: public.dar_de_baja_distrito locks it for
-- update before it counts its iglesias, so one of the two waits for the other
-- and an iglesia cannot slip into a distrito that is being given de baja.
--
-- Security definer: locking a row needs the right to update it, which the rule
-- must not depend on.
create function public.check_iglesia_en_distrito_activo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.de_baja and (
    select distritos.de_baja
    from public.distritos
    where distritos.id = new.distrito_id
    for share
  ) then
    raise exception 'An active iglesia cannot be in a distrito de baja'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_iglesia_en_distrito_activo() from public, anon, authenticated;

create trigger iglesias_en_distrito_activo
  before insert or update of distrito_id, de_baja on public.iglesias
  for each row execute function public.check_iglesia_en_distrito_activo();

-- Nobody gets a cargo on an iglesia or a distrito de baja. Locked for share,
-- like the distrito above, so a cargo cannot land on an iglesia or a distrito
-- while it is being given de baja.
create function public.check_cargo_en_estructura_activa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.iglesias where iglesias.id = new.iglesia_id and iglesias.de_baja
    for share
  ) or exists (
    select 1 from public.distritos where distritos.id = new.distrito_id and distritos.de_baja
    for share
  ) then
    raise exception 'A cargo cannot be on an iglesia or a distrito de baja'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_cargo_en_estructura_activa() from public, anon, authenticated;

create trigger cargos_en_estructura_activa
  before insert or update of iglesia_id, distrito_id on public.cargos
  for each row execute function public.check_cargo_en_estructura_activa();

-- Dar de baja and reactivar ------------------------------------------------------------
-- Only the admin of the asociacion, through these functions: the column de_baja
-- has no privilege for the API roles, so it changes nowhere else.
--
-- Security definer: removing the cargos is not something the admin can do on
-- the table. Each one checks that the usuario of the session
-- (public.cargos_administran_asociacion reads auth.uid()) is admin of the
-- asociacion of the row before changing anything. A row that does not exist
-- is answered as one of another asociacion, so the answer reveals nothing.

create function public.dar_de_baja_iglesia(iglesia_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  asociacion_id uuid;
begin
  select distritos.asociacion_id into asociacion_id
  from public.iglesias
  join public.distritos on distritos.id = iglesias.distrito_id
  where iglesias.id = dar_de_baja_iglesia.iglesia_id
  for update of iglesias;

  if asociacion_id is null or not public.cargos_administran_asociacion(asociacion_id) then
    raise exception 'Only the admin of its asociacion gives an iglesia de baja'
      using errcode = '42501';
  end if;

  update public.iglesias set de_baja = true where iglesias.id = dar_de_baja_iglesia.iglesia_id;

  -- Its encargados and secretarias. Reactivar does not give them back.
  delete from public.cargos where cargos.iglesia_id = dar_de_baja_iglesia.iglesia_id;
end;
$$;

create function public.reactivar_iglesia(iglesia_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  asociacion_id uuid;
begin
  select distritos.asociacion_id into asociacion_id
  from public.iglesias
  join public.distritos on distritos.id = iglesias.distrito_id
  where iglesias.id = reactivar_iglesia.iglesia_id
  for update of iglesias;

  if asociacion_id is null or not public.cargos_administran_asociacion(asociacion_id) then
    raise exception 'Only the admin of its asociacion reactiva an iglesia'
      using errcode = '42501';
  end if;

  -- In a distrito de baja, public.check_iglesia_en_distrito_activo rejects it.
  update public.iglesias set de_baja = false where iglesias.id = reactivar_iglesia.iglesia_id;

  -- While it was de baja its rows of iglesias_sumadas were hidden, so a save
  -- that made one of them redundant (the evento moved to its distrito or to
  -- the asociacion) could not remove it, as public.guardar_evento does with
  -- the ones it sees. Removed now, with the same rule.
  delete from public.iglesias_sumadas
  where iglesias_sumadas.iglesia_id = reactivar_iglesia.iglesia_id
    and public.iglesia_ve_evento_por_alcance(iglesias_sumadas.evento_id, reactivar_iglesia.iglesia_id);
end;
$$;

create function public.dar_de_baja_distrito(distrito_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  asociacion_id uuid;
begin
  -- Locked for update before its iglesias are counted: see
  -- public.check_iglesia_en_distrito_activo.
  select distritos.asociacion_id into asociacion_id
  from public.distritos
  where distritos.id = dar_de_baja_distrito.distrito_id
  for update;

  if asociacion_id is null or not public.cargos_administran_asociacion(asociacion_id) then
    raise exception 'Only the admin of its asociacion gives a distrito de baja'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.iglesias
    where iglesias.distrito_id = dar_de_baja_distrito.distrito_id
      and not iglesias.de_baja
  ) then
    raise exception 'A distrito with active iglesias cannot be given de baja'
      using errcode = '23514';
  end if;

  update public.distritos set de_baja = true where distritos.id = dar_de_baja_distrito.distrito_id;

  -- Its pastor. Reactivar does not give the cargo back.
  delete from public.cargos where cargos.distrito_id = dar_de_baja_distrito.distrito_id;
end;
$$;

-- Its iglesias de baja stay de baja: each one is reactivada on its own.
create function public.reactivar_distrito(distrito_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  asociacion_id uuid;
begin
  select distritos.asociacion_id into asociacion_id
  from public.distritos
  where distritos.id = reactivar_distrito.distrito_id
  for update;

  if asociacion_id is null or not public.cargos_administran_asociacion(asociacion_id) then
    raise exception 'Only the admin of its asociacion reactiva a distrito'
      using errcode = '42501';
  end if;

  update public.distritos set de_baja = false where distritos.id = reactivar_distrito.distrito_id;
end;
$$;

-- A function is executable by everyone by default, and Supabase also grants it
-- to the API roles one by one. Only with a session.
revoke execute on function public.dar_de_baja_iglesia(uuid) from public, anon;
revoke execute on function public.reactivar_iglesia(uuid) from public, anon;
revoke execute on function public.dar_de_baja_distrito(uuid) from public, anon;
revoke execute on function public.reactivar_distrito(uuid) from public, anon;
grant execute on function public.dar_de_baja_iglesia(uuid) to authenticated;
grant execute on function public.reactivar_iglesia(uuid) to authenticated;
grant execute on function public.dar_de_baja_distrito(uuid) to authenticated;
grant execute on function public.reactivar_distrito(uuid) to authenticated;
