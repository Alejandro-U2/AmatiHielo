-- Migración 051: Tablas de Catálogos para Auditoría de Inventario
-- AMATI HIELO

-- 1. Catálogo de Categorías de Inventario: Asegurar todas las categorías reales
insert into public.catalogo_categoria_inventario (codigo, nombre, descripcion, activo, es_sistema, orden)
values 
  ('MP', 'Materia Prima', 'Insumos principales utilizados en producción de hielo.', true, true, 1),
  ('SUM', 'Suministros', 'Materiales de apoyo y empaques (bolsas, sellos, etc.).', true, true, 2),
  ('PT', 'Producto Terminado', 'Hielo procesado, bolsas y barras listas para venta.', true, true, 3)
on conflict (codigo) do update set 
  nombre = excluded.nombre, 
  descripcion = excluded.descripcion,
  activo = true;

-- 2. Catálogo de Estados de Auditoría
create table if not exists public.catalogo_auditoria_estado (
  id integer primary key,
  codigo text not null unique,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  orden integer not null default 0
);

insert into public.catalogo_auditoria_estado (id, codigo, nombre, descripcion, activo, orden)
values
  (1, 'BORRADOR', 'Borrador', 'Auditoría configurada pero sin captura física iniciada', true, 1),
  (2, 'EN_CONTEO', 'En conteo', 'Captura física de existencias en progreso', true, 2),
  (3, 'EN_REVISION', 'En revisión', 'Conteo finalizado y conciliación de diferencias activa', true, 3),
  (4, 'PENDIENTE_APROBACION', 'Pendiente de aprobación', 'Diferencias registradas pendientes de autorización', true, 4),
  (5, 'CERRADA', 'Cerrada', 'Auditoría formalmente finalizada y bloqueada', true, 5),
  (6, 'CANCELADA', 'Cancelada', 'Auditoría cancelada o anulada', true, 6)
on conflict (id) do update set
  codigo = excluded.codigo,
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  orden = excluded.orden;

-- 3. Catálogo de Tipos de Alcance de Auditoría
create table if not exists public.catalogo_auditoria_tipo_alcance (
  id integer primary key,
  codigo text not null unique,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  orden integer not null default 0
);

insert into public.catalogo_auditoria_tipo_alcance (id, codigo, nombre, descripcion, activo, orden)
values
  (1, 'TODO', 'Todo el inventario', 'Audita la totalidad de artículos del catálogo activo', true, 1),
  (2, 'CATEGORIA', 'Por categoría', 'Auditoría filtrada por una o más categorías de inventario', true, 2),
  (3, 'ESPECIFICO', 'Productos específicos', 'Auditoría focalizada en artículos seleccionados manualmente', true, 3)
on conflict (id) do update set
  codigo = excluded.codigo,
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  orden = excluded.orden;

-- Habilitar permisos RLS
alter table public.catalogo_auditoria_estado enable row level security;
alter table public.catalogo_auditoria_tipo_alcance enable row level security;

create policy "Lectura publica o autenticada de catalogo_auditoria_estado" 
  on public.catalogo_auditoria_estado for select 
  using (true);

create policy "Lectura publica o autenticada de catalogo_auditoria_tipo_alcance" 
  on public.catalogo_auditoria_tipo_alcance for select 
  using (true);
