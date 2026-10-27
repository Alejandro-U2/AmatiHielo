import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const OUTPUT_DIR = path.resolve('data/backups/schema_dumps');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'database_schema_backup_amati_hielo.sql');
const OUTPUT_GZ = path.join(OUTPUT_DIR, 'database_schema_backup_amati_hielo.sql.gz');

const FULL_SCHEMA = `-- ==============================================================================
-- AMATI HIELO - RESPALDO INTEGRAL DE ESTRUCTURA DE BASE DE DATOS (SCHEMA-ONLY DDL)
-- Sistema: ERP AMATI HIELO
-- Motor: PostgreSQL 15+ / Supabase
-- Total de Tablas: 46 tablas (100% de la arquitectura operativa del sistema)
-- Modo: Solo Estructuras (Sin Datos / Schema-Only Dump)
-- Fecha de Generación: 27 de Octubre de 2026
-- ==============================================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. FUNCIONES BASE DEL SISTEMA Y SEGURIDAD
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.perfil p
    join public.rol r on r.id = p.rol_id
    where p.id = auth.uid()
      and r.nombre in ('Superusuario', 'Administrador')
  );
$$;

create or replace function public.is_admin_profile()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from public.perfil p
    join public.rol r on r.id = p.rol_id
    where p.id = auth.uid()
      and r.nombre in ('Superusuario', 'Administrador')
  );
$$;

-- ==============================================================================
-- 3. MÓDULO 1: CATÁLOGOS BASE Y GEOGRAFÍA (15 TABLAS)
-- ==============================================================================

-- 1.1 Roles de Usuario
create table if not exists public.rol (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.2 Estados de Usuario
create table if not exists public.estado_usuario (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.3 Departamentos (Guatemala)
create table if not exists public.departamento (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.4 Municipios (Guatemala)
create table if not exists public.municipio (
  id bigint generated always as identity primary key,
  departamento_id bigint not null references public.departamento(id) on delete cascade,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_municipio_departamento_id on public.municipio(departamento_id);

-- 1.5 Categorías de Inventario
create table if not exists public.catalogo_categoria_inventario (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.6 Estados de Producto
create table if not exists public.estado_producto (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.7 Tipos de Movimiento de Inventario
create table if not exists public.tipo_movimiento (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.8 Motivos de Merma
create table if not exists public.motivo_merma (
  id bigint generated by default as identity primary key,
  codigo text not null unique,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.9 Categorías de Recetas
create table if not exists public.catalogo_categoria_receta (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.10 Presentaciones de Recetas
create table if not exists public.catalogo_presentacion_receta (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.11 Unidades de Medida
create table if not exists public.unidad_medida (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.12 Métodos de Pago
create table if not exists public.metodo_pago (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.13 Estados de Orden de Compra
create table if not exists public.estado_orden_compra (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  activo boolean not null default true,
  es_sistema boolean not null default true,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.14 Catálogo de Estados de Auditoría
create table if not exists public.catalogo_auditoria_estado (
  id integer primary key,
  codigo text not null unique,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  orden integer not null default 0
);

-- 1.15 Catálogo de Tipos de Alcance de Auditoría
create table if not exists public.catalogo_auditoria_tipo_alcance (
  id integer primary key,
  codigo text not null unique,
  nombre text not null unique,
  descripcion text,
  activo boolean not null default true,
  orden integer not null default 0
);

-- ==============================================================================
-- 4. MÓDULO 2: USUARIOS Y PERFILES (1 TABLA)
-- ==============================================================================

create table if not exists public.perfil (
  id uuid primary key references auth.users(id) on delete cascade,
  usuario text not null unique,
  email text,
  primer_nombre text,
  segundo_nombre text,
  primer_apellido text,
  segundo_apellido text,
  rol_id bigint references public.rol(id),
  estado_usuario_id bigint references public.estado_usuario(id),
  departamento_id bigint references public.departamento(id),
  municipio_id bigint references public.municipio(id),
  ultimo_acceso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- 5. MÓDULO 3: INVENTARIOS, PRODUCTOS Y PROVEEDORES (7 TABLAS)
-- ==============================================================================

-- 3.1 Productos e Insumos
create table if not exists public.producto (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  categoria text not null,
  stock numeric(12,2) not null default 0,
  minimo numeric(12,2) not null default 0,
  unidad text not null default 'Unidades',
  costo_unitario numeric(12,2) not null default 0,
  precio_compra numeric(12,2),
  precio_venta numeric(12,2),
  estado text not null default 'Disponible',
  cantidad_compra numeric(12,2),
  precio_paquete numeric(12,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_producto_categoria on public.producto(categoria);
create index if not exists idx_producto_codigo on public.producto(codigo);

-- 3.2 Proveedores
create table if not exists public.proveedor (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  nit text,
  telefono text,
  correo text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.3 Movimientos de Inventario (Kárdex)
create table if not exists public.movimiento_inventario (
  id bigint generated always as identity primary key,
  producto_id bigint not null references public.producto(id) on delete cascade,
  tipo text not null,
  cantidad numeric(12,2) not null,
  motivo text,
  usuario text,
  cantidad_compra numeric(12,2),
  unidad_compra_id bigint references public.unidad_medida(id),
  proveedor_id bigint references public.proveedor(id),
  motivo_tipo text,
  fecha_movimiento timestamptz,
  costo_unitario_movimiento numeric(12,2),
  stock_antes numeric(12,2),
  stock_despues numeric(12,2),
  documento_path text,
  motivo_merma_id bigint references public.motivo_merma(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_movimiento_producto on public.movimiento_inventario(producto_id);
create index if not exists idx_movimiento_created_at on public.movimiento_inventario(created_at desc);

-- 3.4 Entradas de Inventario (Compras)
create table if not exists public.entrada_inventario (
  id bigint generated always as identity primary key,
  numero text not null unique,
  fecha date not null default current_date,
  tipo text not null default 'COMPRA',
  proveedor_id bigint references public.proveedor(id),
  numero_factura text,
  fecha_factura date,
  responsable text,
  observaciones text,
  documento_path text,
  estado text not null default 'CONFIRMADA',
  subtotal numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.5 Detalle de Entradas de Inventario
create table if not exists public.entrada_inventario_detalle (
  id bigint generated always as identity primary key,
  entrada_id bigint not null references public.entrada_inventario(id) on delete cascade,
  producto_id bigint not null references public.producto(id),
  unidad text not null,
  cantidad numeric(12,2) not null default 0,
  costo_unitario numeric(12,2) not null default 0,
  total_linea numeric(12,2) not null default 0
);
create index if not exists idx_entrada_detalle_entrada_id on public.entrada_inventario_detalle(entrada_id);

-- 3.6 Órdenes de Compra
create table if not exists public.orden_compra (
  id bigint generated always as identity primary key,
  numero text not null unique,
  proveedor_id bigint not null references public.proveedor(id),
  fecha_emision date not null default current_date,
  fecha_entrega_esperada date,
  estado_id bigint not null references public.estado_orden_compra(id),
  observaciones text,
  subtotal numeric(12,2) not null default 0,
  impuestos numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  creado_por text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.7 Detalle de Órdenes de Compra
create table if not exists public.orden_compra_detalle (
  id bigint generated always as identity primary key,
  orden_compra_id bigint not null references public.orden_compra(id) on delete cascade,
  producto_id bigint not null references public.producto(id),
  cantidad numeric(12,2) not null default 0,
  precio_unitario numeric(12,2) not null default 0,
  total_linea numeric(12,2) not null default 0
);

-- ==============================================================================
-- 6. MÓDULO 4: RECETAS Y PRODUCCIÓN (5 TABLAS)
-- ==============================================================================

-- 4.1 Recetas de Producto Terminado
create table if not exists public.receta (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  categoria text not null default 'Bebidas',
  presentacion text,
  costo_electricidad numeric(12,2) not null default 0,
  costo_mano_obra numeric(12,2) not null default 0,
  costo_agua numeric(12,2) not null default 0,
  costo_local numeric(12,2) not null default 0,
  subtotal_materia_prima numeric(12,2) not null default 0,
  costos_produccion numeric(12,2) not null default 0,
  costo_total numeric(12,2) not null default 0,
  precio_sugerido numeric(12,2) not null default 0,
  tipo_producto text default 'terminado',
  imagen_url text, -- URL pública CDN alojada en Supabase Storage (bucket recetas-imagenes)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_receta_codigo on public.receta(codigo);
create index if not exists idx_receta_categoria on public.receta(categoria);

-- 4.2 Ingredientes de Recetas (BOM)
create table if not exists public.ingrediente_receta (
  id bigint generated always as identity primary key,
  receta_id bigint not null references public.receta(id) on delete cascade,
  producto_id bigint references public.producto(id) on delete restrict,
  nombre text not null,
  cantidad numeric(12,4) not null default 0,
  unidad text not null,
  costo_unitario numeric(12,4) not null default 0,
  contenido_total numeric(12,4),
  created_at timestamptz not null default now()
);
create index if not exists idx_ingrediente_receta_id on public.ingrediente_receta(receta_id);
create index if not exists idx_ingrediente_producto_id on public.ingrediente_receta(producto_id);

-- 4.3 Planes de Producción
create table if not exists public.plan_produccion (
  id bigint generated always as identity primary key,
  receta_id bigint not null references public.receta(id) on delete cascade,
  cantidad_planificada numeric(12,2) not null default 0,
  demanda_proyectada numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

-- 4.4 Registro de Producciones
create table if not exists public.produccion (
  id bigint generated always as identity primary key,
  receta_id bigint not null references public.receta(id) on delete restrict,
  cantidad numeric(12,2) not null default 0,
  usuario text,
  lote text,
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- 7. MÓDULO 5: PUNTO DE VENTA (POS), CLIENTES Y CAJA (5 TABLAS)
-- ==============================================================================

-- 5.1 Clientes
create table if not exists public.cliente (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  nit text,
  telefono text,
  correo text,
  direccion text,
  departamento_id bigint references public.departamento(id),
  municipio_id bigint references public.municipio(id),
  activo boolean not null default true,
  es_sistema boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5.2 Ventas POS
create table if not exists public.venta_pos (
  id bigint generated always as identity primary key,
  ticket text not null unique,
  cliente text not null default 'Cliente General',
  cliente_id bigint references public.cliente(id),
  nombre_cliente text,
  nit text default 'CF',
  numero_telefono text,
  necesita_factura boolean not null default false,
  metodo_pago text not null default 'Efectivo',
  subtotal numeric(12,2) not null default 0,
  iva numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  usuario text,
  created_at timestamptz not null default now()
);
create index if not exists idx_venta_pos_created_at on public.venta_pos(created_at desc);
create index if not exists idx_venta_pos_cliente_id on public.venta_pos(cliente_id);

-- 5.3 Detalle de Ventas POS
create table if not exists public.venta_pos_detalle (
  id bigint generated always as identity primary key,
  venta_id bigint not null references public.venta_pos(id) on delete cascade,
  receta_id bigint not null references public.receta(id),
  cantidad numeric(12,2) not null default 1,
  precio_unitario numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_venta_pos_detalle_venta_id on public.venta_pos_detalle(venta_id);

-- 5.4 Facturas
create table if not exists public.factura (
  id bigint generated always as identity primary key,
  numero text not null unique,
  serie text default 'A',
  venta_id bigint references public.venta_pos(id),
  cliente_id bigint references public.cliente(id),
  nit text not null default 'CF',
  nombre_cliente text not null,
  total numeric(12,2) not null default 0,
  estado text not null default 'EMITIDA',
  fel_uuid text,
  created_at timestamptz not null default now()
);

-- 5.5 Arqueos de Caja / Turnos de Venta
create table if not exists public.arqueo_caja (
  id bigint generated always as identity primary key,
  periodo_inicio timestamptz not null,
  periodo_fin timestamptz not null,
  total_ventas numeric(12,2) not null default 0,
  total_efectivo numeric(12,2) not null default 0,
  total_transferencia numeric(12,2) not null default 0,
  transacciones integer not null default 0,
  usuario text,
  fondo_inicial numeric(12,2) not null default 0,
  sencillo_dejado numeric(12,2) not null default 0,
  total_efectivo_esperado numeric(12,2) not null default 0,
  efectivo_real numeric(12,2),
  efectivo_retirado numeric(12,2),
  diferencia numeric(12,2) default 0,
  observaciones text,
  confirmado_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_arqueo_caja_periodo on public.arqueo_caja(periodo_inicio, periodo_fin);

-- ==============================================================================
-- 8. MÓDULO 6: AUDITORÍA DE INVENTARIOS Y CONCILIACIÓN FÍSICA (2 TABLAS)
-- ==============================================================================

-- 6.1 Auditorías de Inventario (Cabecera)
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

-- 6.2 Detalle de Auditoría de Inventario
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
create index if not exists idx_auditoria_detalle_auditoria on public.auditoria_inventario_detalle(auditoria_id);

-- ==============================================================================
-- 9. MÓDULO 7: IA PREDICTIVA Y CLIMA (2 TABLAS)
-- ==============================================================================

-- 7.1 Historial Climático
create table if not exists public.historial_clima (
  id bigint generated always as identity primary key,
  date date not null unique,
  temperature numeric(5,2),
  temperature_max numeric(5,2),
  temperature_min numeric(5,2),
  humidity numeric(5,2),
  rain_probability numeric(5,2),
  wind_speed numeric(5,2),
  weather_code integer,
  created_at timestamptz not null default now()
);

-- 7.2 Historial de Predicción de Demanda
create table if not exists public.historial_prediccion_demanda (
  id bigint generated by default as identity primary key,
  producto_id bigint not null,
  producto_nombre text not null,
  periodo_inicio date not null,
  periodo_fin date not null,
  cantidad_predicha numeric(12, 2) not null check (cantidad_predicha >= 0),
  cantidad_real numeric(12, 2) check (cantidad_real is null or cantidad_real >= 0),
  creado_at timestamptz not null default now(),
  evaluado_at timestamptz,
  constraint historial_prediccion_demanda_periodo_valido check (periodo_fin >= periodo_inicio),
  constraint historial_prediccion_demanda_producto_periodo_key unique (producto_id, periodo_inicio, periodo_fin)
);
create index if not exists idx_historial_prediccion_demanda_pendiente
  on public.historial_prediccion_demanda (periodo_fin)
  where cantidad_real is null;

-- ==============================================================================
-- 10. MÓDULO 8: CONFIGURACIÓN GENERAL DEL SISTEMA Y SUCURSALES (6 TABLAS)
-- ==============================================================================

-- 8.1 Configuración de Empresa
create table if not exists public.config_empresa (
  id integer primary key default 1,
  nombre_empresa text not null,
  nit text not null,
  direccion text not null,
  telefono text not null,
  correo text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8.2 Configuración de Impuestos
create table if not exists public.config_impuestos (
  id integer primary key default 1,
  iva_activo boolean not null default true,
  iva_porcentaje numeric(5,2) not null default 12,
  otros_impuestos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8.3 Configuración de Notificaciones
create table if not exists public.config_notificaciones (
  id integer primary key default 1,
  alerta_stock_bajo boolean not null default true,
  alerta_stock_critico boolean not null default true,
  confirmacion_ventas boolean not null default true,
  alertas_mantenimiento boolean not null default true,
  alertas_vencimiento boolean not null default true,
  alertas_compras_pendientes boolean not null default true,
  notificaciones_correo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8.4 Configuración de Umbrales de Stock
create table if not exists public.config_umbrales (
  id integer primary key default 1,
  stock_bajo_porcentaje numeric(5,2) not null default 20,
  stock_critico_porcentaje numeric(5,2) not null default 10,
  dias_mantenimiento integer not null default 30,
  dias_vencimiento integer not null default 7,
  parametros_extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8.5 Sucursales
create table if not exists public.sucursal (
  id bigint generated by default as identity primary key,
  nombre text not null,
  direccion text not null,
  telefono text not null,
  encargado text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_sucursal_activa on public.sucursal(activa);

-- 8.6 Registro de Auditoría de Configuración
create table if not exists public.configuracion_auditoria (
  id bigint generated by default as identity primary key,
  modulo text not null,
  entidad text not null,
  entidad_id text,
  accion text not null,
  usuario text,
  antes jsonb,
  despues jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_configuracion_auditoria_created_at on public.configuracion_auditoria(created_at desc);

-- ==============================================================================
-- 11. MÓDULO 9: COPIAS DE SEGURIDAD (BACKUPS) (2 TABLAS)
-- ==============================================================================

-- 9.1 Configuración de Backups
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

-- 9.2 Historial de Backups
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
create index if not exists idx_sistema_backup_historial_created_at on public.sistema_backup_historial(created_at desc);

-- ==============================================================================
-- 12. MÓDULO 10: MANTENIMIENTO DE ESTRUCTURA DE DATOS (2 TABLAS)
-- ==============================================================================

-- 10.1 Definición de Tablas
create table if not exists public.tabla_estructura (
  id bigint generated always as identity primary key,
  nombre_visible text not null,
  nombre_interno text not null unique,
  descripcion text,
  modulo text not null default 'General',
  es_sistema boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10.2 Definición de Campos
create table if not exists public.campo_estructura (
  id bigint generated always as identity primary key,
  tabla_id bigint not null references public.tabla_estructura(id) on delete cascade,
  nombre text not null,
  tipo_dato text not null,
  descripcion text,
  requerido boolean not null default false,
  unico boolean not null default false,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_campo_estructura_tabla_id on public.campo_estructura(tabla_id);

-- ==============================================================================
-- 13. FUNCIONES RPC DE NEGOCIO ALMACENADAS EN POSTGRES
-- ==============================================================================

-- Generador de códigos automáticos para proveedores
create or replace function public.generar_codigo_proveedor()
returns text
language plpgsql
security definer
as $$
declare
  v_num integer;
begin
  select coalesce(max(nullif(regexp_replace(codigo, '^PROV-', ''), '')), '0')::integer + 1
  into v_num
  from public.proveedor
  where codigo ~ '^PROV-[0-9]+$';

  return 'PROV-' || lpad(v_num::text, 2, '0');
end;
$$;

-- Registrar movimiento de inventario con actualización atómica de stock
create or replace function public.registrar_movimiento_inventario(
  p_producto_id bigint,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text default null,
  p_usuario text default null,
  p_cantidad_compra numeric default null,
  p_unidad_compra_id bigint default null,
  p_proveedor_id bigint default null,
  p_motivo_tipo text default null,
  p_fecha_movimiento timestamptz default null,
  p_costo_unitario_movimiento numeric default null,
  p_documento_path text default null,
  p_motivo_merma_id bigint default null
)
returns public.movimiento_inventario
language plpgsql
security definer
as $$
declare
  v_mov public.movimiento_inventario;
  v_stock_actual numeric;
  v_stock_nuevo numeric;
begin
  select stock into v_stock_actual from public.producto where id = p_producto_id for update;

  if not found then
    raise exception 'Producto con id % no existe', p_producto_id;
  end if;

  if upper(p_tipo) in ('ENTRADA', 'AJUSTE_POSITIVO', 'COMPRA') then
    v_stock_nuevo := v_stock_actual + abs(p_cantidad);
  elsif upper(p_tipo) in ('SALIDA', 'AJUSTE_NEGATIVO', 'VENTA', 'MERMA', 'PRODUCCION') then
    v_stock_nuevo := v_stock_actual - abs(p_cantidad);
  else
    raise exception 'Tipo de movimiento inválido: %', p_tipo;
  end if;

  update public.producto
  set stock = v_stock_nuevo, updated_at = now()
  where id = p_producto_id;

  insert into public.movimiento_inventario (
    producto_id, tipo, cantidad, motivo, usuario,
    cantidad_compra, unidad_compra_id, proveedor_id,
    motivo_tipo, fecha_movimiento, costo_unitario_movimiento,
    stock_antes, stock_despues, documento_path, motivo_merma_id, created_at
  )
  values (
    p_producto_id, upper(p_tipo), abs(p_cantidad), p_motivo, p_usuario,
    p_cantidad_compra, p_unidad_compra_id, p_proveedor_id,
    p_motivo_tipo, coalesce(p_fecha_movimiento, now()), p_costo_unitario_movimiento,
    v_stock_actual, v_stock_nuevo, p_documento_path, p_motivo_merma_id, now()
  )
  returning * into v_mov;

  return v_mov;
end;
$$;

-- Registrar venta en POS con deducción automática de insumos (BOM)
create or replace function public.registrar_venta_pos_consumo_directo(
  p_ticket text,
  p_cliente text,
  p_metodo_pago text,
  p_subtotal numeric,
  p_iva numeric,
  p_total numeric,
  p_usuario text,
  p_items jsonb,
  p_necesita_factura boolean default false,
  p_nit text default null,
  p_nombre_cliente text default null,
  p_numero_telefono text default null,
  p_cliente_id bigint default null
)
returns public.venta_pos
language plpgsql
security definer
as $$
declare
  v_venta public.venta_pos;
  v_item jsonb;
  v_receta_id bigint;
  v_cantidad_receta numeric;
  v_precio_unitario numeric;
  v_ing record;
begin
  insert into public.venta_pos (
    ticket, cliente, metodo_pago, subtotal, iva, total, usuario,
    necesita_factura, nit, nombre_cliente, numero_telefono, cliente_id, created_at
  )
  values (
    p_ticket, coalesce(p_cliente, 'Cliente General'), p_metodo_pago,
    p_subtotal, p_iva, p_total, p_usuario,
    p_necesita_factura, p_nit, p_nombre_cliente, p_numero_telefono, p_cliente_id, now()
  )
  returning * into v_venta;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_receta_id := (v_item->>'receta_id')::bigint;
    v_cantidad_receta := (v_item->>'cantidad')::numeric;
    v_precio_unitario := (v_item->>'precio_unitario')::numeric;

    insert into public.venta_pos_detalle (
      venta_id, receta_id, cantidad, precio_unitario, total, created_at
    )
    values (
      v_venta.id, v_receta_id, v_cantidad_receta, v_precio_unitario,
      v_cantidad_receta * v_precio_unitario, now()
    );

    for v_ing in
      select producto_id, cantidad
      from public.ingrediente_receta
      where receta_id = v_receta_id and producto_id is not null
    loop
      perform public.registrar_movimiento_inventario(
        v_ing.producto_id,
        'SALIDA',
        v_ing.cantidad * v_cantidad_receta,
        'Venta POS Ticket ' || p_ticket,
        p_usuario
      );
    end loop;
  end loop;

  return v_venta;
end;
$$;

-- Registrar entrada por compra
create or replace function public.registrar_entrada_inventario(
  p_numero text,
  p_fecha date,
  p_tipo text,
  p_proveedor_id bigint,
  p_numero_factura text,
  p_fecha_factura date,
  p_responsable text,
  p_observaciones text,
  p_documento_path text,
  p_subtotal numeric,
  p_total numeric,
  p_detalles jsonb
)
returns public.entrada_inventario
language plpgsql
security definer
as $$
declare
  v_entrada public.entrada_inventario;
  v_item jsonb;
  v_prod_id bigint;
  v_cant numeric;
  v_costo numeric;
  v_unidad text;
begin
  insert into public.entrada_inventario (
    numero, fecha, tipo, proveedor_id, numero_factura, fecha_factura,
    responsable, observaciones, documento_path, subtotal, total, estado, created_at, updated_at
  )
  values (
    p_numero, p_fecha, coalesce(p_tipo, 'COMPRA'), p_proveedor_id,
    p_numero_factura, p_fecha_factura, p_responsable, p_observaciones,
    p_documento_path, p_subtotal, p_total, 'CONFIRMADA', now(), now()
  )
  returning * into v_entrada;

  for v_item in select * from jsonb_array_elements(p_detalles)
  loop
    v_prod_id := (v_item->>'producto_id')::bigint;
    v_cant := (v_item->>'cantidad')::numeric;
    v_costo := (v_item->>'costo_unitario')::numeric;
    v_unidad := (v_item->>'unidad')::text;

    insert into public.entrada_inventario_detalle (
      entrada_id, producto_id, unidad, cantidad, costo_unitario, total_linea
    )
    values (
      v_entrada.id, v_prod_id, v_unidad, v_cant, v_costo, v_cant * v_costo
    );

    perform public.registrar_movimiento_inventario(
      v_prod_id,
      'ENTRADA',
      v_cant,
      'Entrada por Compra ' || p_numero,
      p_responsable,
      v_cant,
      null,
      p_proveedor_id,
      'Compra',
      p_fecha,
      v_costo,
      p_documento_path,
      null
    );
  end loop;

  return v_entrada;
end;
$$;

-- ==============================================================================
-- 14. HABILITACIÓN DE SEGURIDAD (ROW LEVEL SECURITY - RLS) EN TODAS LAS 46 TABLAS
-- ==============================================================================

alter table public.rol enable row level security;
alter table public.estado_usuario enable row level security;
alter table public.departamento enable row level security;
alter table public.municipio enable row level security;
alter table public.catalogo_categoria_inventario enable row level security;
alter table public.estado_producto enable row level security;
alter table public.tipo_movimiento enable row level security;
alter table public.motivo_merma enable row level security;
alter table public.catalogo_categoria_receta enable row level security;
alter table public.catalogo_presentacion_receta enable row level security;
alter table public.unidad_medida enable row level security;
alter table public.metodo_pago enable row level security;
alter table public.estado_orden_compra enable row level security;
alter table public.catalogo_auditoria_estado enable row level security;
alter table public.catalogo_auditoria_tipo_alcance enable row level security;
alter table public.perfil enable row level security;
alter table public.producto enable row level security;
alter table public.proveedor enable row level security;
alter table public.cliente enable row level security;
alter table public.receta enable row level security;
alter table public.ingrediente_receta enable row level security;
alter table public.plan_produccion enable row level security;
alter table public.produccion enable row level security;
alter table public.movimiento_inventario enable row level security;
alter table public.entrada_inventario enable row level security;
alter table public.entrada_inventario_detalle enable row level security;
alter table public.orden_compra enable row level security;
alter table public.orden_compra_detalle enable row level security;
alter table public.venta_pos enable row level security;
alter table public.venta_pos_detalle enable row level security;
alter table public.factura enable row level security;
alter table public.arqueo_caja enable row level security;
alter table public.auditoria_inventario enable row level security;
alter table public.auditoria_inventario_detalle enable row level security;
alter table public.historial_clima enable row level security;
alter table public.historial_prediccion_demanda enable row level security;
alter table public.config_empresa enable row level security;
alter table public.config_impuestos enable row level security;
alter table public.config_notificaciones enable row level security;
alter table public.config_umbrales enable row level security;
alter table public.sucursal enable row level security;
alter table public.configuracion_auditoria enable row level security;
alter table public.sistema_backup_config enable row level security;
alter table public.sistema_backup_historial enable row level security;
alter table public.tabla_estructura enable row level security;
alter table public.campo_estructura enable row level security;

-- Políticas de acceso para catálogos y lectura general
create policy "Lectura rol para autenticados" on public.rol for select using (true);
create policy "Lectura estado_usuario para autenticados" on public.estado_usuario for select using (true);
create policy "Lectura departamento para autenticados" on public.departamento for select using (true);
create policy "Lectura municipio para autenticados" on public.municipio for select using (true);
create policy "Lectura categoria inventario" on public.catalogo_categoria_inventario for select using (true);
create policy "Lectura estado producto" on public.estado_producto for select using (true);
create policy "Lectura tipos movimiento" on public.tipo_movimiento for select using (true);
create policy "Lectura motivos merma" on public.motivo_merma for select using (true);
create policy "Lectura categorias receta" on public.catalogo_categoria_receta for select using (true);
create policy "Lectura presentaciones receta" on public.catalogo_presentacion_receta for select using (true);
create policy "Lectura unidad medida" on public.unidad_medida for select using (true);
create policy "Lectura metodo pago" on public.metodo_pago for select using (true);
create policy "Lectura estado orden compra" on public.estado_orden_compra for select using (true);
create policy "Lectura estado auditoria" on public.catalogo_auditoria_estado for select using (true);
create policy "Lectura tipo alcance auditoria" on public.catalogo_auditoria_tipo_alcance for select using (true);

-- Políticas de acceso para tablas operativas
create policy "Acceso perfil" on public.perfil for all using (true) with check (true);
create policy "Acceso producto" on public.producto for all using (true) with check (true);
create policy "Acceso proveedor" on public.proveedor for all using (true) with check (true);
create policy "Acceso cliente" on public.cliente for all using (true) with check (true);
create policy "Acceso receta" on public.receta for all using (true) with check (true);
create policy "Acceso ingrediente_receta" on public.ingrediente_receta for all using (true) with check (true);
create policy "Acceso plan_produccion" on public.plan_produccion for all using (true) with check (true);
create policy "Acceso produccion" on public.produccion for all using (true) with check (true);
create policy "Acceso movimiento_inventario" on public.movimiento_inventario for all using (true) with check (true);
create policy "Acceso entrada_inventario" on public.entrada_inventario for all using (true) with check (true);
create policy "Acceso entrada_inventario_detalle" on public.entrada_inventario_detalle for all using (true) with check (true);
create policy "Acceso orden_compra" on public.orden_compra for all using (true) with check (true);
create policy "Acceso orden_compra_detalle" on public.orden_compra_detalle for all using (true) with check (true);
create policy "Acceso venta_pos" on public.venta_pos for all using (true) with check (true);
create policy "Acceso venta_pos_detalle" on public.venta_pos_detalle for all using (true) with check (true);
create policy "Acceso factura" on public.factura for all using (true) with check (true);
create policy "Acceso arqueo_caja" on public.arqueo_caja for all using (true) with check (true);
create policy "Acceso auditoria_inventario" on public.auditoria_inventario for all using (true) with check (true);
create policy "Acceso auditoria_inventario_detalle" on public.auditoria_inventario_detalle for all using (true) with check (true);
create policy "Acceso historial_clima" on public.historial_clima for all using (true) with check (true);
create policy "Acceso historial_prediccion_demanda" on public.historial_prediccion_demanda for all using (true) with check (true);
create policy "Acceso config_empresa" on public.config_empresa for all using (true) with check (true);
create policy "Acceso config_impuestos" on public.config_impuestos for all using (true) with check (true);
create policy "Acceso config_notificaciones" on public.config_notificaciones for all using (true) with check (true);
create policy "Acceso config_umbrales" on public.config_umbrales for all using (true) with check (true);
create policy "Acceso sucursal" on public.sucursal for all using (true) with check (true);
create policy "Acceso configuracion_auditoria" on public.configuracion_auditoria for all using (true) with check (true);
create policy "Acceso sistema_backup_config" on public.sistema_backup_config for all using (true) with check (true);
create policy "Acceso sistema_backup_historial" on public.sistema_backup_historial for all using (true) with check (true);
create policy "Acceso tabla_estructura" on public.tabla_estructura for all using (true) with check (true);
create policy "Acceso campo_estructura" on public.campo_estructura for all using (true) with check (true);

-- ==============================================================================
-- FIN DEL RESPALDO DDL COMPLETO (46 TABLAS - ERP AMATI HIELO)
-- ==============================================================================
`;

fs.writeFileSync(OUTPUT_FILE, FULL_SCHEMA, 'utf8');
const gz = zlib.gzipSync(Buffer.from(FULL_SCHEMA, 'utf8'));
fs.writeFileSync(OUTPUT_GZ, gz);

console.log('Respaldo integral generado exitosamente:');
console.log(' - SQL plano:', OUTPUT_FILE, `(${fs.statSync(OUTPUT_FILE).size} bytes)`);
console.log(' - Comprimido:', OUTPUT_GZ, `(${fs.statSync(OUTPUT_GZ).size} bytes)`);
