-- Structure of the church: asociacion -> distrito -> iglesia.
--
-- The app only reads these tables. They are loaded by the developers from the
-- data of the asociacion, so there is no write policy: with row level security
-- enabled and no insert/update/delete policy, the app cannot modify them.

create table public.asociaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null
);

create table public.distritos (
  id uuid primary key default gen_random_uuid(),
  asociacion_id uuid not null references public.asociaciones (id),
  nombre text not null
);

create table public.iglesias (
  id uuid primary key default gen_random_uuid(),
  distrito_id uuid not null references public.distritos (id),
  nombre text not null,
  direccion text not null,
  localidad text not null,
  -- Hides the church from the "Elegir iglesia" search. The row stays readable.
  excluida_del_buscador boolean not null default false
);

-- Foreign keys are not indexed automatically.
create index distritos_asociacion_id_idx on public.distritos (asociacion_id);
create index iglesias_distrito_id_idx on public.iglesias (distrito_id);

alter table public.asociaciones enable row level security;
alter table public.distritos enable row level security;
alter table public.iglesias enable row level security;

-- Explicit read grants, so reading does not depend on the project setting that
-- exposes new tables to the API roles automatically.
grant select on public.asociaciones, public.distritos, public.iglesias to anon, authenticated;

-- The structure is public: it is read without a session (the hermano has no login).
create policy "Anyone can read asociaciones"
  on public.asociaciones for select
  to anon, authenticated
  using (true);

create policy "Anyone can read distritos"
  on public.distritos for select
  to anon, authenticated
  using (true);

create policy "Anyone can read iglesias"
  on public.iglesias for select
  to anon, authenticated
  using (true);
