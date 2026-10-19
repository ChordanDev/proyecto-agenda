-- The gestion of the pastor (issue #157): naming and removing a secretaria de
-- iglesia from the form of an encargado.
--
-- public.editar_cargo() takes the mark of secretaria de iglesia too. A null mark
-- leaves it as it is, so the gestion of the secretaria, which never sends it,
-- keeps working. Changing it follows the rule of managing with the mark the
-- cargo would have: the pastor of the distrito and the admin of the asociacion
-- name and remove secretarias, a secretaria never does
-- (src/features/sesion/dominio/puedeGestionarCargo.ts).
--
-- Adding a new encargado as secretaria needs nothing here: the server function
-- `invitar` already takes the mark and decides with the same rule.

drop function public.editar_cargo(uuid, text, text);

-- Changes the funcion of the cargo, the nombre of whoever holds it and, when it
-- is not null, its mark of secretaria de iglesia. A blank funcion is no funcion.
-- A blank nombre is rejected by the perfiles.
--
-- The nombre is their perfil: one per usuario, shown in every cargo they hold.
-- So it changes only when the usuario who asks manages every one of those
-- cargos. Otherwise the same nombre is accepted, and the funcion still changes.
--
-- Security definer: the app has no write privilege on cargos or perfiles. The
-- checks of public.can_manage_cargo() are the whole permission. A cargo that
-- does not exist, one the usuario does not manage and a mark they cannot give
-- answer the same, so the error reveals nothing.
create function public.editar_cargo(
  cargo_id uuid,
  nombre text,
  funcion text default null,
  es_secretaria boolean default null
)
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

  -- Changing the mark is managing the cargo it turns into as well: only a cargo
  -- on an iglesia can be a secretaria de iglesia.
  if editar_cargo.es_secretaria is not null
    and editar_cargo.es_secretaria <> cargo.es_secretaria
    and (
      cargo.iglesia_id is null
      or not public.can_manage_cargo(cargo.iglesia_id, null, null, editar_cargo.es_secretaria)
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
  set
    funcion = nullif(btrim(editar_cargo.funcion), ''),
    es_secretaria = coalesce(editar_cargo.es_secretaria, cargos.es_secretaria)
  where cargos.id = cargo.id;

  insert into public.perfiles (usuario_id, nombre)
  values (cargo.usuario_id, btrim(editar_cargo.nombre))
  on conflict on constraint perfiles_pkey do update set nombre = excluded.nombre;
end;
$$;

revoke execute on function public.editar_cargo(uuid, text, text, boolean) from public, anon;
grant execute on function public.editar_cargo(uuid, text, text, boolean) to authenticated;
