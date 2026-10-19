-- The iglesias a phone follows keep up with what the person can still follow
-- (issue #217). Only the eventos of active iglesias the person can follow are
-- recordados:
--
--   1. An iglesia dada de baja leaves every phone that followed it. Reactivarla
--      does not give it back: whoever wants it chooses it again.
--   2. An iglesia that moves to another distrito leaves the phones of whoever
--      no longer covers it, such as the pastor of the old distrito. The pastor
--      of the new one does not gain it: they choose it in Ajustes.
--   3. A pastor who loses the cargo stops following the iglesias it covered.
--
-- A phone keeps an iglesia while any cargo of its usuario still covers it, the
-- same rule as public.guardar_dispositivo, so an admin, or a pastor who is
-- also its encargado, keeps it. A phone without a usuario, or whose usuario has
-- no cargos (a hermano), follows its iglesia elegida wherever it moves.
--
-- Encargados and secretarias follow the iglesias of their cargos (#162); the
-- app keeps that, and nothing here changes it.
--
-- Security definer: dispositivos_iglesias is closed to the API roles, and the
-- changes that fire these triggers come from the admin (an update of
-- iglesias under its policies) or from security definer functions
-- (dar_de_baja_iglesia, quitar_cargo).

-- Whether the cargos of `usuario_id` cover `iglesia_id`: the iglesia part of
-- public.cargos_abarcan_duenio, which reads the usuario of the session; here
-- it is the usuario of a phone.
create function public.cargos_de_usuario_abarcan_iglesia(usuario_id uuid, iglesia_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.cargos
    join public.iglesias on iglesias.id = cargos_de_usuario_abarcan_iglesia.iglesia_id
    join public.distritos on distritos.id = iglesias.distrito_id
    where cargos.usuario_id = cargos_de_usuario_abarcan_iglesia.usuario_id
      and (
        cargos.iglesia_id = iglesias.id
        or cargos.distrito_id = iglesias.distrito_id
        or cargos.asociacion_id = distritos.asociacion_id
      )
  );
$$;

revoke execute on function public.cargos_de_usuario_abarcan_iglesia(uuid, uuid)
  from public, anon, authenticated;

-- An iglesia dada de baja or moved to another distrito -----------------------------

create function public.quitar_seguidas_de_iglesia()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.de_baja and not old.de_baja then
    delete from public.dispositivos_iglesias where dispositivos_iglesias.iglesia_id = new.id;
  elsif new.distrito_id is distinct from old.distrito_id then
    delete from public.dispositivos_iglesias
    using public.dispositivos
    where dispositivos.id = dispositivos_iglesias.dispositivo_id
      and dispositivos_iglesias.iglesia_id = new.id
      -- Someone with cargos: a hermano keeps their iglesia elegida.
      and exists (select 1 from public.cargos where cargos.usuario_id = dispositivos.usuario_id)
      and not public.cargos_de_usuario_abarcan_iglesia(dispositivos.usuario_id, new.id);
  end if;

  return null;
end;
$$;

revoke execute on function public.quitar_seguidas_de_iglesia() from public, anon, authenticated;

-- After the update, so the cargos are checked against the new distrito.
create trigger iglesias_quitar_seguidas
  after update of de_baja, distrito_id on public.iglesias
  for each row execute function public.quitar_seguidas_de_iglesia();

-- A pastor who loses the cargo -------------------------------------------------------

create function public.quitar_seguidas_de_cargo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Every iglesia of their phones that no cargo left covers, even when none is
  -- left: what they followed, they followed as pastor.
  delete from public.dispositivos_iglesias
  using public.dispositivos
  where dispositivos.id = dispositivos_iglesias.dispositivo_id
    and dispositivos.usuario_id = old.usuario_id
    and not public.cargos_de_usuario_abarcan_iglesia(old.usuario_id, dispositivos_iglesias.iglesia_id);

  return null;
end;
$$;

revoke execute on function public.quitar_seguidas_de_cargo() from public, anon, authenticated;

create trigger cargos_quitar_seguidas_al_borrar
  after delete on public.cargos
  for each row
  when (old.distrito_id is not null)
  execute function public.quitar_seguidas_de_cargo();

create trigger cargos_quitar_seguidas_al_cambiar
  after update of usuario_id, iglesia_id, distrito_id, asociacion_id on public.cargos
  for each row
  when (old.distrito_id is not null)
  execute function public.quitar_seguidas_de_cargo();
