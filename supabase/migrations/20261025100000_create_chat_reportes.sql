-- Reportes of the chat (issue #147): "Reportar respuesta" on each respuesta of
-- the asistente. A reporte keeps who, when and the motivo, never a word of the
-- conversation, which is not saved anywhere. Nobody reads them from the app:
-- they are read from the dashboard of Supabase, where service_role bypasses
-- row level security.

create table public.chat_reportes (
  -- Chosen by the app, so a reporte sent again after a lost answer is saved once.
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  motivo text not null,
  reportado_en timestamptz not null default now(),

  constraint chat_reportes_motivo_valid check (motivo in ('incorrecta', 'ofensiva', 'otro'))
);

alter table public.chat_reportes enable row level security;

-- A usuario only saves their own reportes. Only who and why are written: the
-- moment is always the one of the database. There is no select, update or
-- delete, so a reporte cannot be read, changed or taken back from the app.
grant insert (id, usuario_id, motivo) on public.chat_reportes to authenticated;

create policy "Usuarios can save their own reportes"
  on public.chat_reportes for insert
  to authenticated
  with check (usuario_id = (select auth.uid()));
