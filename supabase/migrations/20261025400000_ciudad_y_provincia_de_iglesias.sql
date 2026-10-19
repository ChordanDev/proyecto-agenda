-- The localidad of an iglesia becomes its ciudad and its provincia, and the
-- admin places it on a map (#219).
--
-- Ciudad and provincia: the existing localidad is split at its last comma,
-- "Villa Mercedes, San Luis" into ciudad "Villa Mercedes" and provincia
-- "San Luis". A localidad that cannot be split that way (no comma, or an empty
-- side) keeps all of it as the ciudad and has no provincia: a null provincia is
-- the mark of an iglesia to fix by hand, from "Editar iglesia", which asks for
-- it. They are listed with:
--
--   select id, nombre, ciudad from public.iglesias where provincia is null;
--
-- A new iglesia always has a provincia, and one that has it never loses it.
--
-- Coordinates: until now only the developers loaded them (#54). The admin now
-- sets them with the marker of the map in "Nueva iglesia" and "Editar
-- iglesia", so the column privileges of the admin
-- (20261022100000_write_distritos_e_iglesias.sql) extend to ciudad, provincia,
-- latitud and longitud. The policies stay the same: only the admin of the
-- asociacion writes its iglesias. An iglesia can still lack coordinates until
-- the script of #166 loads them.

alter table public.iglesias
  add column ciudad text,
  add column provincia text;

update public.iglesias
set
  ciudad = case when partes.separable then partes.ciudad else btrim(iglesias.localidad) end,
  provincia = case when partes.separable then partes.provincia end
from (
  select
    id,
    btrim(substring(localidad from '^(.*),')) as ciudad,
    btrim(substring(localidad from ',([^,]*)$')) as provincia,
    coalesce(
      btrim(substring(localidad from '^(.*),')) <> ''
        and btrim(substring(localidad from ',([^,]*)$')) <> '',
      false
    ) as separable
  from public.iglesias
) as partes
where partes.id = iglesias.id;

alter table public.iglesias
  alter column ciudad set not null,
  add constraint iglesias_ciudad_not_blank check (btrim(ciudad) <> ''),
  add constraint iglesias_provincia_not_blank check (provincia is null or btrim(provincia) <> ''),
  -- Drops iglesias_localidad_not_blank and the privileges on the column too.
  drop column localidad;

comment on column public.iglesias.provincia is
  'Null only on an iglesia whose localidad could not be split into ciudad and provincia: it is fixed by hand from "Editar iglesia".';

-- Null is only the mark of the iglesias that came from a localidad: a new
-- iglesia needs a provincia, and an edit cannot take it away. An edit of
-- something else (its coordinates, its baja) keeps working on a marked one.
create function public.iglesias_require_provincia()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.provincia is null and (tg_op = 'INSERT' or old.provincia is not null) then
    raise exception 'An iglesia needs a provincia'
      using errcode = '23502', column = 'provincia', table = 'iglesias';
  end if;

  return new;
end;
$$;

revoke execute on function public.iglesias_require_provincia() from public, anon, authenticated;

create trigger iglesias_require_provincia
  before insert or update of provincia on public.iglesias
  for each row
  execute function public.iglesias_require_provincia();

-- Privileges --------------------------------------------------------------------
-- Added to those of 20261022100000_write_distritos_e_iglesias.sql: the
-- direccion, the ciudad, the provincia and the point of the marker are saved
-- together.

grant insert (ciudad, provincia, latitud, longitud),
  update (ciudad, provincia, latitud, longitud)
  on public.iglesias to authenticated;
