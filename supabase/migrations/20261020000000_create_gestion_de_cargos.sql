-- Giving, editing and removing cargos (issue #154), shared by the gestion of the
-- secretaria de iglesia, the pastor and the admin. No screen yet.
--
--   1. The rule of managing a cargo, in SQL: the same as
--      src/features/sesion/dominio/puedeGestionarCargo.ts.
--   2. public.editar_cargo() and public.quitar_cargo(): whoever manages a cargo
--      edits the nombre and the funcion of whoever holds it, or removes it.
--   3. What the server function `invitar` needs and no usuario may call:
--      finding a usuario by their correo, and saving a perfil and a cargo at
--      once.
--
-- The cargos and the perfiles stay closed to direct writes from the app: every
-- write goes through these functions or through the server functions.

-- The rule of managing ---------------------------------------------------------------
-- Whether the usuario who asks manages a cargo, given as its three level columns
-- and its mark of secretaria de iglesia:
--
--   - a cargo on an iglesia that is not a secretaria: a secretaria de iglesia of
--     that iglesia, the pastor of its distrito or the admin of its asociacion;
--   - a secretaria de iglesia: the pastor of its distrito or the admin of its
--     asociacion, never another secretaria;
--   - a cargo on a distrito: the admin of its asociacion;
--   - a cargo on an asociacion: nobody, only the developers.
--
-- Narrower than public.can_read_cargo(): a secretaria reads the other
-- secretarias of her iglesia, but does not manage them.
--
-- Security definer, like public.can_read_cargo(), and for the same reason: as
-- the owner it reads the cargos as they are, and it only answers about the
-- cargos of the usuario of the session (auth.uid()), never taken as an argument.
-- Only the functions below use it: no API role can call it.
create function public.can_manage_cargo(
  cargo_iglesia_id uuid,
  cargo_distrito_id uuid,
  cargo_asociacion_id uuid,
  cargo_es_secretaria boolean
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    num_nonnulls(cargo_iglesia_id, cargo_distrito_id, cargo_asociacion_id) = 1
    and cargo_asociacion_id is null
    and exists (
      select 1
      from public.cargos as gestor
      where gestor.usuario_id = (select auth.uid())
        and (
          -- An encargado of an iglesia: its secretarias.
          (
            gestor.es_secretaria
            and not cargo_es_secretaria
            and gestor.iglesia_id = cargo_iglesia_id
          )
          -- Any cargo on an iglesia: the pastor of its distrito.
          or gestor.distrito_id = (
            select iglesias.distrito_id
            from public.iglesias
            where iglesias.id = cargo_iglesia_id
          )
          -- Any cargo on an iglesia or a distrito: the admin of its asociacion.
          or gestor.asociacion_id = (
            select distritos.asociacion_id
            from public.iglesias
            join public.distritos on distritos.id = iglesias.distrito_id
            where iglesias.id = cargo_iglesia_id
          )
          or gestor.asociacion_id = (
            select distritos.asociacion_id
            from public.distritos
            where distritos.id = cargo_distrito_id
          )
        )
    );
$$;

revoke execute on function public.can_manage_cargo(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;

-- The limits of a nombre and a funcion ------------------------------------------------------
-- The same as the app (src/features/gestion/dominio/invitacion.ts): 100
-- characters for a nombre and 60 for a funcion, once trimmed. Checked here too,
-- because editar_cargo() is called directly with any text.
create function public.check_nombre_y_funcion(nombre text, funcion text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(btrim(check_nombre_y_funcion.nombre)) > 100 then
    raise exception 'The nombre has more than 100 characters' using errcode = '22023';
  end if;
  if char_length(btrim(check_nombre_y_funcion.funcion)) > 60 then
    raise exception 'The funcion has more than 60 characters' using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.check_nombre_y_funcion(text, text) from public, anon, authenticated;
grant execute on function public.check_nombre_y_funcion(text, text) to service_role;

-- Editing a cargo ----------------------------------------------------------------------
-- Changes the funcion of the cargo and the nombre of whoever holds it. A blank
-- funcion is no funcion. A blank nombre is rejected by the perfiles.
--
-- The nombre is their perfil: one per usuario, shown in every cargo they hold.
-- So it changes only when the usuario who asks manages every one of those
-- cargos. Otherwise the same nombre is accepted, and the funcion still changes.
--
-- Security definer: the app has no write privilege on cargos or perfiles. The
-- checks of public.can_manage_cargo() are the whole permission. A cargo that
-- does not exist and one the usuario does not manage answer the same, so the
-- error reveals nothing.
create function public.editar_cargo(cargo_id uuid, nombre text, funcion text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cargo public.cargos;
begin
  select * into cargo from public.cargos where cargos.id = editar_cargo.cargo_id;

  if cargo.id is null
    or not public.can_manage_cargo(
      cargo.iglesia_id, cargo.distrito_id, cargo.asociacion_id, cargo.es_secretaria
    )
  then
    raise exception 'The usuario does not manage this cargo' using errcode = '42501';
  end if;

  perform public.check_nombre_y_funcion(editar_cargo.nombre, editar_cargo.funcion);

  -- A usuario loaded by the developers may have no perfil yet: giving them one
  -- is changing their nombre too.
  if not exists (
      select 1
      from public.perfiles
      where perfiles.usuario_id = cargo.usuario_id
        and perfiles.nombre = btrim(editar_cargo.nombre)
    )
    and exists (
      select 1
      from public.cargos as otro
      where otro.usuario_id = cargo.usuario_id
        and not public.can_manage_cargo(
          otro.iglesia_id, otro.distrito_id, otro.asociacion_id, otro.es_secretaria
        )
    )
  then
    raise exception 'The usuario holds cargos this one does not manage: their nombre cannot change'
      using errcode = '42501';
  end if;

  update public.cargos
  set funcion = nullif(btrim(editar_cargo.funcion), '')
  where cargos.id = cargo.id;

  insert into public.perfiles (usuario_id, nombre)
  values (cargo.usuario_id, btrim(editar_cargo.nombre))
  on conflict on constraint perfiles_pkey do update set nombre = excluded.nombre;
end;
$$;

revoke execute on function public.editar_cargo(uuid, text, text) from public, anon;
grant execute on function public.editar_cargo(uuid, text, text) to authenticated;

-- Removing a cargo ---------------------------------------------------------------------
-- Takes effect at once: every write of an evento reads the cargos again
-- (public.cargos_abarcan_duenio). It never deletes the usuario or their perfil:
-- without cargos, the person is a hermano with the aviso of "sin cargos".
--
-- Security definer, with the same check and the same error as editar_cargo().
create function public.quitar_cargo(cargo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cargo public.cargos;
begin
  select * into cargo from public.cargos where cargos.id = quitar_cargo.cargo_id;

  if cargo.id is null
    or not public.can_manage_cargo(
      cargo.iglesia_id, cargo.distrito_id, cargo.asociacion_id, cargo.es_secretaria
    )
  then
    raise exception 'The usuario does not manage this cargo' using errcode = '42501';
  end if;

  delete from public.cargos where cargos.id = cargo.id;
end;
$$;

revoke execute on function public.quitar_cargo(uuid) from public, anon;
grant execute on function public.quitar_cargo(uuid) to authenticated;

-- For the server function `invitar` only ---------------------------------------------
-- It decides who may give a cargo with puedeGestionarCargo before calling these.
-- Only service_role can execute them: no usuario finds others by correo or
-- writes a cargo directly.

-- The usuario with this correo, or null. The comparison ignores case.
create function public.get_usuario_id_por_correo(correo text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select users.id
  from auth.users
  where lower(users.email) = lower(btrim(get_usuario_id_por_correo.correo));
$$;

revoke execute on function public.get_usuario_id_por_correo(text) from public, anon, authenticated;
grant execute on function public.get_usuario_id_por_correo(text) to service_role;

-- Saves the perfil and the cargo of an invitado, at once. The perfil is created
-- only when the usuario has none: inviting someone who already has an account
-- only adds the cargo, and never renames them, since the gestor may not manage
-- their other cargos. The cargo is never duplicated: inviting the same
-- usuario to the same iglesia or distrito again updates its funcion and its mark
-- of secretaria de iglesia. Returns the id of the cargo.
--
-- Security invoker: service_role, its only caller, writes both tables.
create function public.guardar_cargo_invitado(
  usuario_id uuid,
  nombre text,
  es_secretaria boolean,
  funcion text default null,
  iglesia_id uuid default null,
  distrito_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  guardado uuid;
begin
  perform public.check_nombre_y_funcion(guardar_cargo_invitado.nombre, guardar_cargo_invitado.funcion);

  insert into public.perfiles (usuario_id, nombre)
  values (guardar_cargo_invitado.usuario_id, btrim(guardar_cargo_invitado.nombre))
  on conflict on constraint perfiles_pkey do nothing;

  -- Two invitations at once: the unique indexes of cargos keep one row, and
  -- both end up updating it.
  insert into public.cargos (usuario_id, iglesia_id, distrito_id)
  values (
    guardar_cargo_invitado.usuario_id,
    guardar_cargo_invitado.iglesia_id,
    guardar_cargo_invitado.distrito_id
  )
  on conflict do nothing;

  update public.cargos
  set
    funcion = nullif(btrim(guardar_cargo_invitado.funcion), ''),
    es_secretaria = guardar_cargo_invitado.es_secretaria
  where cargos.usuario_id = guardar_cargo_invitado.usuario_id
    and (
      cargos.iglesia_id = guardar_cargo_invitado.iglesia_id
      or cargos.distrito_id = guardar_cargo_invitado.distrito_id
    )
  returning cargos.id into guardado;

  return guardado;
end;
$$;

revoke execute on function public.guardar_cargo_invitado(uuid, text, boolean, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.guardar_cargo_invitado(uuid, text, boolean, text, uuid, uuid)
  to service_role;
