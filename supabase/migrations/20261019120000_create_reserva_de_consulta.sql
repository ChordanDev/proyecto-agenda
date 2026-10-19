-- The reserva of a consulta of the chat (issue #142, Jorge review of #183).
--
-- registrar_consulta counts a consulta after the model answers, so the limite
-- diario was checked against counters read before: consultas sent at the same
-- time all passed the check and went past it. Now the server reserves the
-- consulta before calling the model, in one statement that refuses past the
-- limite, and then either confirms it with its costo or frees it when the
-- respuesta fails: a failed respuesta still counts nothing.
--
-- The presupuesto is checked at the reserva too. Its costo is only known when
-- the model answers, so consultas already running when it runs out can still
-- add theirs: a fraction of a cent each.
--
-- The limits themselves (50 consultas, 20 USD) stay in
-- src/features/chat/dominio/limites.ts: the server passes them in.
-- registrar_consulta is kept as it is; the server no longer calls it.

-- Reserves a consulta of a usuario in a dia, before calling the model:
-- 'reservada', or why not: 'limite_diario' when the usuario already has
-- limite_diario consultas that dia, 'presupuesto_agotado' when the gasto of the
-- mes reached presupuesto_usd. A rejected reserva counts nothing.
create function public.reservar_consulta(
  usuario_id uuid,
  dia date,
  mes date,
  limite_diario integer,
  presupuesto_usd numeric
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  cantidad integer;
begin
  if reservar_consulta.limite_diario is null
    or reservar_consulta.limite_diario < 1
    or reservar_consulta.presupuesto_usd is null then
    raise exception 'A reserva needs a limite diario of at least 1 and a presupuesto'
      using errcode = '22023';
  end if;

  -- One statement: two reservas at the same time wait for each other on the
  -- row, and the second one sees the count of the first.
  insert into public.chat_consultas as c (usuario_id, dia, cantidad)
  values (reservar_consulta.usuario_id, reservar_consulta.dia, 1)
  on conflict (usuario_id, dia) do update set cantidad = c.cantidad + 1
    where c.cantidad < reservar_consulta.limite_diario
  returning c.cantidad into cantidad;

  if cantidad is null then
    return 'limite_diario';
  end if;

  if exists (
    select 1
    from public.chat_gastos
    where chat_gastos.mes = reservar_consulta.mes
      and chat_gastos.usd >= reservar_consulta.presupuesto_usd
  ) then
    -- Takes back the reserva just made, in the same transaction.
    update public.chat_consultas
    set cantidad = chat_consultas.cantidad - 1
    where chat_consultas.usuario_id = reservar_consulta.usuario_id
      and chat_consultas.dia = reservar_consulta.dia;

    return 'presupuesto_agotado';
  end if;

  return 'reservada';
end;
$$;

-- Confirms a reserved consulta that was answered: adds its costo to the gasto
-- of the mes and returns both counters as they stand after it. The consulta
-- itself was already counted by its reserva.
create function public.confirmar_consulta(
  usuario_id uuid,
  dia date,
  mes date,
  costo_usd numeric
)
returns table (consultas_del_dia integer, gasto_del_mes numeric)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if confirmar_consulta.costo_usd is null or confirmar_consulta.costo_usd < 0 then
    raise exception 'The costo of a consulta cannot be negative' using errcode = '22023';
  end if;

  insert into public.chat_gastos as g (mes, usd)
  values (confirmar_consulta.mes, confirmar_consulta.costo_usd)
  on conflict (mes) do update set usd = g.usd + excluded.usd
  returning g.usd into gasto_del_mes;

  select c.cantidad into consultas_del_dia
  from public.chat_consultas as c
  where c.usuario_id = confirmar_consulta.usuario_id
    and c.dia = confirmar_consulta.dia;

  return next;
end;
$$;

-- Frees a reserved consulta whose respuesta failed, so it does not count.
create function public.liberar_consulta(usuario_id uuid, dia date)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.chat_consultas
  set cantidad = chat_consultas.cantidad - 1
  where chat_consultas.usuario_id = liberar_consulta.usuario_id
    and chat_consultas.dia = liberar_consulta.dia
    and chat_consultas.cantidad > 0;
$$;

-- Only the server, like registrar_consulta.
revoke execute on function public.reservar_consulta(uuid, date, date, integer, numeric)
  from public, anon, authenticated;
revoke execute on function public.confirmar_consulta(uuid, date, date, numeric)
  from public, anon, authenticated;
revoke execute on function public.liberar_consulta(uuid, date)
  from public, anon, authenticated;
grant execute on function public.reservar_consulta(uuid, date, date, integer, numeric) to service_role;
grant execute on function public.confirmar_consulta(uuid, date, date, numeric) to service_role;
grant execute on function public.liberar_consulta(uuid, date) to service_role;
