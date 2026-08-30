create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  user_state text;
begin
  select rol, estado
    into user_role, user_state
  from public.profiles
  where id = auth.uid();

  return user_state = 'Activo' and user_role in ('Superusuario', 'Administrador');
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin
  on public.profiles
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin
  on public.profiles
  for delete
  to authenticated
  using (public.is_admin());
