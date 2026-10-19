-- Perfiles, the secretaria de iglesia, and who reads the cargos they manage.
--
-- The base of the gestion of cargos, with no screen or server function yet:
--
--   1. A perfil per usuario, with the nombre the gestion shows.
--   2. The funcion of a cargo ("Secretaria", "Tesorero", "Anciano"…), free text
--      the gestion shows. It decides nothing.
--   3. The mark of secretaria de iglesia on a cargo on an iglesia: an encargado
--      that also gives, edits and removes the encargados of that iglesia. An
--      iglesia can have several, all equivalent.
--   4. Reading the perfiles, emails and cargos of others, by who manages them:
--      a secretaria de iglesia reads those of her iglesia, a pastor those of the
--      iglesias of their distrito and an admin all of their asociacion. Every
--      usuario still reads their own. Without a session nothing is read.
--
-- The emails live in auth.users, which the API does not expose. They are read
-- only through public.get_usuario_emails(), which applies the same rule.
--
-- Writing stays closed: the cargos and the perfiles are still loaded by the
-- developers, until the server function of the gestion exists.

-- The funcion and the secretaria de iglesia -----------------------------------------
-- Added to cargos without touching what is already there:
-- public.cargos_abarcan_duenio does not read either column, so a secretaria
-- writes the eventos of her iglesia because she is an encargado of it.

alter table public.cargos
  add column funcion text,
  add column es_secretaria boolean not null default false,
  -- Optional, but never blank: a funcion with nothing to show is a null.
  add constraint cargos_funcion_not_blank check (funcion is null or btrim(funcion) <> ''),
  -- A secretaria de iglesia is a cargo on an iglesia, never on a distrito or an
  -- asociacion.
  add constraint cargos_secretaria_only_on_iglesia check (not es_secretaria or iglesia_id is not null);

-- Perfiles ------------------------------------------------------------------------

create table public.perfiles (
  -- One per usuario. Deleting a usuario takes it too, also through
  -- public.delete_own_usuario() ("Eliminar mi cuenta"), whose comment predates
  -- the perfiles and lists only the cargos.
  usuario_id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,

  constraint perfiles_nombre_not_blank check (btrim(nombre) <> '')
);

alter table public.perfiles enable row level security;

-- A new table starts with no privilege for the API roles
-- (20261014000000_revoke_default_table_privileges.sql). Without a session there
-- is none, so reading is an error and not an empty result, and with a session
-- the only one is reading.
grant select on public.perfiles to authenticated;

-- The rule of reading ----------------------------------------------------------------
-- Whether the usuario who asks reads a cargo, given as its three level columns:
--
--   - a cargo on an iglesia: a secretaria de iglesia of that iglesia, the pastor
--     of its distrito or the admin of its asociacion;
--   - a cargo on a distrito: the admin of its asociacion;
--   - a cargo on an asociacion: its admin.
--
-- Reading is wider than managing: a secretaria reads the other secretarias of
-- her iglesia and an admin reads the other admins, though neither manages them
-- (src/features/sesion/dominio/puedeGestionarCargo.ts).
--
-- Security definer: it is used by a policy of cargos and reads cargos, which
-- with the permissions of the usuario would apply that same policy again,
-- without end. As the owner it reads the cargos as they are. It only answers
-- about the cargos of the usuario of the session (auth.uid()), which it never
-- takes as an argument, so it reveals nothing about anyone else.
create function public.can_read_cargo(
  cargo_iglesia_id uuid,
  cargo_distrito_id uuid,
  cargo_asociacion_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    -- A cargo is exactly one level. cargos has a constraint for it, but the
    -- answer must not depend on which of the two is checked first.
    num_nonnulls(cargo_iglesia_id, cargo_distrito_id, cargo_asociacion_id) = 1
    and exists (
      select 1
      from public.cargos as gestor
      where gestor.usuario_id = (select auth.uid())
        and (
          -- An iglesia: its secretarias, the pastor of its distrito or the
          -- admin of the asociacion of its distrito.
          (gestor.es_secretaria and gestor.iglesia_id = cargo_iglesia_id)
          or gestor.distrito_id = (
            select iglesias.distrito_id
            from public.iglesias
            where iglesias.id = cargo_iglesia_id
          )
          or gestor.asociacion_id = (
            select distritos.asociacion_id
            from public.iglesias
            join public.distritos on distritos.id = iglesias.distrito_id
            where iglesias.id = cargo_iglesia_id
          )
          -- A distrito: the admin of its asociacion.
          or gestor.asociacion_id = (
            select distritos.asociacion_id
            from public.distritos
            where distritos.id = cargo_distrito_id
          )
          -- An asociacion: its admin.
          or gestor.asociacion_id = cargo_asociacion_id
        )
    );
$$;

revoke execute on function public.can_read_cargo(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_read_cargo(uuid, uuid, uuid) to authenticated;

-- Reading the cargos -------------------------------------------------------------------
-- Next to "Usuarios can read their own cargos": a row is read when either one
-- allows it. So a gestor reads more cargos than the ones they hold, and the app
-- reads their own by filtering by the usuario (getCargosDelUsuario).

create policy "Gestores can read the cargos they oversee"
  on public.cargos for select
  to authenticated
  using (public.can_read_cargo(iglesia_id, distrito_id, asociacion_id));

-- Reading the perfiles ---------------------------------------------------------------
-- A perfil is read by its usuario and by whoever reads one of their cargos. A
-- usuario with two cargos is read through either: the gestion shows who holds
-- the cargo, and that is the same person in both.

create policy "Usuarios can read their own perfil"
  on public.perfiles for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "Gestores can read the perfiles of the cargos they oversee"
  on public.perfiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.cargos
      where cargos.usuario_id = perfiles.usuario_id
        and public.can_read_cargo(cargos.iglesia_id, cargos.distrito_id, cargos.asociacion_id)
    )
  );

-- Reading the emails -----------------------------------------------------------------
-- The emails of the usuarios the one who asks can read, by the rule of the
-- perfiles: their own, and those of whoever holds a cargo they read.
--
-- Security definer, because only the owner can read auth.users, and the API
-- keeps not exposing that table. The filter is the whole permission: it takes
-- no argument, and the usuario is always the one of the session.
create function public.get_usuario_emails()
returns table (usuario_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select users.id, users.email::text
  from auth.users
  where users.id = (select auth.uid())
    or exists (
      select 1
      from public.cargos
      where cargos.usuario_id = users.id
        and public.can_read_cargo(cargos.iglesia_id, cargos.distrito_id, cargos.asociacion_id)
    );
$$;

revoke execute on function public.get_usuario_emails() from public, anon;
grant execute on function public.get_usuario_emails() to authenticated;
