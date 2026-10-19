-- Limits and consentimiento of the chat (issue #141): what the chat needs to
-- decide whether a usuario can make a consulta, before any screen or server
-- function exists.
--
-- The rules themselves (the dia and the mes in the zona horaria of the
-- asociacion, the 50 consultas a day, the 20 USD a month) live in
-- src/features/chat/dominio, which the server function reuses. The database
-- keeps the consentimiento and the counters, and only counters: never a word of
-- the conversation.

-- The zona horaria of the asociacion -------------------------------------------
-- Kept on the asociacion and not fixed in the code, for when the union level
-- is added. An IANA name: a trigger rejects one Postgres does not know.

alter table public.asociaciones
  add column zona_horaria text not null default 'America/Argentina/Buenos_Aires';

-- A check cannot run a query, so a trigger validates the name.
create function public.check_zona_horaria_of_asociacion()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.zona_horaria
  ) then
    raise exception 'The zona horaria % does not exist', new.zona_horaria
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger asociaciones_zona_horaria_exists
  before insert or update of zona_horaria
  on public.asociaciones
  for each row
  execute function public.check_zona_horaria_of_asociacion();

-- The consentimiento -------------------------------------------------------------
-- Per usuario, not per phone: accepting once is enough on any phone. It goes
-- with the usuario when they delete their account.

create table public.chat_consentimientos (
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  aceptado_en timestamptz not null default now()
);

alter table public.chat_consentimientos enable row level security;

-- A usuario reads and saves only their own. Only the usuario is written: the
-- moment is always the one of the database.
grant select on public.chat_consentimientos to authenticated;
grant insert (usuario_id) on public.chat_consentimientos to authenticated;

create policy "Usuarios can read their own consentimiento"
  on public.chat_consentimientos for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "Usuarios can save their own consentimiento"
  on public.chat_consentimientos for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));

-- The counters -------------------------------------------------------------------
-- Written only by the server, through registrar_consulta. Row level security is
-- on without policies and the API roles get no privilege, so neither the app nor
-- the hermano can read or write them; service_role bypasses both.

-- The consultas of a usuario in a dia of the asociacion.
create table public.chat_consultas (
  usuario_id uuid not null references auth.users (id) on delete cascade,
  dia date not null,
  cantidad integer not null default 0,

  primary key (usuario_id, dia),
  constraint chat_consultas_cantidad_not_negative check (cantidad >= 0)
);

-- The gasto of the chat in a mes of the asociacion, in USD. The presupuesto is
-- one for the whole OpenAI account, so the gasto is not per usuario.
create table public.chat_gastos (
  -- The first day of the mes.
  mes date primary key,
  usd numeric(12, 6) not null default 0,

  constraint chat_gastos_mes_first_day check (extract(day from mes) = 1),
  constraint chat_gastos_usd_not_negative check (usd >= 0)
);

alter table public.chat_consultas enable row level security;
alter table public.chat_gastos enable row level security;

-- Registers a consulta of a usuario and what it cost, and returns both counters
-- as they stand after it. The dia and the mes are the ones of the asociacion,
-- which the server works out with the rules of the domain; the mes is its first
-- day. Counting is a single statement per counter, so two consultas at the same
-- time do not lose one.
create function public.registrar_consulta(
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
  if registrar_consulta.costo_usd is null or registrar_consulta.costo_usd < 0 then
    raise exception 'The costo of a consulta cannot be negative' using errcode = '22023';
  end if;

  insert into public.chat_consultas as c (usuario_id, dia, cantidad)
  values (registrar_consulta.usuario_id, registrar_consulta.dia, 1)
  on conflict (usuario_id, dia) do update set cantidad = c.cantidad + 1
  returning c.cantidad into consultas_del_dia;

  insert into public.chat_gastos as g (mes, usd)
  values (registrar_consulta.mes, registrar_consulta.costo_usd)
  on conflict (mes) do update set usd = g.usd + excluded.usd
  returning g.usd into gasto_del_mes;

  return next;
end;
$$;

revoke execute on function public.registrar_consulta(uuid, date, date, numeric)
  from public, anon, authenticated;
grant execute on function public.registrar_consulta(uuid, date, date, numeric) to service_role;
