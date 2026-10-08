-- Event model: eventos, their dates and the iglesias sumadas.
--
-- For now the app only reads these tables. Reading is public, because the
-- hermano has no login. The write policies arrive with the cargos (issue #21):
-- until then, with row level security enabled and no insert/update/delete
-- policy, the app cannot modify them.
--
-- Dates and times are local values: `date` and `time` (without time zone),
-- never `timestamptz`. An evento at 19:00 is at 19:00 wherever the phone is, so
-- nothing in this model is converted between time zones.

create type public.enfasis as enum ('identidad', 'liderazgo', 'nuevas_generaciones', 'discipulado');
create type public.alcance as enum ('iglesia', 'distrito', 'asociacion');
create type public.repeticion as enum ('ninguna', 'semanal', 'mensual');

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  lugar text,
  descripcion text,
  -- Null means "Actividad regular": it is the lack of an enfasis, not a fifth one.
  enfasis public.enfasis,
  alcance public.alcance not null,
  -- The duenio is the level the evento belongs to, not the person who loaded it.
  -- One column per level, so each one keeps a real foreign key.
  duenio_iglesia_id uuid references public.iglesias (id),
  duenio_distrito_id uuid references public.distritos (id),
  duenio_asociacion_id uuid references public.asociaciones (id),
  hora time not null,
  -- Last day of an evento that lasts several days. The first day is its row in
  -- eventos_fechas. It is a date only: there is no finishing time.
  fecha_fin date,
  repeticion public.repeticion not null default 'ninguna',
  -- "Hasta": the last day a series can have a date on. Not to be confused with
  -- fecha_fin.
  fin_de_serie date,

  constraint eventos_titulo_not_blank check (btrim(titulo) <> ''),

  -- Exactly one duenio, and it is the one of the alcance.
  constraint eventos_duenio_matches_alcance check (
    (
      alcance = 'iglesia'
      and duenio_iglesia_id is not null
      and duenio_distrito_id is null
      and duenio_asociacion_id is null
    )
    or (
      alcance = 'distrito'
      and duenio_iglesia_id is null
      and duenio_distrito_id is not null
      and duenio_asociacion_id is null
    )
    or (
      alcance = 'asociacion'
      and duenio_iglesia_id is null
      and duenio_distrito_id is null
      and duenio_asociacion_id is not null
    )
  ),

  -- A series always has an end, and only a series has one.
  constraint eventos_fin_de_serie_iff_repeticion check (
    (repeticion = 'ninguna') = (fin_de_serie is null)
  ),

  -- An evento that lasts several days cannot repeat.
  constraint eventos_fecha_fin_excludes_repeticion check (
    fecha_fin is null or repeticion = 'ninguna'
  )
);

-- One row per date of an evento: a single one if it does not repeat, one per
-- occurrence if it is a series. An evento of several days has a single row (its
-- first day) plus eventos.fecha_fin.
create table public.eventos_fechas (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  fecha date not null,
  primary key (evento_id, fecha)
);

-- Iglesias the duenio shares an evento with. They do not become duenio.
create table public.iglesias_sumadas (
  evento_id uuid not null references public.eventos (id) on delete cascade,
  iglesia_id uuid not null references public.iglesias (id) on delete cascade,
  primary key (evento_id, iglesia_id)
);

-- Foreign keys are not indexed automatically. The evento_id of eventos_fechas
-- and of iglesias_sumadas is already covered by their primary keys.
create index eventos_duenio_iglesia_id_idx on public.eventos (duenio_iglesia_id);
create index eventos_duenio_distrito_id_idx on public.eventos (duenio_distrito_id);
create index eventos_duenio_asociacion_id_idx on public.eventos (duenio_asociacion_id);
create index iglesias_sumadas_iglesia_id_idx on public.iglesias_sumadas (iglesia_id);

-- The calendario is read by month: a range of dates across every evento.
create index eventos_fechas_fecha_idx on public.eventos_fechas (fecha);

alter table public.eventos enable row level security;
alter table public.eventos_fechas enable row level security;
alter table public.iglesias_sumadas enable row level security;

-- Explicit read grants, so reading does not depend on the project setting that
-- exposes new tables to the API roles automatically.
grant select on public.eventos, public.eventos_fechas, public.iglesias_sumadas to anon, authenticated;

-- The calendario is public: it is read without a session (the hermano has no login).
create policy "Anyone can read eventos"
  on public.eventos for select
  to anon, authenticated
  using (true);

create policy "Anyone can read eventos_fechas"
  on public.eventos_fechas for select
  to anon, authenticated
  using (true);

create policy "Anyone can read iglesias_sumadas"
  on public.iglesias_sumadas for select
  to anon, authenticated
  using (true);
