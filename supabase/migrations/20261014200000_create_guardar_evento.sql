-- Save and delete an evento with its dates in one operation.
--
-- The policies of issue #21 let the API write eventos and eventos_fechas one
-- at a time. If the app saved an evento with one request and its dates with
-- another, a failure in between would leave an evento without dates: it would
-- show in no calendario, and nobody could find it to fix it. These functions
-- do both writes inside the transaction of a single call, so either both are
-- saved or neither is.
--
-- Security invoker: they run as the usuario who calls them, so the policies of
-- eventos and eventos_fechas still decide, row by row, what they may write.
-- They add no permission of their own.

-- Creates an evento when `evento_id` is null, or replaces every column and
-- every date of an existing one. Returns the id of the evento saved.
--
-- `fechas` are all the dates of the evento: one for a single date or for an
-- evento of several days (its first day), one per occurrence for a series.
-- They replace the dates it had, past ones included.
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
  fin_de_serie date default null
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
      titulo, lugar, descripcion, enfasis, alcance,
      duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
      hora, fecha_fin, repeticion, fin_de_serie
    )
    values (
      guardar_evento.titulo, guardar_evento.lugar, guardar_evento.descripcion,
      guardar_evento.enfasis, guardar_evento.alcance,
      guardar_evento.duenio_iglesia_id, guardar_evento.duenio_distrito_id,
      guardar_evento.duenio_asociacion_id,
      guardar_evento.hora, guardar_evento.fecha_fin, guardar_evento.repeticion,
      guardar_evento.fin_de_serie
    )
    returning eventos.id into saved_id;
  else
    update public.eventos
    set
      titulo = guardar_evento.titulo,
      lugar = guardar_evento.lugar,
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
    where eventos.id = guardar_evento.evento_id
    returning eventos.id into saved_id;

    -- The policy hides the eventos the cargos do not cover: updating one
    -- changes no row instead of failing. Saying so beats reporting a success.
    if saved_id is null then
      raise exception 'There is no evento % the usuario can edit', guardar_evento.evento_id
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

-- Deletes an evento; its dates and iglesias sumadas go with it (on delete
-- cascade). A single statement is already atomic: the function is here so that
-- deleting an evento the usuario cannot delete fails instead of doing nothing.
create function public.borrar_evento(evento_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  delete from public.eventos
  where eventos.id = borrar_evento.evento_id
  returning eventos.id into deleted_id;

  if deleted_id is null then
    raise exception 'There is no evento % the usuario can delete', borrar_evento.evento_id
      using errcode = 'P0002';
  end if;
end;
$$;

-- A function is executable by everyone by default, and Supabase also grants it
-- to the API roles one by one. Writing needs a session.
revoke execute on function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date
) from public, anon;
grant execute on function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date
) to authenticated;

revoke execute on function public.borrar_evento(uuid) from public, anon;
grant execute on function public.borrar_evento(uuid) to authenticated;
