-- Cargos and the write permissions of the eventos.
--
-- A cargo assigns a usuario to one concrete level: encargado of an iglesia,
-- pastor of a distrito or admin of an asociacion. It covers that level and
-- everything that depends on it, never what is above it or beside it. A usuario
-- can write an evento only when one of their cargos covers its duenio.
--
-- The usuarios are the rows of auth.users, which the API does not expose: there
-- is no table of usuarios here, so names and emails cannot be read by the app,
-- with or without a session.
--
-- The developers load the cargos from the data of the asociacion, like the
-- structure. The app only reads them, and each usuario only their own.

create table public.cargos (
  id uuid primary key default gen_random_uuid(),
  -- Deleting a usuario ("Eliminar mi cuenta") takes their cargos with it.
  usuario_id uuid not null references auth.users (id) on delete cascade,
  -- The level of the cargo. One column per level, like the duenio of an evento,
  -- so each one keeps a real foreign key.
  iglesia_id uuid references public.iglesias (id),
  distrito_id uuid references public.distritos (id),
  asociacion_id uuid references public.asociaciones (id),

  -- A cargo is on exactly one level. A usuario with two levels has two cargos.
  constraint cargos_exactly_one_nivel check (
    num_nonnulls(iglesia_id, distrito_id, asociacion_id) = 1
  )
);

-- The same usuario cannot hold the same cargo twice. Partial, because a plain
-- unique index treats the nulls of the other two levels as different values.
-- The level goes first, so these also serve as the index of its foreign key.
create unique index cargos_iglesia_id_usuario_id_key
  on public.cargos (iglesia_id, usuario_id) where iglesia_id is not null;
create unique index cargos_distrito_id_usuario_id_key
  on public.cargos (distrito_id, usuario_id) where distrito_id is not null;
create unique index cargos_asociacion_id_usuario_id_key
  on public.cargos (asociacion_id, usuario_id) where asociacion_id is not null;

-- Every write of an evento looks for the cargos of one usuario.
create index cargos_usuario_id_idx on public.cargos (usuario_id);

alter table public.cargos enable row level security;

-- Supabase gives every privilege on a new table to the API roles by default.
-- For cargos that default is taken away instead of trusted: without a session
-- there is no privilege at all, so reading is an error and not an empty result,
-- and with a session the only one is reading.
revoke all on public.cargos from anon, authenticated;
grant select on public.cargos to authenticated;

-- No insert, update or delete policy: the app cannot give, change or remove a
-- cargo, not even one of the usuario who asks.
create policy "Usuarios can read their own cargos"
  on public.cargos for select
  to authenticated
  using (usuario_id = (select auth.uid()));

-- The rule, written once: whether a cargo of the usuario who asks covers a
-- duenio, given as the three duenio columns of an evento.
--
-- It reads public.cargos on every call. The session only says who the usuario
-- is (auth.uid()); which cargos they hold is never taken from it, so removing a
-- cargo blocks the next write, without waiting for the session to expire.
--
-- Security invoker: it runs with the permissions of the usuario, who can read
-- the structure and their own cargos, which is all the rule needs.
create function public.cargos_abarcan_duenio(
  duenio_iglesia_id uuid,
  duenio_distrito_id uuid,
  duenio_asociacion_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select
    -- A duenio is exactly one level. eventos has a constraint for it, but the
    -- answer must not depend on which of the two is checked first.
    num_nonnulls(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id) = 1
    and exists (
      select 1
      from public.cargos
      where cargos.usuario_id = (select auth.uid())
        and (
          -- An iglesia: its encargado, the pastor of its distrito or the admin
          -- of the asociacion of its distrito.
          cargos.iglesia_id = duenio_iglesia_id
          or cargos.distrito_id = (
            select iglesias.distrito_id
            from public.iglesias
            where iglesias.id = duenio_iglesia_id
          )
          or cargos.asociacion_id = (
            select distritos.asociacion_id
            from public.iglesias
            join public.distritos on distritos.id = iglesias.distrito_id
            where iglesias.id = duenio_iglesia_id
          )
          -- A distrito: its pastor or the admin of its asociacion.
          or cargos.distrito_id = duenio_distrito_id
          or cargos.asociacion_id = (
            select distritos.asociacion_id
            from public.distritos
            where distritos.id = duenio_distrito_id
          )
          -- An asociacion: its admin.
          or cargos.asociacion_id = duenio_asociacion_id
        )
    );
$$;

-- A function is executable by everyone by default, and Supabase also grants it
-- to the API roles one by one.
revoke execute on function public.cargos_abarcan_duenio(uuid, uuid, uuid) from public, anon;
grant execute on function public.cargos_abarcan_duenio(uuid, uuid, uuid) to authenticated;

-- Write permissions of the eventos -------------------------------------------------
-- Reading stays public. Writing needs a session, and a cargo that covers the
-- duenio. Explicit grants, so writing does not depend on the project setting
-- that exposes new tables to the API roles automatically.
--
-- iglesias_sumadas stays read-only until sharing an evento is built.

grant insert, update, delete on public.eventos, public.eventos_fechas to authenticated;

create policy "Usuarios can insert eventos their cargos cover"
  on public.eventos for insert
  to authenticated
  with check (
    public.cargos_abarcan_duenio(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id)
  );

-- `using` looks at the evento as it is and `with check` at the evento as it
-- would be: the duenio can change, but only between levels the cargos cover.
create policy "Usuarios can update eventos their cargos cover"
  on public.eventos for update
  to authenticated
  using (
    public.cargos_abarcan_duenio(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id)
  )
  with check (
    public.cargos_abarcan_duenio(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id)
  );

create policy "Usuarios can delete eventos their cargos cover"
  on public.eventos for delete
  to authenticated
  using (
    public.cargos_abarcan_duenio(duenio_iglesia_id, duenio_distrito_id, duenio_asociacion_id)
  );

-- The dates of an evento are written by whoever can write the evento: the
-- duenio that decides is the one of the evento they belong to.

create policy "Usuarios can insert eventos_fechas their cargos cover"
  on public.eventos_fechas for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.eventos
      where eventos.id = eventos_fechas.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );

-- `with check` keeps a date from being handed to an evento the cargos do not
-- cover.
create policy "Usuarios can update eventos_fechas their cargos cover"
  on public.eventos_fechas for update
  to authenticated
  using (
    exists (
      select 1
      from public.eventos
      where eventos.id = eventos_fechas.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  )
  with check (
    exists (
      select 1
      from public.eventos
      where eventos.id = eventos_fechas.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );

create policy "Usuarios can delete eventos_fechas their cargos cover"
  on public.eventos_fechas for delete
  to authenticated
  using (
    exists (
      select 1
      from public.eventos
      where eventos.id = eventos_fechas.evento_id
        and public.cargos_abarcan_duenio(
          eventos.duenio_iglesia_id, eventos.duenio_distrito_id, eventos.duenio_asociacion_id
        )
    )
  );
