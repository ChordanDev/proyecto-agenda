-- Create an evento only once when the app sends the same create again.
--
-- If the answer of a create is lost (the connection drops after the server
-- saved it), the app reports an error and the person taps Guardar again: the
-- evento would be created twice. Now the app chooses the id of a new evento
-- (`nuevo_evento_id`) and sends the same one on every try. A try that finds the
-- evento already created replaces its columns and dates, as editing does, so
-- what the form held on the last try is what stays.
--
-- That replace goes through the update policy, like any edit: the id of an
-- evento the cargos do not cover fails as editing it would (P0002).
--
-- The new argument goes last and defaults to null, so a create without it still
-- gets an id from the database. The function is dropped and created again
-- because a new argument would otherwise add a second function beside it.

drop function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date
);

-- Creates an evento when `evento_id` is null, or replaces every column and
-- every date of an existing one. Returns the id of the evento saved.
--
-- `fechas` are all the dates of the evento: one for a single date or for an
-- evento of several days (its first day), one per occurrence for a series.
-- They replace the dates it had, past ones included.
--
-- `nuevo_evento_id` is the id of an evento to create, chosen by the app; it is
-- ignored when `evento_id` is given.
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
  nuevo_evento_id uuid default null
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
    -- A create sent again finds its id taken and goes on as an edit of it.
    insert into public.eventos (
      id, titulo, lugar, descripcion, enfasis, alcance,
      duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id,
      hora, fecha_fin, repeticion, fin_de_serie
    )
    values (
      coalesce(guardar_evento.nuevo_evento_id, gen_random_uuid()),
      guardar_evento.titulo, guardar_evento.lugar, guardar_evento.descripcion,
      guardar_evento.enfasis, guardar_evento.alcance,
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
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid
) from public, anon;
grant execute on function public.guardar_evento(
  text, public.alcance, time, public.repeticion, date[],
  uuid, text, text, public.enfasis, uuid, uuid, uuid, date, date, uuid
) to authenticated;
