-- Excepciones: a change to, or the deletion of, a single date of a series.
--
-- A series keeps one row per date in eventos_fechas. An excepcion is anchored
-- on the original date of the series and keeps only what changed: the titulo,
-- the hora, the lugar, the descripcion, the enfasis or the day the date moved
-- to. What it does not change is read from the series, so a date that changed
-- its hora takes a new titulo of the series and keeps its own hora.
--
-- A deleted date (`borrada`) also loses its row in eventos_fechas: every read
-- that ignores the excepciones still leaves it out. Its excepcion stays so that
-- regenerating the series does not create the date again.
--
-- A date never changes the duenio, the alcance, the repeticion, "Hasta", the
-- iglesias sumadas, nor becomes an evento of several days: those belong to the
-- whole series.

create table public.excepciones (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  -- The original date of the series, which the excepcion is anchored on.
  fecha date not null,
  -- The day the date moved to; null when it stays on its own day.
  fecha_nueva date,
  -- Null means the date keeps the one of the series. Neither can be emptied.
  titulo text,
  hora time,
  -- The lugar, the descripcion and the enfasis can be emptied (null is the
  -- actividad regular, for the enfasis), so a flag says whether they change.
  cambia_lugar boolean not null default false,
  lugar text,
  lugar_id uuid references public.lugares (id),
  cambia_descripcion boolean not null default false,
  descripcion text,
  cambia_enfasis boolean not null default false,
  enfasis public.enfasis,
  borrada boolean not null default false,

  primary key (evento_id, fecha),

  constraint excepciones_titulo_not_blank check (titulo is null or btrim(titulo) <> ''),
  constraint excepciones_lugar_or_lugar_id check (lugar is null or lugar_id is null),
  constraint excepciones_lugar_only_when_it_changes check (
    cambia_lugar or (lugar is null and lugar_id is null)
  ),
  constraint excepciones_descripcion_only_when_it_changes check (
    cambia_descripcion or descripcion is null
  ),
  constraint excepciones_enfasis_only_when_it_changes check (cambia_enfasis or enfasis is null),
  -- Moving a date to its own day is not moving it.
  constraint excepciones_fecha_nueva_is_another_day check (fecha_nueva <> fecha),
  -- A deleted date has nothing left to change; any other excepcion changes
  -- something, or it would just be the date of the series.
  constraint excepciones_borrada_or_changes check (
    case
      when borrada then
        fecha_nueva is null and titulo is null and hora is null
        and not cambia_lugar and not cambia_descripcion and not cambia_enfasis
      else
        fecha_nueva is not null or titulo is not null or hora is not null
        or cambia_lugar or cambia_descripcion or cambia_enfasis
    end
  )
);

-- The read of a month also looks for the dates that moved into it. Partial,
-- because few excepciones move their date.
create index excepciones_fecha_nueva_idx on public.excepciones (fecha_nueva)
  where fecha_nueva is not null;
create index excepciones_lugar_id_idx on public.excepciones (lugar_id);

-- What a foreign key cannot say: the excepcion belongs to a date of a series,
-- the date moves to a day that is not another date of the same series, and the
-- lugar is one of the duenio. A trigger and not a policy, so it holds for every
-- role. Every table it reads is public.
create function public.check_excepcion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  evento public.eventos;
begin
  select * into evento
  from public.eventos
  where eventos.id = new.evento_id;

  if evento.repeticion = 'ninguna' then
    raise exception 'The evento % does not repeat: it has no excepciones', new.evento_id
      using errcode = '23514';
  end if;

  -- A deleted date already lost its row in eventos_fechas.
  if not new.borrada and not exists (
    select 1
    from public.eventos_fechas
    where eventos_fechas.evento_id = new.evento_id
      and eventos_fechas.fecha = new.fecha
  ) then
    raise exception 'The fecha % is not a date of the evento %', new.fecha, new.evento_id
      using errcode = '23514';
  end if;

  -- The dates of the series are its own days, but for the ones that moved
  -- away, plus the days the others moved to. Only a new day is checked: an
  -- update of another field (as guardar_evento resetting a lugar) must not
  -- fail on a move the series is about to drop; check_dias_de_serie still
  -- holds when the transaction ends.
  if new.fecha_nueva is not null
    and (tg_op = 'INSERT' or new.fecha_nueva is distinct from old.fecha_nueva)
    and (
    exists (
      select 1
      from public.eventos_fechas
      where eventos_fechas.evento_id = new.evento_id
        and eventos_fechas.fecha = new.fecha_nueva
        and not exists (
          select 1
          from public.excepciones
          where excepciones.evento_id = eventos_fechas.evento_id
            and excepciones.fecha = eventos_fechas.fecha
            and excepciones.fecha_nueva is not null
        )
    )
    or exists (
      select 1
      from public.excepciones
      where excepciones.evento_id = new.evento_id
        and excepciones.fecha <> new.fecha
        and excepciones.fecha_nueva = new.fecha_nueva
    )
  ) then
    raise exception 'The fecha % is already a date of the evento %', new.fecha_nueva, new.evento_id
      using errcode = '23514';
  end if;

  if new.lugar_id is not null
    and (tg_op = 'INSERT' or new.lugar_id is distinct from old.lugar_id)
    and not exists (
    select 1
    from public.lugares
    where lugares.id = new.lugar_id
      and lugares.duenio_iglesia_id is not distinct from evento.duenio_iglesia_id
      and lugares.duenio_distrito_id is not distinct from evento.duenio_distrito_id
      and lugares.duenio_asociacion_id is not distinct from evento.duenio_asociacion_id
  ) then
    raise exception 'The lugar % is not one of the duenio of the evento', new.lugar_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger excepciones_check
  before insert or update
  on public.excepciones
  for each row
  execute function public.check_excepcion();

-- No day shows a date of a series twice. The trigger above catches a date
-- that moves onto a taken day; this one also catches a date that comes back to
-- its own day (its move undone, or its excepcion deleted) when another date
-- moved there meanwhile. It is checked when the transaction ends, so a save of
-- the whole series (guardar_evento) can drop its excepciones in any order.
create function public.check_dias_de_serie()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- NEW is null when a row is deleted.
  serie_id uuid := coalesce(new.evento_id, old.evento_id);
begin
  -- Every date that is not deleted keeps its row in eventos_fechas; it is seen
  -- on the day it moved to, or on its own.
  if exists (
    select 1
    from public.eventos_fechas
    left join public.excepciones
      on excepciones.evento_id = eventos_fechas.evento_id
      and excepciones.fecha = eventos_fechas.fecha
    where eventos_fechas.evento_id = serie_id
    group by coalesce(excepciones.fecha_nueva, eventos_fechas.fecha)
    having count(*) > 1
  ) then
    raise exception 'Two dates of the evento % fall on the same day', serie_id
      using errcode = '23514';
  end if;

  return null;
end;
$$;

create constraint trigger excepciones_dias_de_serie
  after insert or update or delete
  on public.excepciones
  deferrable initially deferred
  for each row
  execute function public.check_dias_de_serie();

create constraint trigger eventos_fechas_dias_de_serie
  after insert or update
  on public.eventos_fechas
  deferrable initially deferred
  for each row
  execute function public.check_dias_de_serie();

-- Permissions ----------------------------------------------------------------------
-- Reading is public, like the calendario. Writing needs a session and a cargo
-- that covers the duenio of the evento, as writing its dates does: an iglesia
-- sumada sees the excepciones of the duenio and never makes one.

alter table public.excepciones enable row level security;

grant select on public.excepciones to anon, authenticated;
grant insert, update, delete on public.excepciones to authenticated;

create policy "Anyone can read excepciones"
  on public.excepciones for select
  to anon, authenticated
  using (true);

create policy "Usuarios can insert excepciones their cargos cover"
  on public.excepciones for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.eventos
      where eventos.id = excepciones.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );

create policy "Usuarios can update excepciones their cargos cover"
  on public.excepciones for update
  to authenticated
  using (
    exists (
      select 1
      from public.eventos
      where eventos.id = excepciones.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.eventos
      where eventos.id = excepciones.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );

create policy "Usuarios can delete excepciones their cargos cover"
  on public.excepciones for delete
  to authenticated
  using (
    exists (
      select 1
      from public.eventos
      where eventos.id = excepciones.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );

-- Whether the cargos of the usuario cover the duenio of an evento: the RPCs
-- below say so before writing, instead of letting the policies change no row.
create function public.puede_editar_evento(evento_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.eventos
    where eventos.id = puede_editar_evento.evento_id
      and public.cargos_abarcan_duenio(
        eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
      )
  );
$$;

revoke execute on function public.puede_editar_evento(uuid) from public, anon;
grant execute on function public.puede_editar_evento(uuid) to authenticated;

-- guardar_excepcion ------------------------------------------------------------------
-- Replaces what a date of a series changes. Every field it receives is what
-- the date has of its own; a field left out is read from the series again. A
-- call that changes nothing takes the date back to the series.
--
-- `fecha` is the original date of the series. A deleted date cannot be
-- changed: it no longer exists (23514, as a date that never was one).
create function public.guardar_excepcion(
  evento_id uuid,
  fecha date,
  fecha_nueva date default null,
  titulo text default null,
  hora time default null,
  cambia_lugar boolean default false,
  lugar text default null,
  lugar_id uuid default null,
  cambia_descripcion boolean default false,
  descripcion text default null,
  cambia_enfasis boolean default false,
  enfasis public.enfasis default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- Moving a date to its own day is not moving it.
  movida date := nullif(guardar_excepcion.fecha_nueva, guardar_excepcion.fecha);
begin
  if not public.puede_editar_evento(guardar_excepcion.evento_id) then
    raise exception 'There is no evento % the usuario can edit', guardar_excepcion.evento_id
      using errcode = 'P0002';
  end if;

  -- A date that comes back to its own day finds it free, or the day would
  -- show two dates (checked again when the transaction ends).
  if movida is null and exists (
    select 1
    from public.excepciones
    where excepciones.evento_id = guardar_excepcion.evento_id
      and excepciones.fecha_nueva = guardar_excepcion.fecha
  ) then
    raise exception 'Another date of the evento % moved to %',
      guardar_excepcion.evento_id, guardar_excepcion.fecha
      using errcode = '23514';
  end if;

  if movida is null
    and guardar_excepcion.titulo is null
    and guardar_excepcion.hora is null
    and not guardar_excepcion.cambia_lugar
    and not guardar_excepcion.cambia_descripcion
    and not guardar_excepcion.cambia_enfasis
  then
    delete from public.excepciones
    where excepciones.evento_id = guardar_excepcion.evento_id
      and excepciones.fecha = guardar_excepcion.fecha
      and not excepciones.borrada;

    return;
  end if;

  if exists (
    select 1
    from public.excepciones
    where excepciones.evento_id = guardar_excepcion.evento_id
      and excepciones.fecha = guardar_excepcion.fecha
      and excepciones.borrada
  ) then
    raise exception 'The fecha % of the evento % was deleted',
      guardar_excepcion.fecha, guardar_excepcion.evento_id
      using errcode = '23514';
  end if;

  insert into public.excepciones (
    evento_id, fecha, fecha_nueva, titulo, hora,
    cambia_lugar, lugar, lugar_id, cambia_descripcion, descripcion, cambia_enfasis, enfasis
  )
  values (
    guardar_excepcion.evento_id, guardar_excepcion.fecha, movida,
    guardar_excepcion.titulo, guardar_excepcion.hora,
    guardar_excepcion.cambia_lugar, guardar_excepcion.lugar, guardar_excepcion.lugar_id,
    guardar_excepcion.cambia_descripcion, guardar_excepcion.descripcion,
    guardar_excepcion.cambia_enfasis, guardar_excepcion.enfasis
  )
  on conflict on constraint excepciones_pkey do update
  set
    fecha_nueva = excluded.fecha_nueva,
    titulo = excluded.titulo,
    hora = excluded.hora,
    cambia_lugar = excluded.cambia_lugar,
    lugar = excluded.lugar,
    lugar_id = excluded.lugar_id,
    cambia_descripcion = excluded.cambia_descripcion,
    descripcion = excluded.descripcion,
    cambia_enfasis = excluded.cambia_enfasis,
    enfasis = excluded.enfasis;
end;
$$;

revoke execute on function public.guardar_excepcion(
  uuid, date, date, text, time, boolean, text, uuid, boolean, text, boolean, public.enfasis
) from public, anon;
grant execute on function public.guardar_excepcion(
  uuid, date, date, text, time, boolean, text, uuid, boolean, text, boolean, public.enfasis
) to authenticated;

-- borrar_fecha -----------------------------------------------------------------------
-- Deletes a single date of a series: the date disappears, the others stay. The
-- last date left is deleted with the whole series (borrar_evento), so a series
-- never stays without dates. A date already deleted is what was asked for.
create function public.borrar_fecha(evento_id uuid, fecha date)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.puede_editar_evento(borrar_fecha.evento_id) then
    raise exception 'There is no evento % the usuario can edit', borrar_fecha.evento_id
      using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.eventos_fechas
    where eventos_fechas.evento_id = borrar_fecha.evento_id
      and eventos_fechas.fecha = borrar_fecha.fecha
  ) then
    -- A delete sent again, after its answer was lost, finds it done.
    if exists (
      select 1
      from public.excepciones
      where excepciones.evento_id = borrar_fecha.evento_id
        and excepciones.fecha = borrar_fecha.fecha
        and excepciones.borrada
    ) then
      return;
    end if;

    raise exception 'The fecha % is not a date of the evento %',
      borrar_fecha.fecha, borrar_fecha.evento_id
      using errcode = '23514';
  end if;

  if (
    select count(*)
    from public.eventos_fechas
    where eventos_fechas.evento_id = borrar_fecha.evento_id
  ) = 1 then
    raise exception 'The last fecha of the evento % is deleted with the evento',
      borrar_fecha.evento_id
      using errcode = '22023';
  end if;

  -- The excepcion first: the trigger checks the evento is a series.
  insert into public.excepciones (evento_id, fecha, borrada)
  values (borrar_fecha.evento_id, borrar_fecha.fecha, true)
  on conflict on constraint excepciones_pkey do update
  set
    borrada = true,
    fecha_nueva = null,
    titulo = null,
    hora = null,
    cambia_lugar = false,
    lugar = null,
    lugar_id = null,
    cambia_descripcion = false,
    descripcion = null,
    cambia_enfasis = false,
    enfasis = null;

  delete from public.eventos_fechas
  where eventos_fechas.evento_id = borrar_fecha.evento_id
    and eventos_fechas.fecha = borrar_fecha.fecha;
end;
$$;

revoke execute on function public.borrar_fecha(uuid, date) from public, anon;
grant execute on function public.borrar_fecha(uuid, date) to authenticated;

-- guardar_evento keeps the excepciones -----------------------------------------------
-- Same arguments as in 20261018120000; the body no longer deletes every date to
-- insert them again, which would lose the excepciones. Dropped and created
-- again, like every version of it, so the whole definition is in one place.

drop function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid, uuid, uuid[]
);

-- Creates an evento when `evento_id` is null, or replaces every column and
-- every date of an existing one. Returns the id of the evento saved.
--
-- `fechas` are all the dates of the evento: one for a single date or for an
-- evento of several days (its first day), one per occurrence for a series.
-- They replace the dates it had, past ones included. A date of the series
-- deleted on its own (borrar_fecha) is not created again, and the excepciones
-- of the dates that stay are kept; those of a date that is gone are dropped,
-- and so are all of them when the evento stops repeating, and the one of a
-- date that moved to a day the series now has again. A lugar that is not one
-- of the new duenio goes back to the one of the series.
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
-- the duenio shared or what an iglesia quito. Either way, an iglesia sumada that
-- now sees the evento by its alcance stops being sumada, even when the list
-- still has it.
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
  -- The iglesias sumadas the alcance of the evento now reaches.
  redundantes uuid[];
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

    -- The excepciones of the dates that are gone go with them; an evento that
    -- does not repeat has none.
    delete from public.excepciones
    where excepciones.evento_id = saved_id
      and (
        guardar_evento.repeticion = 'ninguna'
        or excepciones.fecha <> all (guardar_evento.fechas)
      );

    delete from public.eventos_fechas
    where eventos_fechas.evento_id = saved_id
      and eventos_fechas.fecha <> all (guardar_evento.fechas);
  end if;

  -- The dates it already has stay, with their excepciones; a deleted one is
  -- not created again. A date repeated in the list still breaks the primary
  -- key, and the whole save with it.
  insert into public.eventos_fechas (evento_id, fecha)
  select saved_id, nueva.fecha
  from unnest(guardar_evento.fechas) as nueva (fecha)
  where not exists (
      select 1
      from public.eventos_fechas
      where eventos_fechas.evento_id = saved_id
        and eventos_fechas.fecha = nueva.fecha
    )
    and not exists (
      select 1
      from public.excepciones
      where excepciones.evento_id = saved_id
        and excepciones.fecha = nueva.fecha
        and excepciones.borrada
    );

  -- A lugar that is not one of the new duenio goes back to the one of the
  -- series, first: the trigger checks it on every update of the excepcion.
  update public.excepciones
  set cambia_lugar = false, lugar_id = null
  where excepciones.evento_id = saved_id
    and excepciones.lugar_id is not null
    and not exists (
      select 1
      from public.lugares
      where lugares.id = excepciones.lugar_id
        and lugares.duenio_iglesia_id is not distinct from guardar_evento.duenio_iglesia_id
        and lugares.duenio_distrito_id is not distinct from guardar_evento.duenio_distrito_id
        and lugares.duenio_asociacion_id is not distinct from guardar_evento.duenio_asociacion_id
    )
    and (
      excepciones.fecha_nueva is not null or excepciones.titulo is not null
      or excepciones.hora is not null or excepciones.cambia_descripcion or excepciones.cambia_enfasis
    );

  delete from public.excepciones
  where excepciones.evento_id = saved_id
    and excepciones.lugar_id is not null
    and not exists (
      select 1
      from public.lugares
      where lugares.id = excepciones.lugar_id
        and lugares.duenio_iglesia_id is not distinct from guardar_evento.duenio_iglesia_id
        and lugares.duenio_distrito_id is not distinct from guardar_evento.duenio_distrito_id
        and lugares.duenio_asociacion_id is not distinct from guardar_evento.duenio_asociacion_id
    );

  -- A date moved to a day the series has again, and not moved away, would
  -- show twice that day: its excepcion is dropped. Its own day comes back, and
  -- another date may have moved onto it, hence the loop.
  loop
    delete from public.excepciones
    where excepciones.evento_id = saved_id
      and exists (
        select 1
        from public.eventos_fechas
        where eventos_fechas.evento_id = saved_id
          and eventos_fechas.fecha = excepciones.fecha_nueva
          and not exists (
            select 1
            from public.excepciones as movida
            where movida.evento_id = saved_id
              and movida.fecha = eventos_fechas.fecha
              and movida.fecha_nueva is not null
          )
      );

    exit when not found;
  end loop;

  -- The iglesias sumadas the evento now reaches by its alcance stop being
  -- sumadas: a new duenio, or an iglesia that moved into the distrito duenio.
  -- A list read before that still has them, so they also leave the list
  -- instead of failing the save on every try.
  with dejan_de_estar_sumadas as (
    delete from public.iglesias_sumadas
    where iglesias_sumadas.evento_id = saved_id
      and (
        guardar_evento.alcance = 'asociacion'
        or public.iglesia_ve_evento_por_alcance(saved_id, iglesias_sumadas.iglesia_id)
      )
    returning iglesias_sumadas.iglesia_id
  )
  select coalesce(array_agg(iglesia_id), '{}') into redundantes
  from dejan_de_estar_sumadas;

  if guardar_evento.iglesias_sumadas is not null then
    -- Replaced as a whole, so the trigger checks every iglesia of the list
    -- against the evento as it is now: one that was never sumada and already
    -- sees the evento is rejected.
    delete from public.iglesias_sumadas
    where iglesias_sumadas.evento_id = saved_id;

    insert into public.iglesias_sumadas (evento_id, iglesia_id)
    select distinct saved_id, iglesia_id
    from unnest(guardar_evento.iglesias_sumadas) as iglesia_id
    where iglesia_id <> all (redundantes);
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
