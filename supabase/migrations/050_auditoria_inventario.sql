-- Migración 050: Estructura para Auditoría de Inventario y Conciliación
-- AMATI HIELO

create table if not exists public.auditoria_inventario (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  periodo_mes integer not null check (periodo_mes between 1 and 12),
  periodo_anio integer not null check (periodo_anio between 2020 and 2100),
  fecha_corte date not null,
  responsable_id text,
  responsable_nombre text not null,
  responsable_rol text,
  descripcion text,
  tipo_alcance text not null check (tipo_alcance in ('TODO', 'CATEGORIA', 'ESPECIFICO')),
  alcance_config jsonb not null default '{}'::jsonb,
  estado text not null check (estado in ('Borrador', 'En conteo', 'En revisión', 'Pendiente de aprobación', 'Cerrada', 'Cancelada')) default 'Borrador',
  iniciado_at timestamptz,
  iniciado_por text,
  enviado_revision_at timestamptz,
  enviado_revision_por text,
  cerrado_at timestamptz,
  cerrado_por text,
  resumen_final jsonb default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auditoria_inventario_periodo 
  on public.auditoria_inventario(periodo_anio, periodo_mes);

create index if not exists idx_auditoria_inventario_estado 
  on public.auditoria_inventario(estado);

create index if not exists idx_auditoria_inventario_fecha_corte 
  on public.auditoria_inventario(fecha_corte);

create table if not exists public.auditoria_inventario_detalle (
  id bigint generated always as identity primary key,
  auditoria_id bigint not null references public.auditoria_inventario(id) on delete cascade,
  producto_id bigint not null references public.producto(id),
  codigo_producto text not null,
  nombre_producto text not null,
  categoria text not null,
  unidad_medida text not null,
  presentacion text,
  ubicacion text default 'Bodega Principal',
  stock_teorico numeric(12,2) not null default 0,
  stock_fisico numeric(12,2),
  diferencia numeric(12,2),
  costo_unitario numeric(12,2) not null default 0,
  impacto_economico numeric(12,2) default 0,
  motivo text,
  justificacion text,
  estado_conteo text not null check (estado_conteo in ('Pendiente', 'Contado')) default 'Pendiente',
  estado_diferencia text not null check (
    estado_diferencia in (
      'Conciliado',
      'Pendiente de investigar',
      'En investigación',
      'Justificada sin ajuste',
      'Requiere reconteo',
      'Requiere ajuste',
      'Ajustado',
      'Resuelta'
    )
  ) default 'Conciliado',
  contado_por text,
  contado_at timestamptz,
  historial_conteos jsonb not null default '[]'::jsonb,
  ajuste_aprobado boolean not null default false,
  ajuste_aprobado_por text,
  ajuste_aprobado_at timestamptz,
  ajuste_movimiento_id bigint references public.movimiento_inventario(id) on delete set null,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auditoria_detalle_auditoria_id 
  on public.auditoria_inventario_detalle(auditoria_id);

create index if not exists idx_auditoria_detalle_producto_id 
  on public.auditoria_inventario_detalle(producto_id);

create index if not exists idx_auditoria_detalle_estado_diferencia 
  on public.auditoria_inventario_detalle(estado_diferencia);

-- Habilitar RLS si aplica
alter table public.auditoria_inventario enable row level security;
alter table public.auditoria_inventario_detalle enable row level security;

-- Políticas permisivas para usuarios autenticados
create policy "Acceso completo a auditoria_inventario para autenticados" 
  on public.auditoria_inventario for all 
  using (auth.role() = 'authenticated') 
  with check (auth.role() = 'authenticated');

create policy "Acceso completo a auditoria_inventario_detalle para autenticados" 
  on public.auditoria_inventario_detalle for all 
  using (auth.role() = 'authenticated') 
  with check (auth.role() = 'authenticated');

comment on table public.auditoria_inventario is 'Registro de cabeceras de auditorías periódicas de existencias físicas';
comment on table public.auditoria_inventario_detalle is 'Detalle de conteo físico, conciliación y ajustes por artículo auditado';
