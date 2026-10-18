-- Sumar and quitar iglesias of an evento (issue #168). Until now the iglesias
-- sumadas were read-only: the calendario reads them, nothing wrote them.
--
-- The rules:
-- - Sumar an iglesia, or stop sumando it, is an edit of the evento: it needs a
--   cargo that covers the duenio of the evento, and it is done by saving the
--   evento with its list (guardar_evento).
-- - Quitar the evento from the calendario of an iglesia sumada needs a cargo
--   that covers that iglesia: its encargado, the pastor of its distrito or the
--   admin (quitar_evento_de_iglesia). The iglesia sumada never edits the evento.
-- - An iglesia that already sees the evento by its alcance is not sumada: the
--   duenia of an evento of iglesia, or one of the distrito duenio of an evento
--   of distrito. An evento of asociacion is not shared.
-- - Once quitada, only someone who covers the duenio sums it again.
--
-- Sharing applies to the whole series: the rows are per evento, not per date.

-- An iglesia sumada sees the evento only through its row ------------------------

-- Whether an iglesia already sees an evento by its alcance, without being sumada.
create function public.iglesia_ve_evento_por_alcance(evento_id uuid, iglesia_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.eventos
    join public.iglesias on iglesias.id = iglesia_ve_evento_por_alcance.iglesia_id
    join public.distritos on distritos.id = iglesias.distrito_id
    where eventos.id = iglesia_ve_evento_por_alcance.evento_id
      and (
        eventos.duenio_iglesia_id = iglesias.id
        or eventos.duenio_distrito_id = iglesias.distrito_id
        or eventos.duenio_asociacion_id = distritos.asociacion_id
      )
  );
$$;

revoke execute on function public.iglesia_ve_evento_por_alcance(uuid, uuid) from public, anon;
grant execute on function public.iglesia_ve_evento_por_alcance(uuid, uuid) to authenticated;

-- A trigger and not a policy: it holds for every role, the superuser that loads
-- data included, and it says why the row is rejected.
create function public.check_iglesia_sumada()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.eventos
    where eventos.id = new.evento_id and eventos.alcance = 'asociacion'
  ) then
    raise exception 'An evento of asociacion is not shared with iglesias'
      using errcode = '23514';
  end if;

  if public.iglesia_ve_evento_por_alcance(new.evento_id, new.iglesia_id) then
    raise exception 'The iglesia % already sees the evento % by its alcance',
      new.iglesia_id, new.evento_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger iglesias_sumadas_outside_alcance
  before insert or update on public.iglesias_sumadas
  for each row
  execute function public.check_iglesia_sumada();

-- Write permissions of iglesias_sumadas ---------------------------------------------
-- Inserting and deleting only: a row is never changed into another one.

grant insert, delete on public.iglesias_sumadas to authenticated;

create policy "Usuarios can sumar iglesias to eventos their cargos cover"
  on public.iglesias_sumadas for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.eventos
      where eventos.id = iglesias_sumadas.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );

-- Whoever covers the duenio stops sumando an iglesia; whoever covers the
-- iglesia sumada quita the evento from its calendario.
create policy "Usuarios can delete iglesias_sumadas their cargos cover"
  on public.iglesias_sumadas for delete
  to authenticated
  using (
    public.cargos_abarcan_duenio(iglesia_id, null, null)
    or exists (
      select 1
      from public.eventos
      where eventos.id = iglesias_sumadas.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );

-- Quitar an evento from the calendario of an iglesia sumada -------------------------

-- Deletes the row of the iglesia sumada; the evento stays for its duenio and
-- the other iglesias. An evento the iglesia no longer has (quitado before, or
-- deleted) is already what was asked for: a quitar sent again does not fail.
-- A row the cargos do not cover is hidden from the delete: that is an error.
create function public.quitar_evento_de_iglesia(evento_id uuid, iglesia_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  delete from public.iglesias_sumadas
  where iglesias_sumadas.evento_id = quitar_evento_de_iglesia.evento_id
    and iglesias_sumadas.iglesia_id = quitar_evento_de_iglesia.iglesia_id
  returning iglesias_sumadas.evento_id into deleted_id;

  -- Reading iglesias_sumadas is public, so telling the two cases apart reveals
  -- nothing the usuario could not read.
  if deleted_id is null and exists (
    select 1
    from public.iglesias_sumadas
    where iglesias_sumadas.evento_id = quitar_evento_de_iglesia.evento_id
      and iglesias_sumadas.iglesia_id = quitar_evento_de_iglesia.iglesia_id
  ) then
    raise exception 'The cargos of the usuario do not cover the iglesia %',
      quitar_evento_de_iglesia.iglesia_id
      using errcode = '42501';
  end if;
end;
$$;

revoke execute on function public.quitar_evento_de_iglesia(uuid, uuid) from public, anon;
grant execute on function public.quitar_evento_de_iglesia(uuid, uuid) to authenticated;

-- guardar_evento takes the list of iglesias sumadas ----------------------------------
-- Dropped and created again because a new argument would otherwise add a
-- second function beside it. The body is the one of 20261015180000 plus the
-- list.

drop function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid, uuid
);

-- Creates an evento when `evento_id` is null, or replaces every column and
-- every date of an existing one. Returns the id of the evento saved.
--
-- `fechas` are all the dates of the evento: one for a single date or for an
-- evento of several days (its first day), one per occurrence for a series.
-- They replace the dates it had, past ones included.
--
-- `nuevo_evento_id` is the id of an evento to create, chosen by the app; it is
-- ignored when `evento_id` is given. A create sent again finds its id taken and
-- goes on as an edit of it.
--
-- `lugar_id` is a lugar of the list of the duenio; `lugar` is the written lugar
-- an old evento keeps. At most one of them is given.
--
-- `iglesias_sumadas` replaces the iglesias the evento is shared with. Unlike
-- the other columns, leaving it out (null) keeps the ones it has: an app that
-- does not know the list, or a form that did not touch it, must not undo what
-- the duenio shared or what an iglesia quito. Either way, an iglesia that now
-- sees the evento by its alcance stops being sumada.
--
-- The columns that can be empty go last and default to null, so the API can
-- leave them out. Leaving one out when editing empties it: every column but
-- the iglesias sumadas is replaced.
create function public.guardar_evento(
  titulo text,
  alcance public.alcance,
  hora time,
  repeticion public.repeticion,
  fechas date[],
  evento_id uuid default null,
  lugar text default null,
  descripcion text default null,
  enfasis public.enfasis default null,
  duenio_iglesia_id uuid default null,
  duenio_distrito_id uuid default null,
  duenio_asociacion_id uuid default null,
  fecha_fin date default null,
  fin_de_serie date default null,
  nuevo_evento_id uuid default null,
  lugar_id uuid default null,
  iglesias_sumadas uuid[] default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  -- An evento without dates is the very thing this function prevents.
  if coalesce(cardinality(guardar_evento.fechas), 0) = 0 then
    raise exception 'An evento needs at least one fecha' using errcode = '22023';
  end if;

  if guardar_evento.evento_id is null then
    insert into public.eventos (
      id, titulo, lugar, lugar_id, descripcion, enfasis, alcance,
      duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
      hora, fecha_fin, repeticion, fin_de_serie
    )
    values (
      coalesce(guardar_evento.nuevo_evento_id, gen_random_uuid()),
      guardar_evento.titulo, guardar_evento.lugar, guardar_evento.lugar_id,
      guardar_evento.descripcion, guardar_evento.enfasis, guardar_evento.alcance,
      guardar_evento.duenio_iglesia_id, guardar_evento.duenio_distrito_id,
      guardar_evento.duenio_asociacion_id,
      guardar_evento.hora, guardar_evento.fecha_fin, guardar_evento.repeticion,
      guardar_evento.fin_de_serie
    )
    on conflict (id) do nothing
    returning eventos.id into saved_id;
  end if;

  if saved_id is null then
    update public.eventos
    set
      titulo = guardar_evento.titulo,
      lugar = guardar_evento.lugar,
      lugar_id = guardar_evento.lugar_id,
      descripcion = guardar_evento.descripcion,
      enfasis = guardar_evento.enfasis,
      alcance = guardar_evento.alcance,
      duenio_iglesia_id = guardar_evento.duenio_iglesia_id,
      duenio_distrito_id = guardar_evento.duenio_distrito_id,
      duenio_asociacion_id = guardar_evento.duenio_asociacion_id,
      hora = guardar_evento.hora,
      fecha_fin = guardar_evento.fecha_fin,
      repeticion = guardar_evento.repeticion,
      fin_de_serie = guardar_evento.fin_de_serie
    where eventos.id = coalesce(guardar_evento.evento_id, guardar_evento.nuevo_evento_id)
    returning eventos.id into saved_id;

    -- The policy hides the eventos the cargos do not cover: updating one
    -- changes no row instead of failing. Saying so beats reporting a success.
    if saved_id is null then
      raise exception 'There is no evento % the usuario can edit',
        coalesce(guardar_evento.evento_id, guardar_evento.nuevo_evento_id)
        using errcode = 'P0002';
    end if;

    delete from public.eventos_fechas
    where eventos_fechas.evento_id = saved_id;
  end if;

  insert into public.eventos_fechas (evento_id, fecha)
  select saved_id, fecha
  from unnest(guardar_evento.fechas) as fecha;

  if guardar_evento.iglesias_sumadas is null then
    -- The list is kept, but a new duenio may already reach some of them.
    delete from public.iglesias_sumadas
    where iglesias_sumadas.evento_id = saved_id
      and (
        guardar_evento.alcance = 'asociacion'
        or public.iglesia_ve_evento_por_alcance(saved_id, iglesias_sumadas.iglesia_id)
      );
  else
    -- Replaced as a whole, so the trigger checks every iglesia of the list
    -- against the evento as it is now.
    delete from public.iglesias_sumadas
    where iglesias_sumadas.evento_id = saved_id;

    insert into public.iglesias_sumadas (evento_id, iglesia_id)
    select distinct saved_id, iglesia_id
    from unnest(guardar_evento.iglesias_sumadas) as iglesia_id;
  end if;

  return saved_id;
end;
$$;

-- A function is executable by everyone by default, and Supabase also grants it
-- to the API roles one by one. Writing needs a session.
revoke execute on function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid, uuid, uuid[]
) from public, anon;
grant execute on function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid, uuid, uuid[]
) to authenticated;
