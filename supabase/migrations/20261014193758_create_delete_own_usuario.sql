-- "Eliminar mi cuenta": a usuario deletes themselves from the app.
--
-- The app cannot touch auth.users, so the deletion is a function that runs with
-- the permissions of its owner (security definer). It takes no argument: the
-- usuario it deletes is always the one of the session (auth.uid()), so nobody
-- can delete somebody else through it.
--
-- What goes with the usuario: their cargos (on delete cascade in cargos) and
-- what the auth schema keeps for them (identities, sessions and refresh tokens,
-- which cascade there too). What stays: the eventos they loaded. An evento
-- belongs to its duenio (an iglesia, a distrito or an asociacion), not to the
-- person who loaded it, and nothing in public.eventos points to auth.users.

create function public.delete_own_usuario()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'There is no usuario signed in' using errcode = '42501';
  end if;

  -- A usuario already deleted whose token has not expired yet deletes nobody.
  delete from auth.users where id = caller;
end;
$$;

-- A function is executable by everyone by default, and Supabase also grants it
-- to the API roles one by one. Only a session can call this one.
revoke execute on function public.delete_own_usuario() from public, anon;
grant execute on function public.delete_own_usuario() to authenticated;
