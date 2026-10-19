-- The daily sending of recordatorios reads the excepciones of a series (issue
-- #216), as buscar_eventos does since 20261023000000: a date warns with its
-- own titulo, hora, lugar, descripcion and enfasis, and the night before the
-- day it moved to, not before its original one. A deleted date has no row in
-- eventos_fechas, so it never warns.
--
-- Only the dates that warn come out: those with an enfasis, of an evento whose
-- duenio is not de baja. The read policies of 20261024000000 leave out what is
-- de baja, but the server skips them, so this function applies the same rule:
-- an iglesia sumada de baja stops being sumada. Each evento has at most one
-- date a day (the excepciones_check trigger), so evento_id is unique.
--
-- An evento of several days has its first day as its date, and the sending
-- only warns before that one, so the dates of `maniana` are enough.

create function public.fechas_de_recordatorio(maniana date)
returns table (
  evento_id uuid,
  fecha date,
  titulo text,
  hora time,
  lugar text,
  lugar_id uuid,
  descripcion text,
  enfasis public.enfasis,
  alcance public.alcance,
  duenio_iglesia_id uuid,
  duenio_distrito_id uuid,
  duenio_asociacion_id uuid,
  fecha_fin date,
  repeticion public.repeticion,
  fin_de_serie date,
  iglesias_sumadas uuid[]
)
language sql
stable
security invoker
set search_path = ''
as $$
  with fechas as (
    -- The dates of tomorrow that did not move away.
    select eventos_fechas.evento_id, eventos_fechas.fecha as original
    from public.eventos_fechas
    where eventos_fechas.fecha = fechas_de_recordatorio.maniana
      and not exists (
        select 1
        from public.excepciones
        where excepciones.evento_id = eventos_fechas.evento_id
          and excepciones.fecha = eventos_fechas.fecha
          and excepciones.fecha_nueva is not null
      )
    union all
    -- The dates of another day that moved to tomorrow.
    select excepciones.evento_id, excepciones.fecha
    from public.excepciones
    join public.eventos_fechas
      on eventos_fechas.evento_id = excepciones.evento_id
      and eventos_fechas.fecha = excepciones.fecha
    where excepciones.fecha_nueva = fechas_de_recordatorio.maniana
  ),
  con_excepcion as (
    select
      eventos.id as evento_id,
      fechas_de_recordatorio.maniana as fecha,
      coalesce(excepciones.titulo, eventos.titulo) as titulo,
      coalesce(excepciones.hora, eventos.hora) as hora,
      -- An evento has a lugar of the list or a written one, never both; so
      -- does an excepcion that changes it.
      case when excepciones.cambia_lugar then excepciones.lugar else eventos.lugar end as lugar,
      case when excepciones.cambia_lugar then excepciones.lugar_id else eventos.lugar_id end
        as lugar_id,
      case when excepciones.cambia_descripcion then excepciones.descripcion else eventos.descripcion end
        as descripcion,
      case when excepciones.cambia_enfasis then excepciones.enfasis else eventos.enfasis end
        as enfasis,
      eventos.alcance,
      eventos.duenio_iglesia_id,
      eventos.duenio_distrito_id,
      eventos.duenio_asociacion_id,
      eventos.fecha_fin,
      eventos.repeticion,
      eventos.fin_de_serie
    from fechas
    join public.eventos on eventos.id = fechas.evento_id
    left join public.excepciones
      on excepciones.evento_id = fechas.evento_id
      and excepciones.fecha = fechas.original
    left join public.iglesias as duenia on duenia.id = eventos.duenio_iglesia_id
    left join public.distritos on distritos.id = eventos.duenio_distrito_id
    where not coalesce(duenia.de_baja, false)
      and not coalesce(distritos.de_baja, false)
  )
  select
    con_excepcion.*,
    array(
      select iglesias_sumadas.iglesia_id
      from public.iglesias_sumadas
      join public.iglesias on iglesias.id = iglesias_sumadas.iglesia_id
      where iglesias_sumadas.evento_id = con_excepcion.evento_id
        and not iglesias.de_baja
      order by iglesias_sumadas.iglesia_id
    ) as iglesias_sumadas
  from con_excepcion
  -- An actividad regular never warns.
  where con_excepcion.enfasis is not null;
$$;

-- Only the sending reads it: it spans the dates of every iglesia.
revoke execute on function public.fechas_de_recordatorio(date) from public, anon, authenticated;
grant execute on function public.fechas_de_recordatorio(date) to service_role;
