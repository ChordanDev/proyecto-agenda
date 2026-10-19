-- What the chat de consulta reads (issue #142), with the identity of the
-- usuario who asks: the server function calls these with their JWT.
--
-- Reading eventos is open to everyone (the hermano reads them without a
-- sesion), so row level security alone would let the chat find eventos of any
-- iglesia. buscar_eventos narrows the busqueda to the calendario of the
-- usuario: the union of the calendarios of the iglesias their cargos cover,
-- as the app shows it (armarCalendarioDeUsuario). Each of those iglesias sees
-- its own eventos, those of its distrito and its asociacion, and those it is
-- sumada to.

-- The busqueda ---------------------------------------------------------------------

-- The dates of the eventos of the calendario of the usuario that fall between
-- desde and hasta (both included), in order of fecha and hora: the first
-- `maximo`, each with the total of coincidencias, so the chat knows how many
-- there are without reading them all. An evento of several days falls on every
-- day of its range; a series has one row per date.
--
-- texto narrows it to the eventos whose titulo, lugar, descripcion or duenio
-- contain every one of its words, without caring about capitals or accents.
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
      eventos.titulo,
      eventos_fechas.fecha,
      eventos.fecha_fin,
      eventos.hora,
      -- An evento has a lugar of the list or a written one, never both.
      coalesce(lugares.nombre, eventos.lugar) as lugar,
      eventos.descripcion,
      eventos.enfasis,
      eventos.alcance,
      coalesce(duenia.nombre, distritos.nombre, asociaciones.nombre) as duenio
    from public.eventos
    join public.eventos_fechas on eventos_fechas.evento_id = eventos.id
    left join public.lugares on lugares.id = eventos.lugar_id
    left join public.iglesias as duenia on duenia.id = eventos.duenio_iglesia_id
    left join public.distritos on distritos.id = eventos.duenio_distrito_id
    left join public.asociaciones on asociaciones.id = eventos.duenio_asociacion_id
    where eventos_fechas.fecha <= buscar_eventos.hasta
      and coalesce(eventos.fecha_fin, eventos_fechas.fecha) >= buscar_eventos.desde
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

-- The zona horaria of the usuario ----------------------------------------------------

-- The zona horaria of the asociacion of the cargos of the usuario: the dia and
-- the mes of their limits count in it. Null when they hold no cargo. There is
-- one asociacion for now; with several, a usuario's cargos are in one of them,
-- and the lowest id breaks a tie so the answer does not change between calls.
create function public.get_zona_horaria_de_usuario()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select asociaciones.zona_horaria
  from public.cargos
  left join public.iglesias on iglesias.id = cargos.iglesia_id
  left join public.distritos
    on distritos.id = coalesce(cargos.distrito_id, iglesias.distrito_id)
  join public.asociaciones
    on asociaciones.id = coalesce(cargos.asociacion_id, distritos.asociacion_id)
  where cargos.usuario_id = (select auth.uid())
  order by asociaciones.id
  limit 1;
$$;

revoke execute on function public.get_zona_horaria_de_usuario() from public, anon;
grant execute on function public.get_zona_horaria_de_usuario() to authenticated;
