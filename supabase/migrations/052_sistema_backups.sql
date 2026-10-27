-- Migración 052: Sistema de Copias de Seguridad (Backups) Automáticas y Manuales
-- AMATI HIELO ERP

-- 1. Tabla de configuración de backups automáticos
create table if not exists public.sistema_backup_config (
  id integer primary key default 1,
  activo boolean not null default true,
  frecuencia text not null default 'diario' check (frecuencia in ('diario', 'semanal', 'mensual')),
  hora text not null default '23:30',
  dia_semana integer not null default 0 check (dia_semana between 0 and 6),
  dia_mes integer not null default 1 check (dia_mes between 1 and 31),
  dias_retencion integer not null default 30 check (dias_retencion >= 1),
  incluir_archivos boolean not null default false,
  notificar_email boolean not null default false,
  email_destino text default '',
  ultimo_backup_at timestamptz,
  proximo_backup_at timestamptz,
  updated_at timestamptz default now(),
  updated_by text default 'Sistema'
);

-- Asegurar registro único de configuración
insert into public.sistema_backup_config (
  id, activo, frecuencia, hora, dia_semana, dia_mes, dias_retencion, updated_by
)
values (1, true, 'diario', '23:30', 0, 1, 30, 'Sistema')
on conflict (id) do nothing;

-- 2. Tabla de historial de backups generados
create table if not exists public.sistema_backup_historial (
  id serial primary key,
  nombre_archivo text not null,
  tipo text not null default 'manual' check (tipo in ('manual', 'automatico')),
  tamano_bytes bigint not null default 0,
  estado text not null default 'completado' check (estado in ('completado', 'error', 'en_proceso')),
  total_tablas integer not null default 0,
  total_registros integer not null default 0,
  formato text not null default 'json_gz',
  checksum text,
  storage_path text,
  error_mensaje text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by text not null default 'Sistema'
);

create index if not exists idx_sistema_backup_historial_created_at
  on public.sistema_backup_historial(created_at desc);

-- 3. Habilitar RLS
alter table public.sistema_backup_config enable row level security;
alter table public.sistema_backup_historial enable row level security;

-- Políticas permisivas para servicio backend autenticado
create policy "Acceso completo a sistema_backup_config para service_role y auth"
  on public.sistema_backup_config
  for all
  using (true)
  with check (true);

create policy "Acceso completo a sistema_backup_historial para service_role y auth"
  on public.sistema_backup_historial
  for all
  using (true)
  with check (true);
