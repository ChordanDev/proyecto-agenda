-- The chat de consulta reads the excepciones of a series (issue #214), as the
-- calendario does since 20261022000000: a date shows its own titulo, hora,
-- lugar, descripcion and enfasis, and is found on the day it moved to. Same
-- arguments, result and permissions as in 20261019000000; dropped and created
-- again so the whole definition is in one place.

drop function public.buscar_eventos(date, date, text, integer);

create function public.buscar_eventos(
  desde date,
  hasta date,
  texto text default null,
  maximo integer default 3
)
returns table (
  evento_id uuid,
  titulo text,
  fecha date,
  fecha_fin date,
  hora time,
  lugar text,
  descripcion text,
  enfasis public.enfasis,
  alcance public.alcance,
  duenio text,
  total bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  palabras text[];
begin
  -- A busqueda spans at most a year and a day, so a single call cannot read
  -- the whole calendario.
  if buscar_eventos.desde is null
    or buscar_eventos.hasta is null
    or buscar_eventos.hasta < buscar_eventos.desde
    or buscar_eventos.hasta - buscar_eventos.desde > 366 then
    raise exception 'A busqueda goes from desde to hasta, at most 366 days later'
      using errcode = '22023';
  end if;

  if buscar_eventos.maximo is null or buscar_eventos.maximo not between 1 and 20 then
    raise exception 'A busqueda returns from 1 to 20 eventos' using errcode = '22023';
  end if;

  palabras := array_remove(
    regexp_split_to_array(
      lower(extensions.unaccent('extensions.unaccent'::regdictionary, btrim(coalesce(buscar_eventos.texto, '')))),
      '\s+'
    ),
    ''
  );

  return query
  with iglesias_del_usuario as (
    select iglesias.id, iglesias.distrito_id, distritos.asociacion_id
    from public.iglesias
    join public.distritos on distritos.id = iglesias.distrito_id
    where exists (
      select 1
      from public.cargos
      where cargos.usuario_id = (select auth.uid())
        and (
          cargos.iglesia_id = iglesias.id
          or cargos.distrito_id = iglesias.distrito_id
          or cargos.asociacion_id = distritos.asociacion_id
        )
    )
  ),
  coincidencias as (
    select
      eventos.id as evento_id,
      coalesce(excepciones.titulo, eventos.titulo) as titulo,
      -- A date that moved is on the day it moved to.
      coalesce(excepciones.fecha_nueva, eventos_fechas.fecha) as fecha,
      eventos.fecha_fin,
      coalesce(excepciones.hora, eventos.hora) as hora,
      -- An evento has a lugar of the list or a written one, never both; so
      -- does an excepcion that changes it.
      case
        when excepciones.cambia_lugar then coalesce(lugares_de_fecha.nombre, excepciones.lugar)
        else coalesce(lugares.nombre, eventos.lugar)
      end as lugar,
      case
        when excepciones.cambia_descripcion then excepciones.descripcion
        else eventos.descripcion
      end as descripcion,
      case
        when excepciones.cambia_enfasis then excepciones.enfasis
        else eventos.enfasis
      end as enfasis,
      eventos.alcance,
      coalesce(duenia.nombre, distritos.nombre, asociaciones.nombre) as duenio
    from public.eventos
    join public.eventos_fechas on eventos_fechas.evento_id = eventos.id
    -- A deleted date has no row in eventos_fechas, so it never gets here.
    left join public.excepciones
      on excepciones.evento_id = eventos_fechas.evento_id
      and excepciones.fecha = eventos_fechas.fecha
    left join public.lugares on lugares.id = eventos.lugar_id
    left join public.lugares as lugares_de_fecha on lugares_de_fecha.id = excepciones.lugar_id
    left join public.iglesias as duenia on duenia.id = eventos.duenio_iglesia_id
    left join public.distritos on distritos.id = eventos.duenio_distrito_id
    left join public.asociaciones on asociaciones.id = eventos.duenio_asociacion_id
    -- A series never lasts several days, so a date that moved has no fecha_fin.
    where coalesce(excepciones.fecha_nueva, eventos_fechas.fecha) <= buscar_eventos.hasta
      and coalesce(
        eventos.fecha_fin, excepciones.fecha_nueva, eventos_fechas.fecha
      ) >= buscar_eventos.desde
      and exists (
        select 1
        from iglesias_del_usuario as iglesia
        where eventos.duenio_iglesia_id = iglesia.id
          or eventos.duenio_distrito_id = iglesia.distrito_id
          or eventos.duenio_asociacion_id = iglesia.asociacion_id
          or exists (
            select 1
            from public.iglesias_sumadas
            where iglesias_sumadas.evento_id = eventos.id
              and iglesias_sumadas.iglesia_id = iglesia.id
          )
      )
  )
  select
    coincidencias.evento_id,
    coincidencias.titulo,
    coincidencias.fecha,
    coincidencias.fecha_fin,
    coincidencias.hora,
    coincidencias.lugar,
    coincidencias.descripcion,
    coincidencias.enfasis,
    coincidencias.alcance,
    coincidencias.duenio,
    count(*) over () as total
  from coincidencias
  -- position() and not like: a % or _ in texto is just a character.
  where not exists (
    select 1
    from unnest(palabras) as palabra
    where position(
      palabra in lower(
        extensions.unaccent(
          'extensions.unaccent'::regdictionary,
          concat_ws(
            ' ',
            coincidencias.titulo,
            coincidencias.lugar,
            coincidencias.descripcion,
            coincidencias.duenio
          )
        )
      )
    ) = 0
  )
  order by coincidencias.fecha, coincidencias.hora, coincidencias.titulo, coincidencias.evento_id
  limit buscar_eventos.maximo;
end;
$$;

-- Only a usuario with a sesion: the hermano has no chat.
revoke execute on function public.buscar_eventos(date, date, text, integer) from public, anon;
grant execute on function public.buscar_eventos(date, date, text, integer) to authenticated;

-- Only a usuario with a sesion: the hermano has no chat.
revoke execute on function public.buscar_eventos(date, date, text, integer) from public, anon;
grant execute on function public.buscar_eventos(date, date, text, integer) to authenticated;
