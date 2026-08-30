-- Renombra perfiles y clima a español.
-- Renombra profiles a perfil y weather_history a historial_clima,
-- incluyendo constraints, indices, trigger, funciones, politicas RLS
-- y el diccionario de datos (tabla_estructura).
-- Idempotente: se puede ejecutar cuantas veces se necesite.

-- ============ 1. Renombrar tablas ============
do $$
begin
  if to_regclass('public.profiles') is not null then
    alter table public.profiles rename to perfil;
  end if;

  if to_regclass('public.weather_history') is not null then
    alter table public.weather_history rename to historial_clima;
  end if;
end $$;

-- ============ 2. Constraints de perfil ============
do $$
begin
  if to_regclass('public.perfil') is not null then
    begin
      alter table public.perfil rename constraint profiles_pkey to perfil_pkey;
    exception when undefined_object then null;
    end;
    begin
      alter table public.perfil rename constraint profiles_id_fkey to perfil_id_fkey;
    exception when undefined_object then null;
    end;
    begin
      alter table public.perfil rename constraint profiles_usuario_key to perfil_usuario_key;
    exception when undefined_object then null;
    end;
    begin
      alter table public.perfil rename constraint profiles_email_key to perfil_email_key;
    exception when undefined_object then null;
    end;
  end if;
end $$;

-- ============ 3. Indices de perfil ============
alter index if exists public.idx_profiles_usuario rename to idx_perfil_usuario;
alter index if exists public.idx_profiles_email rename to idx_perfil_email;
alter index if exists public.idx_profiles_rol_id rename to idx_perfil_rol_id;
alter index if exists public.idx_profiles_estado_usuario_id rename to idx_perfil_estado_usuario_id;
alter index if exists public.idx_profiles_primer_nombre rename to idx_perfil_primer_nombre;
alter index if exists public.idx_profiles_segundo_nombre rename to idx_perfil_segundo_nombre;
alter index if exists public.idx_profiles_primer_apellido rename to idx_perfil_primer_apellido;
alter index if exists public.idx_profiles_segundo_apellido rename to idx_perfil_segundo_apellido;
alter index if exists public.idx_profiles_departamento_id rename to idx_perfil_departamento_id;
alter index if exists public.idx_profiles_municipio_id rename to idx_perfil_municipio_id;

-- ============ 4. Trigger de perfil ============
do $$
begin
  if to_regclass('public.perfil') is not null then
    begin
      alter trigger trg_profiles_updated_at on public.perfil rename to trg_perfil_updated_at;
    exception when undefined_object then null;
    end;
  end if;
end $$;

-- ============ 5. Constraints de historial_clima ============
do $$
begin
  if to_regclass('public.historial_clima') is not null then
    begin
      alter table public.historial_clima rename constraint weather_history_pkey to historial_clima_pkey;
    exception when undefined_object then null;
    end;
    begin
      alter table public.historial_clima rename constraint weather_history_date_key to historial_clima_date_key;
    exception when undefined_object then null;
    end;
  end if;
end $$;

-- ============ 6. Funciones de seguridad (ahora leen de public.perfil) ============
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
  select r.nombre, e.nombre
    into user_role, user_state
  from public.perfil p
  join public.rol r on r.id = p.rol_id
  join public.estado_usuario e on e.id = p.estado_usuario_id
  where p.id = auth.uid();

  return user_state = 'Activo' and user_role in ('Superusuario', 'Administrador');
end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create or replace function public.is_admin_profile()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
  user_state text;
begin
  select r.nombre, e.nombre
    into user_role, user_state
  from public.perfil p
  join public.rol r on r.id = p.rol_id
  join public.estado_usuario e on e.id = p.estado_usuario_id
  where p.id = auth.uid();

  return user_state = 'Activo' and user_role in ('Superusuario', 'Administrador');
end;
$$;

revoke all on function public.is_admin_profile() from public;
grant execute on function public.is_admin_profile() to authenticated;

-- ============ 7. Politicas RLS de perfil ============
drop policy if exists profiles_select_own_or_admin on public.perfil;
drop policy if exists perfil_select_own_or_admin on public.perfil;
create policy perfil_select_own_or_admin
  on public.perfil
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_insert_admin on public.perfil;
drop policy if exists perfil_insert_admin on public.perfil;
create policy perfil_insert_admin
  on public.perfil
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists profiles_update_own_or_admin on public.perfil;
drop policy if exists perfil_update_own_or_admin on public.perfil;
create policy perfil_update_own_or_admin
  on public.perfil
  for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete_admin on public.perfil;
drop policy if exists perfil_delete_admin on public.perfil;
create policy perfil_delete_admin
  on public.perfil
  for delete
  to authenticated
  using (public.is_admin());

-- ============ 8. Politicas RLS de historial_clima ============
drop policy if exists "Authenticated users can read weather history" on public.historial_clima;
drop policy if exists historial_clima_select_authenticated on public.historial_clima;
create policy historial_clima_select_authenticated
  on public.historial_clima
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can upsert weather history" on public.historial_clima;
drop policy if exists historial_clima_insert_authenticated on public.historial_clima;
create policy historial_clima_insert_authenticated
  on public.historial_clima
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can update weather history" on public.historial_clima;
drop policy if exists historial_clima_update_authenticated on public.historial_clima;
create policy historial_clima_update_authenticated
  on public.historial_clima
  for update
  to anon, authenticated
  using (true)
  with check (true);

-- ============ 9. Diccionario de datos ============
update public.tabla_estructura
set nombre_interno = 'perfil',
    nombre_visible = 'Perfil',
    updated_at = now()
where nombre_interno = 'profiles';

update public.tabla_estructura
set nombre_interno = 'historial_clima',
    nombre_visible = 'Historial de Clima',
    updated_at = now()
where nombre_interno = 'weather_history';
