-- Lugares guardados (issue #129): the lugar of an evento is chosen from a list
-- of the lugares of its duenio instead of being written each time.
--
-- A lugar belongs to a duenio, like an evento: an iglesia, a distrito or the
-- asociacion. Within a duenio a nombre is not repeated, without telling capitals
-- or accents apart: "Salón de jóvenes" and "salon de jovenes" are one lugar.
--
-- In v1 lugares are only created. Renaming or deleting them belongs to Gestión
-- (v2), so there are no update or delete policies.
--
-- The eventos saved before this migration keep their lugar as written text
-- (eventos.lugar). A new evento points to a lugar instead (eventos.lugar_id):
-- an evento has one or the other, never both.

create extension if not exists unaccent with schema extensions;

-- The form of a nombre two lugares are compared by: no capitals, no accents and
-- single spaces. unaccent is only stable, because its dictionary could change;
-- naming the dictionary makes the result depend on the text alone, which an
-- index needs.
create function public.lugar_nombre_key(nombre text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(
    extensions.unaccent(
      'extensions.unaccent'::regdictionary,
      regexp_replace(btrim(nombre), '\s+', ' ', 'g')
    )
  );
$$;

create table public.lugares (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  -- One column per level, as in eventos, so each one keeps a real foreign key.
  duenio_iglesia_id uuid references public.iglesias (id),
  duenio_distrito_id uuid references public.distritos (id),
  duenio_asociacion_id uuid references public.asociaciones (id),

  constraint lugares_nombre_not_blank check (btrim(nombre) <> ''),
  constraint lugares_single_duenio check (
    num_nonnulls(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id) = 1
  )
);

-- A nombre once per duenio. The duenio is whichever of the three columns is set:
-- the ids are uuids, so an iglesia and a distrito never share one.
create unique index lugares_nombre_per_duenio_key on public.lugares (
  coalesce(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id),
  public.lugar_nombre_key(nombre)
);

-- The list of a duenio is read by its column. The unique index above already
-- covers each one, but only through the coalesce, which a filter on a single
-- column does not use.
create index lugares_duenio_iglesia_id_idx on public.lugares (duenio_iglesia_id);
create index lugares_duenio_distrito_id_idx on public.lugares (duenio_distrito_id);
create index lugares_duenio_asociacion_id_idx on public.lugares (duenio_asociacion_id);

alter table public.lugares enable row level security;

-- Reading is public, like the eventos that show the nombre. Creating needs a
-- session and a cargo that covers the duenio, the same rule as an evento.
grant select on public.lugares to anon, authenticated;
grant insert on public.lugares to authenticated;

create policy "Anyone can read lugares"
  on public.lugares for select
  to anon, authenticated
  using (true);

create policy "Usuarios can insert lugares their cargos cover"
  on public.lugares for insert
  to authenticated
  with check (
    public.cargos_abarcan_duenio(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id)
  );

-- Creates a lugar of a duenio and returns it. When the duenio already has a
-- lugar with that nombre (without telling capitals or accents apart), it returns
-- that one instead: adding a nombre that is already in the list picks it, and a
-- create sent again after a lost answer does not fail.
--
-- The nombre is saved trimmed and with single spaces. The insert policy decides
-- first, so a usuario the cargos do not cover learns nothing about the list.
create function public.guardar_lugar(
  nombre text,
  duenio_iglesia_id uuid default null,
  duenio_distrito_id uuid default null,
  duenio_asociacion_id uuid default null
)
returns public.lugares
language plpgsql
security invoker
set search_path = ''
as $$
-- The arguments share their names with the columns; in the conflict target,
-- which cannot be qualified, a name is the column.
#variable_conflict use_column
declare
  saved public.lugares;
begin
  insert into public.lugares (nombre, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id)
  values (
    regexp_replace(btrim(guardar_lugar.nombre), '\s+', ' ', 'g'),
    guardar_lugar.duenio_iglesia_id,
    guardar_lugar.duenio_distrito_id,
    guardar_lugar.duenio_asociacion_id
  )
  on conflict (
    coalesce(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id),
    public.lugar_nombre_key(nombre)
  ) do nothing
  returning * into saved;

  if saved.id is null then
    select * into saved
    from public.lugares
    where coalesce(lugares.duenio_iglesia_id, lugares.duenio_distrito_id, lugares.duenio_asociacion_id)
        = coalesce(guardar_lugar.duenio_iglesia_id, guardar_lugar.duenio_distrito_id, guardar_lugar.duenio_asociacion_id)
      and public.lugar_nombre_key(lugares.nombre) = public.lugar_nombre_key(guardar_lugar.nombre);
  end if;

  return saved;
end;
$$;

revoke execute on function public.guardar_lugar(text, uuid, uuid, uuid) from public, anon;
grant execute on function public.guardar_lugar(text, uuid, uuid, uuid) to authenticated;

-- The lugar of an evento ---------------------------------------------------------

alter table public.eventos
  add column lugar_id uuid references public.lugares (id),
  -- The written lugar of an old evento or a lugar of the list, never both.
  add constraint eventos_lugar_or_lugar_id check (lugar is null or lugar_id is null);

create index eventos_lugar_id_idx on public.eventos (lugar_id);

-- The lugar of an evento is one of its duenio. A foreign key cannot say it: of
-- the three duenio columns two are always null, and a composite key with a null
-- is not checked.
create function public.check_lugar_of_evento()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.lugar_id is not null and not exists (
    select 1
    from public.lugares
    where lugares.id = new.lugar_id
      and lugares.duenio_iglesia_id is not distinct from new.duenio_iglesia_id
      and lugares.duenio_distrito_id is not distinct from new.duenio_distrito_id
      and lugares.duenio_asociacion_id is not distinct from new.duenio_asociacion_id
  ) then
    raise exception 'The lugar % is not one of the duenio of the evento', new.lugar_id
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger eventos_lugar_of_duenio
  before insert or update of lugar_id, duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id
  on public.eventos
  for each row
  execute function public.check_lugar_of_evento();

-- guardar_evento takes the lugar of the list --------------------------------------
-- The function is dropped and created again because a new argument would
-- otherwise add a second function beside it. The new argument goes last and
-- defaults to null, so a call without it still works.

drop function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid
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
-- The columns that can be empty go last and default to null, so the API can
-- leave them out. Leaving one out when editing empties it: every column is
-- replaced.
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
  lugar_id uuid default null
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

  return saved_id;
end;
$$;

-- A function is executable by everyone by default, and Supabase also grants it
-- to the API roles one by one. Writing needs a session.
revoke execute on function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid, uuid
) from public, anon;
grant execute on function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid, uuid
) to authenticated;
