-- The admin writes the distritos and the iglesias of their asociacion.
--
-- Until now the structure was only loaded by the developers. The admin of the
-- asociacion now creates and edits its distritos (the nombre) and its iglesias
-- (nombre, direccion, localidad and distrito). Nobody else writes them: not the
-- pastor, not the encargado, and nothing without a session.
--
-- Moving an iglesia to another distrito is an update of its distrito_id. Nothing
-- else needs to change: the calendario, the eventos de distrito it sees and the
-- pastor that covers it are all read from distrito_id on every query
-- (public.cargos_abarcan_duenio), and its eventos, lugares and cargos point at
-- the iglesia, which stays the same row.
--
-- The privileges are per column, so the rest of each table stays closed to the
-- app: the asociacion of a distrito never changes, and the coordinates and the
-- mark excluida_del_buscador of an iglesia are still loaded by the developers
-- (#54). There is no delete: dar de baja is another ticket (#159).

-- Never blank: a distrito or an iglesia with nothing to show in a list.
alter table public.distritos
  add constraint distritos_nombre_not_blank check (btrim(nombre) <> '');

alter table public.iglesias
  add constraint iglesias_nombre_not_blank check (btrim(nombre) <> ''),
  add constraint iglesias_direccion_not_blank check (btrim(direccion) <> ''),
  add constraint iglesias_localidad_not_blank check (btrim(localidad) <> '');

-- The rule, written once: whether the usuario who asks is admin of the
-- asociacion.
--
-- It reads public.cargos on every call, like public.cargos_abarcan_duenio:
-- removing the cargo blocks the next write.
--
-- Security invoker: the usuario reads their own cargos, which is all the rule
-- needs.
create function public.cargos_administran_asociacion(asociacion_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from public.cargos
    where cargos.usuario_id = (select auth.uid())
      and cargos.asociacion_id = cargos_administran_asociacion.asociacion_id
  );
$$;

-- A function is executable by everyone by default, and Supabase also grants it
-- to the API roles one by one.
revoke execute on function public.cargos_administran_asociacion(uuid) from public, anon;
grant execute on function public.cargos_administran_asociacion(uuid) to authenticated;

-- Privileges --------------------------------------------------------------------
-- Only with a session, and only these columns. The id takes its default.

grant insert (asociacion_id, nombre), update (nombre) on public.distritos to authenticated;

grant insert (distrito_id, nombre, direccion, localidad),
  update (distrito_id, nombre, direccion, localidad)
  on public.iglesias to authenticated;

-- Distritos ------------------------------------------------------------------------

create policy "Admins can insert distritos of their asociacion"
  on public.distritos for insert
  to authenticated
  with check (public.cargos_administran_asociacion(asociacion_id));

create policy "Admins can update distritos of their asociacion"
  on public.distritos for update
  to authenticated
  using (public.cargos_administran_asociacion(asociacion_id))
  with check (public.cargos_administran_asociacion(asociacion_id));

-- Iglesias -------------------------------------------------------------------------
-- The asociacion of an iglesia is the one of its distrito.

create policy "Admins can insert iglesias of their asociacion"
  on public.iglesias for insert
  to authenticated
  with check (
    public.cargos_administran_asociacion(
      (select distritos.asociacion_id from public.distritos where distritos.id = distrito_id)
    )
  );

-- `using` looks at the distrito the iglesia is in and `with check` at the one it
-- moves to: the admin moves it only between distritos of their asociacion.
create policy "Admins can update iglesias of their asociacion"
  on public.iglesias for update
  to authenticated
  using (
    public.cargos_administran_asociacion(
      (select distritos.asociacion_id from public.distritos where distritos.id = distrito_id)
    )
  )
  with check (
    public.cargos_administran_asociacion(
      (select distritos.asociacion_id from public.distritos where distritos.id = distrito_id)
    )
  );
