create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null,
  usuario text not null unique,
  email text not null unique,
  rol text not null default 'Operario',
  estado text not null default 'Activo',
  ultimo_acceso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_usuario on public.profiles (usuario);
create index if not exists idx_profiles_email on public.profiles (email);
create index if not exists idx_profiles_rol on public.profiles (rol);
create index if not exists idx_profiles_estado on public.profiles (estado);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
