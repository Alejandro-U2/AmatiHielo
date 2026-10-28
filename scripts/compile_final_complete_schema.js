import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const OUTPUT_DIR = path.resolve('data/backups/schema_dumps');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'database_schema_backup_amati_hielo.sql');
const OUTPUT_GZ = path.join(OUTPUT_DIR, 'database_schema_backup_amati_hielo.sql.gz');

const SQL_CONTENT = `-- ==============================================================================
-- AMATI HIELO - RESPALDO INTEGRAL DE ESTRUCTURA DE BASE DE DATOS (SCHEMA-ONLY DDL)
-- Sistema: ERP AMATI HIELO
-- Motor: PostgreSQL 15+ / Supabase
-- Total de Tablas: 47 tablas en schema public (+ 1 en auth: auth.users) = 48 tablas
-- Total de Funciones RPC: 11 funciones almacenadas
-- Modo: Estructura Completa DDL + Catálogos Base Esenciales
-- Fecha de Generación: 27 de Octubre de 2026
-- ==============================================================================

-- 1. EXTENSIONES DE POSTGRESQL
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. FUNCIONES BASE DEL SISTEMA Y SEGURIDAD
-- ==============================================================================

-- Actualización automática de updated_at
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

-- Conversor de tipos de datos para mantenimiento dinámico
create or replace function public.estructura_tipo_sql(p_tipo text)
returns text
language plpgsql
immutable
as $$
begin
  case lower(btrim(coalesce(p_tipo, '')))
    when 'text' then return 'text';
    when 'integer' then return 'integer';
    when 'bigint' then return 'bigint';
    when 'numeric' then return 'numeric(12,2)';
    when 'boolean' then return 'boolean';
    when 'date' then return 'date';
    when 'timestamp' then return 'timestamptz';
    else raise exception 'Tipo de dato no soportado: %', p_tipo;
  end case;
end;
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
  updated_at timestamptz not null default now(),
  unique (departamento_id, nombre)
);
create index if not exists idx_municipio_departamento_id on public.municipio(departamento_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.municipio'::regclass and contype = 'u'
  ) then
    alter table public.municipio add constraint municipio_departamento_id_nombre_key unique (departamento_id, nombre);
  end if;
exception when others then
  null;
end $$;

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

-- 1.11b Unidades de Compra (Kárdex y Conversión)
create table if not exists public.unidad_compra (
  id bigint generated always as identity primary key,
  nombre text not null unique,
  factor numeric(12,2) not null check (factor > 0),
  created_at timestamptz not null default now()
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
create index if not exists idx_perfil_rol_id on public.perfil(rol_id);
create index if not exists idx_perfil_estado on public.perfil(estado_usuario_id);

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
  unidad_compra_id bigint references public.unidad_compra(id),
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
-- 13. TODAS LAS FUNCIONES ALMACENADAS (RPC) DEL SISTEMA
-- ==============================================================================

-- Generador de códigos automáticos para proveedores
create sequence if not exists public.proveedor_codigo_seq;

create or replace function public.generar_codigo_proveedor()
returns trigger
language plpgsql
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := 'PRV-' || lpad(nextval('public.proveedor_codigo_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_proveedor_codigo_automatico on public.proveedor;
create trigger trg_proveedor_codigo_automatico
before insert on public.proveedor
for each row
execute function public.generar_codigo_proveedor();

-- Validar si sucursal tiene relaciones antes de eliminar
create or replace function public.sucursal_tiene_relaciones(p_sucursal_id bigint)
returns boolean
language plpgsql
as $$
declare
  v_tabla text;
  v_tiene_relacion boolean;
begin
  foreach v_tabla in array array[
    'venta_pos',
    'venta_pos_detalle',
    'movimiento_inventario',
    'producto',
    'receta',
    'plan_produccion',
    'produccion'
  ] loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = v_tabla
        and column_name = 'sucursal_id'
    ) then
      execute format('select exists(select 1 from public.%I where sucursal_id = $1)', v_tabla)
      into v_tiene_relacion
      using p_sucursal_id;

      if v_tiene_relacion then
        return true;
      end if;
    end if;
  end loop;

  return false;
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

-- Registrar entrada por compra (soporta proveedor opcional y confirmacion)
create or replace function public.registrar_entrada_inventario(
  p_proveedor_id bigint default null,
  p_numero_factura text default null,
  p_fecha date default current_date,
  p_fecha_factura date default null,
  p_responsable text default null,
  p_observaciones text default null,
  p_documento_path text default null,
  p_detalles jsonb default '[]'::jsonb,
  p_confirmar boolean default false
)
returns public.entrada_inventario
language plpgsql
security definer
set search_path = public
as $
declare
  v_entrada public.entrada_inventario;
  v_detalle jsonb;
  v_producto public.producto%rowtype;
  v_cantidad numeric;
  v_costo numeric;
  v_producto_id bigint;
begin
  if p_proveedor_id is not null and not exists (
    select 1
    from public.proveedor
    where id = p_proveedor_id
      and activo
  ) then
    raise exception 'El proveedor seleccionado no existe o está inactivo.';
  end if;

  if nullif(btrim(p_numero_factura), '') is null then
    raise exception 'El número de factura es obligatorio.';
  end if;

  if jsonb_array_length(p_detalles) = 0 then
    raise exception 'La entrada debe incluir al menos un producto.';
  end if;

  insert into public.entrada_inventario (
    fecha,
    proveedor_id,
    numero_factura,
    fecha_factura,
    responsable,
    observaciones,
    documento_path,
    estado
  )
  values (
    coalesce(p_fecha, current_date),
    p_proveedor_id,
    btrim(p_numero_factura),
    p_fecha_factura,
    coalesce(nullif(btrim(p_responsable), ''), 'Sistema'),
    nullif(btrim(coalesce(p_observaciones, '')), ''),
    p_documento_path,
    case when p_confirmar then 'Confirmada' else 'Borrador' end
  )
  returning * into v_entrada;

  for v_detalle in select * from jsonb_array_elements(p_detalles)
  loop
    v_producto_id := (v_detalle->>'producto_id')::bigint;
    v_cantidad := (v_detalle->>'cantidad')::numeric;
    v_costo := (v_detalle->>'costo_unitario')::numeric;

    if v_producto_id is null or v_cantidad is null or v_cantidad <= 0
      or v_costo is null or v_costo < 0 then
      raise exception 'Cantidad y costo deben ser valores válidos.';
    end if;

    insert into public.entrada_inventario_detalle (
      entrada_id,
      producto_id,
      unidad,
      cantidad,
      costo_unitario
    )
    values (
      v_entrada.id,
      v_producto_id,
      coalesce(nullif(v_detalle->>'unidad', ''), 'unidad'),
      v_cantidad,
      v_costo
    );

    update public.entrada_inventario
    set subtotal = subtotal + (v_cantidad * v_costo),
        total = total + (v_cantidad * v_costo)
    where id = v_entrada.id;

    if p_confirmar then
      select *
      into v_producto
      from public.producto
      where id = v_producto_id
      for update;

      if not found then
        raise exception 'No se encontró el producto seleccionado.';
      end if;

      update public.producto
      set stock = stock + v_cantidad,
          costo_unitario = v_costo,
          precio_compra = v_costo,
          updated_at = now()
      where id = v_producto.id;

      insert into public.movimiento_inventario (
        producto_id,
        proveedor_id,
        tipo,
        cantidad,
        motivo,
        usuario
      )
      values (
        v_producto.id,
        p_proveedor_id,
        'Entrada',
        v_cantidad,
        'Factura ' || btrim(p_numero_factura)
          || coalesce(' - ' || nullif(btrim(p_observaciones), ''), ''),
        coalesce(nullif(btrim(p_responsable), ''), 'Sistema')
      );
    end if;
  end loop;

  select *
  into v_entrada
  from public.entrada_inventario
  where id = v_entrada.id;

  return v_entrada;
end;
$;

-- Crear tabla dinámica en el módulo de mantenimiento de estructuras
create or replace function public.crear_tabla_estructura(
  p_nombre_interno text,
  p_nombre_visible text,
  p_modulo text,
  p_descripcion text default null,
  p_campos jsonb default '[]'::jsonb
)
returns public.tabla_estructura
language plpgsql
as $$
declare
  v_nombre_interno text := lower(btrim(coalesce(p_nombre_interno, '')));
  v_nombre_visible text := btrim(coalesce(p_nombre_visible, ''));
  v_modulo text := btrim(coalesce(p_modulo, ''));
  v_descripcion text := nullif(btrim(coalesce(p_descripcion, '')), '');
  v_tabla public.tabla_estructura%rowtype;
  v_campo record;
  v_columna_defs text[] := array['id bigint generated by default as identity primary key'];
  v_total_campos integer := 0;
  v_tipo_sql text;
begin
  if v_nombre_interno = '' or v_nombre_visible = '' or v_modulo = '' then
    raise exception 'nombre_interno, nombre_visible y modulo son obligatorios.';
  end if;

  if v_nombre_interno !~ '^[a-z_][a-z0-9_]*$' then
    raise exception 'El nombre interno debe usar minúsculas, números y guiones bajos.';
  end if;

  if jsonb_typeof(p_campos) is distinct from 'array' then
    raise exception 'Los campos deben enviarse como una lista.';
  end if;

  if jsonb_array_length(p_campos) = 0 then
    raise exception 'Debe agregar al menos un campo.';
  end if;

  if exists (
    select 1
    from public.tabla_estructura
    where nombre_interno = v_nombre_interno
  ) or exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = v_nombre_interno
  ) then
    raise exception 'El nombre interno ya existe.';
  end if;

  insert into public.tabla_estructura (
    nombre_visible, nombre_interno, descripcion, modulo, es_sistema
  )
  values (
    v_nombre_visible, v_nombre_interno, v_descripcion, v_modulo, false
  )
  returning * into v_tabla;

  for v_campo in
    select
      lower(btrim(coalesce(elem->>'nombre', ''))) as nombre,
      coalesce(elem->>'tipoDato', elem->>'tipo_dato') as tipo_dato,
      nullif(btrim(coalesce(elem->>'descripcion', '')), '') as descripcion,
      coalesce((elem->>'requerido')::boolean, false) as requerido,
      coalesce((elem->>'unico')::boolean, false) as unico,
      row_number() over () as orden
    from jsonb_array_elements(p_campos) as elem
  loop
    v_tipo_sql := public.estructura_tipo_sql(v_campo.tipo_dato);
    v_columna_defs := array_append(
      v_columna_defs,
      format(
        '%I %s%s%s',
        v_campo.nombre,
        v_tipo_sql,
        case when v_campo.requerido then ' not null' else '' end,
        case when v_campo.unico then ' unique' else '' end
      )
    );
    v_total_campos := v_total_campos + 1;
  end loop;

  execute format(
    'create table public.%I (%s)',
    v_nombre_interno,
    array_to_string(v_columna_defs, ', ')
  );

  for v_campo in
    select
      lower(btrim(coalesce(elem->>'nombre', ''))) as nombre,
      coalesce(elem->>'tipoDato', elem->>'tipo_dato') as tipo_dato,
      nullif(btrim(coalesce(elem->>'descripcion', '')), '') as descripcion,
      coalesce((elem->>'requerido')::boolean, false) as requerido,
      coalesce((elem->>'unico')::boolean, false) as unico,
      row_number() over () as orden
    from jsonb_array_elements(p_campos) as elem
  loop
    insert into public.campo_estructura (
      tabla_id, nombre, tipo_dato, descripcion, requerido, unico, orden
    )
    values (
      v_tabla.id, v_campo.nombre, lower(btrim(coalesce(v_campo.tipo_dato, 'text'))),
      v_campo.descripcion, v_campo.requerido, v_campo.unico, v_campo.orden
    );
  end loop;

  insert into public.campo_estructura (
    tabla_id, nombre, tipo_dato, descripcion, requerido, unico, orden
  )
  values (
    v_tabla.id, 'id', 'bigint', 'Clave primaria', true, true, 0
  );

  return v_tabla;
end;
$$;

-- Eliminar tabla dinámica
create or replace function public.eliminar_tabla_estructura(p_tabla_id bigint)
returns void
language plpgsql
as $$
declare
  v_tabla public.tabla_estructura%rowtype;
begin
  select * into v_tabla from public.tabla_estructura where id = p_tabla_id;
  if not found then raise exception 'No se encontró la tabla solicitada.'; end if;
  if v_tabla.es_sistema then raise exception 'No se pueden eliminar tablas del sistema.'; end if;
  execute format('drop table if exists public.%I cascade', v_tabla.nombre_interno);
  delete from public.tabla_estructura where id = v_tabla.id;
end;
$$;

-- ==============================================================================
-- 13b. FUNCIONES DE VERIFICACIÓN DE ROLES (ADMIN / SUPERUSUARIO)
-- ==============================================================================

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.perfil p
    join public.rol r on r.id = p.rol_id
    where p.id = auth.uid()
      and r.nombre in ('Superusuario', 'Administrador')
  );
end;
$$;

create or replace function public.is_admin_profile()
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.perfil p
    join public.rol r on r.id = p.rol_id
    where p.id = auth.uid()
      and r.nombre in ('Superusuario', 'Administrador')
  );
end;
$$;

-- ==============================================================================
-- 14. HABILITACIÓN DE SEGURIDAD (ROW LEVEL SECURITY - RLS) EN TODAS LAS 47 TABLAS
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
alter table public.unidad_compra enable row level security;
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

-- Políticas de lectura para catálogos y lectura general
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
create policy "Lectura unidad compra" on public.unidad_compra for select using (true);
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
-- 15. TRIGGERS DE ACTUALIZACIÓN AUTOMÁTICA (updated_at)
-- ==============================================================================

create or replace trigger tr_updated_at_rol before update on public.rol for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_estado_usuario before update on public.estado_usuario for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_departamento before update on public.departamento for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_municipio before update on public.municipio for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_categoria_inventario before update on public.catalogo_categoria_inventario for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_estado_producto before update on public.estado_producto for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_tipo_movimiento before update on public.tipo_movimiento for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_motivo_merma before update on public.motivo_merma for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_categoria_receta before update on public.catalogo_categoria_receta for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_presentacion_receta before update on public.catalogo_presentacion_receta for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_unidad_medida before update on public.unidad_medida for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_metodo_pago before update on public.metodo_pago for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_estado_orden_compra before update on public.estado_orden_compra for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_perfil before update on public.perfil for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_producto before update on public.producto for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_proveedor before update on public.proveedor for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_cliente before update on public.cliente for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_receta before update on public.receta for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_entrada_inventario before update on public.entrada_inventario for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_orden_compra before update on public.orden_compra for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_auditoria_inventario before update on public.auditoria_inventario for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_auditoria_inventario_detalle before update on public.auditoria_inventario_detalle for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_config_empresa before update on public.config_empresa for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_config_impuestos before update on public.config_impuestos for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_config_notificaciones before update on public.config_notificaciones for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_config_umbrales before update on public.config_umbrales for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_sucursal before update on public.sucursal for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_sistema_backup_config before update on public.sistema_backup_config for each row execute function public.set_updated_at();
create or replace trigger tr_updated_at_tabla_estructura before update on public.tabla_estructura for each row execute function public.set_updated_at();

-- ==============================================================================
-- 16. CATÁLOGOS BASE ESENCIALES (SEMILLA PARA INICIALIZAR ENTORNO EN BLANCO)

-- Departamentos y Municipios de Guatemala (INE)
insert into public.departamento (codigo, nombre, activo, es_sistema, orden)
values
  ('01', 'Guatemala', true, true, 1),
  ('02', 'El Progreso', true, true, 2),
  ('03', 'Sacatepéquez', true, true, 3),
  ('04', 'Chimaltenango', true, true, 4),
  ('05', 'Escuintla', true, true, 5),
  ('06', 'Santa Rosa', true, true, 6),
  ('07', 'Sololá', true, true, 7),
  ('08', 'Totonicapán', true, true, 8),
  ('09', 'Quetzaltenango', true, true, 9),
  ('10', 'Suchitepéquez', true, true, 10),
  ('11', 'Retalhuleu', true, true, 11),
  ('12', 'San Marcos', true, true, 12),
  ('13', 'Huehuetenango', true, true, 13),
  ('14', 'Quiché', true, true, 14),
  ('15', 'Baja Verapaz', true, true, 15),
  ('16', 'Alta Verapaz', true, true, 16),
  ('17', 'Petén', true, true, 17),
  ('18', 'Izabal', true, true, 18),
  ('19', 'Zacapa', true, true, 19),
  ('20', 'Chiquimula', true, true, 20),
  ('21', 'Jalapa', true, true, 21),
  ('22', 'Jutiapa', true, true, 22)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      activo = excluded.activo,
      es_sistema = excluded.es_sistema,
      orden = excluded.orden,
      updated_at = now();

-- Seed de los 340 municipios oficiales de Guatemala (lista INE).
insert into public.municipio (departamento_id, nombre, activo, es_sistema, orden)
select d.id, m.nombre, true, true, m.orden
from (
  values
    ('01', 1, 'Guatemala'),
    ('01', 2, 'Amatitlán'),
    ('01', 3, 'Chinautla'),
    ('01', 4, 'Chuarrancho'),
    ('01', 5, 'Fraijanes'),
    ('01', 6, 'Mixco'),
    ('01', 7, 'Palencia'),
    ('01', 8, 'San José del Golfo'),
    ('01', 9, 'San José Pinula'),
    ('01', 10, 'San Juan Sacatepéquez'),
    ('01', 11, 'San Miguel Petapa'),
    ('01', 12, 'San Pedro Ayampuc'),
    ('01', 13, 'San Pedro Sacatepéquez'),
    ('01', 14, 'San Raymundo'),
    ('01', 15, 'Santa Catarina Pinula'),
    ('01', 16, 'Villa Canales'),
    ('01', 17, 'Villa Nueva'),
    ('02', 1, 'El Jícaro'),
    ('02', 2, 'Guastatoya'),
    ('02', 3, 'Morazán'),
    ('02', 4, 'San Agustín Acasaguastlán'),
    ('02', 5, 'San Antonio La Paz'),
    ('02', 6, 'San Cristóbal Acasaguastlán'),
    ('02', 7, 'Sanarate'),
    ('02', 8, 'Sansare'),
    ('03', 1, 'Alotenango'),
    ('03', 2, 'Antigua Guatemala'),
    ('03', 3, 'Ciudad Vieja'),
    ('03', 4, 'Jocotenango'),
    ('03', 5, 'Magdalena Milpas Altas'),
    ('03', 6, 'Pastores'),
    ('03', 7, 'San Antonio Aguas Calientes'),
    ('03', 8, 'San Bartolomé Milpas Altas'),
    ('03', 9, 'San Lucas Sacatepéquez'),
    ('03', 10, 'San Miguel Dueñas'),
    ('03', 11, 'Santa Catarina Barahona'),
    ('03', 12, 'Santa Lucía Milpas Altas'),
    ('03', 13, 'Santa María de Jesús'),
    ('03', 14, 'Santiago Sacatepéquez'),
    ('03', 15, 'Santo Domingo Xenacoj'),
    ('03', 16, 'Sumpango'),
    ('04', 1, 'Acatenango'),
    ('04', 2, 'Chimaltenango'),
    ('04', 3, 'El Tejar'),
    ('04', 4, 'Parramos'),
    ('04', 5, 'Patzicía'),
    ('04', 6, 'Patzún'),
    ('04', 7, 'Pochuta'),
    ('04', 8, 'San Andrés Itzapa'),
    ('04', 9, 'San José Poaquil'),
    ('04', 10, 'San Juan Comalapa'),
    ('04', 11, 'San Martín Jilotepeque'),
    ('04', 12, 'Santa Apolonia'),
    ('04', 13, 'Santa Cruz Balanyá'),
    ('04', 14, 'Tecpán'),
    ('04', 15, 'Yepocapa'),
    ('04', 16, 'Zaragoza'),
    ('05', 1, 'Escuintla'),
    ('05', 2, 'Guanagazapa'),
    ('05', 3, 'Iztapa'),
    ('05', 4, 'La Democracia'),
    ('05', 5, 'La Gomera'),
    ('05', 6, 'Masagua'),
    ('05', 7, 'Nueva Concepción'),
    ('05', 8, 'Palín'),
    ('05', 9, 'San José'),
    ('05', 10, 'San Vicente Pacaya'),
    ('05', 11, 'Santa Lucía Cotzumalguapa'),
    ('05', 12, 'Sipacate'),
    ('05', 13, 'Siquinalá'),
    ('05', 14, 'Tiquisate'),
    ('06', 1, 'Barberena'),
    ('06', 2, 'Casillas'),
    ('06', 3, 'Chiquimulilla'),
    ('06', 4, 'Cuilapa'),
    ('06', 5, 'Guazacapán'),
    ('06', 6, 'Nueva Santa Rosa'),
    ('06', 7, 'Oratorio'),
    ('06', 8, 'Pueblo Nuevo Viñas'),
    ('06', 9, 'San Juan Tecuaco'),
    ('06', 10, 'San Rafael las Flores'),
    ('06', 11, 'Santa Cruz Naranjo'),
    ('06', 12, 'Santa María Ixhuatán'),
    ('06', 13, 'Santa Rosa de Lima'),
    ('06', 14, 'Taxisco'),
    ('07', 1, 'Concepción'),
    ('07', 2, 'Nahualá'),
    ('07', 3, 'Panajachel'),
    ('07', 4, 'San Andrés Semetabaj'),
    ('07', 5, 'San Antonio Palopó'),
    ('07', 6, 'San José Chacayá'),
    ('07', 7, 'San Juan La Laguna'),
    ('07', 8, 'San Lucas Tolimán'),
    ('07', 9, 'San Marcos La Laguna'),
    ('07', 10, 'San Pablo La Laguna'),
    ('07', 11, 'San Pedro La Laguna'),
    ('07', 12, 'Santa Catarina Ixtahuacán'),
    ('07', 13, 'Santa Catarina Palopó'),
    ('07', 14, 'Santa Clara La Laguna'),
    ('07', 15, 'Santa Cruz La Laguna'),
    ('07', 16, 'Santa Lucía Utatlán'),
    ('07', 17, 'Santa María Visitación'),
    ('07', 18, 'Santiago Atitlán'),
    ('07', 19, 'Sololá'),
    ('08', 1, 'Momostenango'),
    ('08', 2, 'San Andrés Xecul'),
    ('08', 3, 'San Bartolo'),
    ('08', 4, 'San Cristóbal Totonicapán'),
    ('08', 5, 'San Francisco El Alto'),
    ('08', 6, 'Santa Lucía La Reforma'),
    ('08', 7, 'Santa María Chiquimula'),
    ('08', 8, 'Totonicapán'),
    ('09', 1, 'Almolonga'),
    ('09', 2, 'Cabricán'),
    ('09', 3, 'Cajolá'),
    ('09', 4, 'Cantel'),
    ('09', 5, 'Coatepeque'),
    ('09', 6, 'Colomba Costa Cuca'),
    ('09', 7, 'Concepción Chiquirichapa'),
    ('09', 8, 'El Palmar'),
    ('09', 9, 'Flores Costa Cuca'),
    ('09', 10, 'Génova'),
    ('09', 11, 'Huitán'),
    ('09', 12, 'La Esperanza'),
    ('09', 13, 'Olintepeque'),
    ('09', 14, 'Palestina de Los Altos'),
    ('09', 15, 'Quetzaltenango'),
    ('09', 16, 'Salcajá'),
    ('09', 17, 'San Carlos Sija'),
    ('09', 18, 'San Francisco La Unión'),
    ('09', 19, 'San Juan Ostuncalco'),
    ('09', 20, 'San Martín Sacatepéquez'),
    ('09', 21, 'San Mateo'),
    ('09', 22, 'San Miguel Sigüilá'),
    ('09', 23, 'Sibilia'),
    ('09', 24, 'Zunil'),
    ('10', 1, 'Chicacao'),
    ('10', 2, 'Cuyotenango'),
    ('10', 3, 'Mazatenango'),
    ('10', 4, 'Patulul'),
    ('10', 5, 'Pueblo Nuevo'),
    ('10', 6, 'Río Bravo'),
    ('10', 7, 'Samayac'),
    ('10', 8, 'San Antonio Suchitepéquez'),
    ('10', 9, 'San Bernardino'),
    ('10', 10, 'San Francisco Zapotitlán'),
    ('10', 11, 'San Gabriel'),
    ('10', 12, 'San José El Ídolo'),
    ('10', 13, 'San José La Máquina'),
    ('10', 14, 'San Juan Bautista'),
    ('10', 15, 'San Lorenzo'),
    ('10', 16, 'San Miguel Panán'),
    ('10', 17, 'San Pablo Jocopilas'),
    ('10', 18, 'Santa Bárbara'),
    ('10', 19, 'Santo Domingo Suchitepéquez'),
    ('10', 20, 'Santo Tomás La Unión'),
    ('10', 21, 'Zunilito'),
    ('11', 1, 'Champerico'),
    ('11', 2, 'El Asintal'),
    ('11', 3, 'Nuevo San Carlos'),
    ('11', 4, 'Retalhuleu'),
    ('11', 5, 'San Andrés Villa Seca'),
    ('11', 6, 'San Felipe'),
    ('11', 7, 'San Martín Zapotitlán'),
    ('11', 8, 'San Sebastián'),
    ('11', 9, 'Santa Cruz Muluá'),
    ('12', 1, 'Ayutla'),
    ('12', 2, 'Catarina'),
    ('12', 3, 'Comitancillo'),
    ('12', 4, 'Concepción Tutuapa'),
    ('12', 5, 'El Quetzal'),
    ('12', 6, 'El Tumbador'),
    ('12', 7, 'Esquipulas Palo Gordo'),
    ('12', 8, 'Ixchiguán'),
    ('12', 9, 'La Blanca'),
    ('12', 10, 'La Reforma'),
    ('12', 11, 'Malacatán'),
    ('12', 12, 'Nuevo Progreso'),
    ('12', 13, 'Ocós'),
    ('12', 14, 'Pajapita'),
    ('12', 15, 'Río Blanco'),
    ('12', 16, 'San Antonio Sacatepéquez'),
    ('12', 17, 'San Cristóbal Cucho'),
    ('12', 18, 'San José El Rodeo'),
    ('12', 19, 'San José Ojetenam'),
    ('12', 20, 'San Lorenzo'),
    ('12', 21, 'San Marcos'),
    ('12', 22, 'San Miguel Ixtahuacán'),
    ('12', 23, 'San Pablo'),
    ('12', 24, 'San Pedro Sacatepéquez'),
    ('12', 25, 'San Rafael Pie de la Cuesta'),
    ('12', 26, 'Sibinal'),
    ('12', 27, 'Sipacapa'),
    ('12', 28, 'Tacaná'),
    ('12', 29, 'Tajumulco'),
    ('12', 30, 'Tejutla'),
    ('13', 1, 'Aguacatán'),
    ('13', 2, 'Chiantla'),
    ('13', 3, 'Colotenango'),
    ('13', 4, 'Concepción Huista'),
    ('13', 5, 'Cuilco'),
    ('13', 6, 'Huehuetenango'),
    ('13', 7, 'Jacaltenango'),
    ('13', 8, 'La Democracia'),
    ('13', 9, 'La Libertad'),
    ('13', 10, 'Malacatancito'),
    ('13', 11, 'Nentón'),
    ('13', 12, 'Petatán'),
    ('13', 13, 'San Antonio Huista'),
    ('13', 14, 'San Gaspar Ixchil'),
    ('13', 15, 'San Ildefonso Ixtahuacán'),
    ('13', 16, 'San Juan Atitán'),
    ('13', 17, 'San Juan Ixcoy'),
    ('13', 18, 'San Mateo Ixtatán'),
    ('13', 19, 'San Miguel Acatán'),
    ('13', 20, 'San Pedro Nectá'),
    ('13', 21, 'San Pedro Soloma'),
    ('13', 22, 'San Rafael La Independencia'),
    ('13', 23, 'San Rafael Pétzal'),
    ('13', 24, 'San Sebastián Coatán'),
    ('13', 25, 'San Sebastián Huehuetenango'),
    ('13', 26, 'Santa Ana Huista'),
    ('13', 27, 'Santa Bárbara'),
    ('13', 28, 'Santa Cruz Barillas'),
    ('13', 29, 'Santa Eulalia'),
    ('13', 30, 'Santiago Chimaltenango'),
    ('13', 31, 'Tectitán'),
    ('13', 32, 'Todos Santos Cuchumatán'),
    ('13', 33, 'Unión Cantinil'),
    ('14', 1, 'Canillá'),
    ('14', 2, 'Chajul'),
    ('14', 3, 'Chicamán'),
    ('14', 4, 'Chiché'),
    ('14', 5, 'Chinique'),
    ('14', 6, 'Cunén'),
    ('14', 7, 'Ixcán'),
    ('14', 8, 'Joyabaj'),
    ('14', 9, 'Nebaj'),
    ('14', 10, 'Pachalum'),
    ('14', 11, 'Patzité'),
    ('14', 12, 'Sacapulas'),
    ('14', 13, 'San Andrés Sajcabajá'),
    ('14', 14, 'San Antonio Ilotenango'),
    ('14', 15, 'San Bartolomé Jocotenango'),
    ('14', 16, 'San Juan Cotzal'),
    ('14', 17, 'San Pedro Jocopilas'),
    ('14', 18, 'Santa Cruz del Quiché'),
    ('14', 19, 'Santo Tomás Chichicastenango'),
    ('14', 20, 'Uspantán'),
    ('14', 21, 'Zacualpa'),
    ('15', 1, 'Cubulco'),
    ('15', 2, 'Granados'),
    ('15', 3, 'Purulhá'),
    ('15', 4, 'Rabinal'),
    ('15', 5, 'Salamá'),
    ('15', 6, 'San Jerónimo'),
    ('15', 7, 'San Miguel Chicaj'),
    ('15', 8, 'Santa Cruz el Chol'),
    ('16', 1, 'Chahal'),
    ('16', 2, 'Chisec'),
    ('16', 3, 'Cobán'),
    ('16', 4, 'Fray Bartolomé de las Casas'),
    ('16', 5, 'Lanquín'),
    ('16', 6, 'Panzós'),
    ('16', 7, 'Raxruhá'),
    ('16', 8, 'San Cristóbal Verapaz'),
    ('16', 9, 'San Juan Chamelco'),
    ('16', 10, 'San Pedro Carchá'),
    ('16', 11, 'Santa Catalina La Tinta'),
    ('16', 12, 'Santa Cruz Verapaz'),
    ('16', 13, 'Senahú'),
    ('16', 14, 'Tactic'),
    ('16', 15, 'Tamahú'),
    ('16', 16, 'Tucurú'),
    ('16', 17, 'Cahabón'),
    ('17', 1, 'Dolores'),
    ('17', 2, 'El Chal'),
    ('17', 3, 'Flores'),
    ('17', 4, 'La Libertad'),
    ('17', 5, 'Las Cruces'),
    ('17', 6, 'Melchor de Mencos'),
    ('17', 7, 'Poptún'),
    ('17', 8, 'San Andrés'),
    ('17', 9, 'San Benito'),
    ('17', 10, 'San Francisco'),
    ('17', 11, 'San José'),
    ('17', 12, 'San Luis'),
    ('17', 13, 'Santa Ana'),
    ('17', 14, 'Sayaxché'),
    ('18', 1, 'El Estor'),
    ('18', 2, 'Livingston'),
    ('18', 3, 'Los Amates'),
    ('18', 4, 'Morales'),
    ('18', 5, 'Puerto Barrios'),
    ('19', 1, 'Cabañas'),
    ('19', 2, 'Estanzuela'),
    ('19', 3, 'Gualán'),
    ('19', 4, 'Huité'),
    ('19', 5, 'La Unión'),
    ('19', 6, 'Río Hondo'),
    ('19', 7, 'San Diego'),
    ('19', 8, 'San Jorge'),
    ('19', 9, 'Teculután'),
    ('19', 10, 'Usumatlán'),
    ('19', 11, 'Zacapa'),
    ('20', 1, 'Camotán'),
    ('20', 2, 'Chiquimula'),
    ('20', 3, 'Concepción Las Minas'),
    ('20', 4, 'Esquipulas'),
    ('20', 5, 'Ipala'),
    ('20', 6, 'Jocotán'),
    ('20', 7, 'Olopa'),
    ('20', 8, 'Quezaltepeque'),
    ('20', 9, 'San Jacinto'),
    ('20', 10, 'San José la Arada'),
    ('20', 11, 'San Juan La Ermita'),
    ('21', 1, 'Jalapa'),
    ('21', 2, 'Mataquescuintla'),
    ('21', 3, 'Monjas'),
    ('21', 4, 'San Carlos Alzatate'),
    ('21', 5, 'San Luis Jilotepeque'),
    ('21', 6, 'San Manuel Chaparrón'),
    ('21', 7, 'San Pedro Pinula'),
    ('22', 1, 'Agua Blanca'),
    ('22', 2, 'Asunción Mita'),
    ('22', 3, 'Atescatempa'),
    ('22', 4, 'Comapa'),
    ('22', 5, 'Conguaco'),
    ('22', 6, 'El Adelanto'),
    ('22', 7, 'El Progreso'),
    ('22', 8, 'Jalpatagua'),
    ('22', 9, 'Jerez'),
    ('22', 10, 'Jutiapa'),
    ('22', 11, 'Moyuta'),
    ('22', 12, 'Pasaco'),
    ('22', 13, 'Quesada'),
    ('22', 14, 'San José Acatempa'),
    ('22', 15, 'Santa Catarina Mita'),
    ('22', 16, 'Yupiltepeque'),
    ('22', 17, 'Zapotitlán')
) as m(departamento_codigo, orden, nombre)
join public.departamento d on d.codigo = m.departamento_codigo
on conflict (departamento_id, nombre) do update
  set activo = excluded.activo,
      es_sistema = excluded.es_sistema,
      orden = excluded.orden,
      updated_at = now();


-- Estados de Producto
insert into public.estado_producto (nombre, descripcion, activo, es_sistema, orden)
values
  ('Normal', 'Producto con stock dentro de los niveles esperados.', true, true, 1),
  ('Bajo', 'Producto con stock por debajo del minimo.', true, true, 2),
  ('Critico', 'Producto con stock en nivel critico.', true, true, 3)
on conflict (nombre) do update set descripcion = excluded.descripcion, activo = excluded.activo;

-- Categorias de Receta
insert into public.catalogo_categoria_receta (codigo, nombre, descripcion, activo, es_sistema, orden)
values
  ('BEB', 'Bebidas', 'Recetas de bebidas preparadas para la venta.', true, true, 1),
  ('PT', 'Producto Terminado', 'Productos terminados listos para la venta.', true, true, 2)
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

-- Presentaciones de Receta
insert into public.catalogo_presentacion_receta (codigo, nombre, descripcion, activo, es_sistema, orden)
values
  ('TU', 'Tamaño Único', 'Presentacion estandar sin variantes de tamaño.', true, true, 1),
  ('P', 'Pequeño', 'Presentacion de tamaño pequeño.', true, true, 2),
  ('M', 'Mediano', 'Presentacion de tamaño mediano.', true, true, 3),
  ('G', 'Grande', 'Presentacion de tamaño grande.', true, true, 4)
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

-- Estados de Orden de Compra
insert into public.estado_orden_compra (codigo, nombre, descripcion, activo, es_sistema, orden)
values
  ('PEN', 'Pendiente', 'Orden creada, a la espera de recepcion.', true, true, 1),
  ('REC', 'Recibida', 'Orden recibida por completo.', true, true, 2),
  ('ANU', 'Anulada', 'Orden anulada.', true, true, 3)
on conflict (codigo) do update set nombre = excluded.nombre, descripcion = excluded.descripcion;

-- ==============================================================================

insert into public.rol (nombre, descripcion, es_sistema, orden)
values 
  ('Superusuario', 'Acceso irrestricto y de soporte técnico al sistema.', true, 1),
  ('Administrador', 'Gestión general operativa, financiera y de usuarios.', true, 2),
  ('Operario', 'Personal de planta, cajeros y encargados de producción.', true, 3)
on conflict (nombre) do nothing;

insert into public.estado_usuario (nombre, descripcion, es_sistema, orden)
values 
  ('Activo', 'Usuario habilitado para iniciar sesión.', true, 1),
  ('Inactivo', 'Acceso deshabilitado temporalmente.', true, 2),
  ('Bloqueado', 'Acceso suspendido por seguridad.', true, 3)
on conflict (nombre) do nothing;

insert into public.tipo_movimiento (codigo, nombre, descripcion, es_sistema, orden)
values 
  ('ENTRADA', 'Entrada de Inventario', 'Ingreso manual o extraordinario.', true, 1),
  ('SALIDA', 'Salida de Inventario', 'Egreso por consumo interno o venta.', true, 2),
  ('COMPRA', 'Compra a Proveedor', 'Recepción formal de insumos o bolsas.', true, 3),
  ('MERMA', 'Merma o Desperdicio', 'Hielo derretido, bolsas rotas o vencidas.', true, 4),
  ('AJUSTE_POSITIVO', 'Ajuste Físico (+)', 'Sobrante detectado en toma física.', true, 5),
  ('AJUSTE_NEGATIVO', 'Ajuste Físico (-)', 'Faltante detectado en toma física.', true, 6)
on conflict (codigo) do nothing;

insert into public.motivo_merma (codigo, nombre, es_sistema, orden)
values 
  ('DERRETIDO', 'Producto derretido', true, 1),
  ('DANADO', 'Producto dañado', true, 2),
  ('VENCIDO', 'Producto vencido', true, 3),
  ('TRASLADO', 'Pérdida durante traslado', true, 4),
  ('CONTAMINACION', 'Contaminación', true, 5),
  ('PRODUCCION', 'Error de producción', true, 6),
  ('AJUSTE', 'Ajuste de inventario', true, 7),
  ('OTRO', 'Otro', true, 8)
on conflict (codigo) do nothing;

insert into public.catalogo_categoria_inventario (codigo, nombre, descripcion, es_sistema, orden)
values 
  ('MP', 'Materia Prima', 'Insumos principales utilizados en producción de hielo.', true, 1),
  ('SUM', 'Suministros', 'Materiales de apoyo y empaques (bolsas, sellos, etc.).', true, 2),
  ('PT', 'Producto Terminado', 'Hielo procesado, bolsas y barras listas para venta.', true, 3)
on conflict (codigo) do nothing;

insert into public.unidad_compra (nombre, factor)
values 
  ('unidad', 1),
  ('ciento', 100),
  ('millar', 1000)
on conflict (nombre) do update set factor = excluded.factor;

insert into public.unidad_medida (codigo, nombre, descripcion, activo, es_sistema, orden)
values 
  ('GR', 'g', 'Gramo', true, true, 1),
  ('ML', 'ml', 'Mililitro', true, true, 2),
  ('LT', 'L', 'Litro', true, true, 3),
  ('KG', 'kg', 'Kilogramo', true, true, 4),
  ('UN', 'unidad', 'Pieza individual', true, true, 5)
on conflict (codigo) do nothing;

insert into public.metodo_pago (nombre, descripcion, es_sistema, orden)
values 
  ('Efectivo', 'Pago en billetes y monedas.', true, 1),
  ('Transferencia', 'Transferencia bancaria directa.', true, 2),
  ('Tarjeta', 'Tarjeta de débito o crédito.', true, 3)
on conflict (nombre) do nothing;

insert into public.catalogo_auditoria_estado (id, codigo, nombre, descripcion, activo, orden)
values
  (1, 'BORRADOR', 'Borrador', 'Auditoría configurada pero sin captura física iniciada', true, 1),
  (2, 'EN_CONTEO', 'En conteo', 'Captura física de existencias en progreso', true, 2),
  (3, 'EN_REVISION', 'En revisión', 'Conteo finalizado y conciliación de diferencias activa', true, 3),
  (4, 'PENDIENTE_APROBACION', 'Pendiente de aprobación', 'Diferencias registradas pendientes de autorización', true, 4),
  (5, 'CERRADA', 'Cerrada', 'Auditoría formalmente finalizada y bloqueada', true, 5),
  (6, 'CANCELADA', 'Cancelada', 'Auditoría cancelada o anulada', true, 6)
on conflict (id) do nothing;

insert into public.catalogo_auditoria_tipo_alcance (id, codigo, nombre, descripcion, activo, orden)
values
  (1, 'TODO', 'Inventario Completo', 'Conteo de todos los productos y materias primas', true, 1),
  (2, 'CATEGORIA', 'Por Categoría', 'Conteo selectivo por categorías de inventario', true, 2),
  (3, 'ESPECIFICO', 'Productos Específicos', 'Conteo dirigido a productos puntuales', true, 3)
on conflict (id) do nothing;

insert into public.config_empresa (id, nombre_empresa, nit, direccion, telefono, correo)
values (1, 'AMATI HIELO, S.A.', 'CF', 'Guatemala', '50200000000', 'info@amati.com')
on conflict (id) do nothing;

insert into public.config_impuestos (id, iva_activo, iva_porcentaje)
values (1, true, 12.00)
on conflict (id) do nothing;

insert into public.config_notificaciones (id)
values (1)
on conflict (id) do nothing;

insert into public.config_umbrales (id)
values (1)
on conflict (id) do nothing;

insert into public.sistema_backup_config (id, activo, frecuencia, hora, dia_semana, dia_mes, dias_retencion, updated_by)
values (1, true, 'diario', '23:30', 0, 1, 30, 'Sistema')
on conflict (id) do nothing;

-- ==============================================================================
-- 17. ALMACENAMIENTO (SUPABASE STORAGE BUCKETS Y POLÍTICAS)
-- ==============================================================================

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    -- 1. Buckets requeridos por AMATI HIELO
    insert into storage.buckets (id, name, public)
    values 
      ('recetas-imagenes', 'recetas-imagenes', true),
      ('entrada-inventario-documentos', 'entrada-inventario-documentos', false)
    on conflict (id) do update set public = excluded.public;

    -- 2. Políticas de acceso para recetas-imagenes (Público para optimizar Egress)
    drop policy if exists "Lectura publica recetas_imagenes" on storage.objects;
    create policy "Lectura publica recetas_imagenes"
      on storage.objects for select to public
      using (bucket_id = 'recetas-imagenes');

    drop policy if exists "Insercion service_role recetas_imagenes" on storage.objects;
    create policy "Insercion service_role recetas_imagenes"
      on storage.objects for insert to public
      with check (bucket_id = 'recetas-imagenes');

    drop policy if exists "Actualizacion recetas_imagenes" on storage.objects;
    create policy "Actualizacion recetas_imagenes"
      on storage.objects for update to public
      using (bucket_id = 'recetas-imagenes');

    -- 3. Políticas para documentos de compras e inventario
    drop policy if exists "entrada_documentos_insert_authenticated" on storage.objects;
    create policy "entrada_documentos_insert_authenticated"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'entrada-inventario-documentos');

    drop policy if exists "entrada_documentos_read_authenticated" on storage.objects;
    create policy "entrada_documentos_read_authenticated"
      on storage.objects for select to authenticated
      using (bucket_id = 'entrada-inventario-documentos');
  end if;
end $$;

-- ==============================================================================
-- FIN DEL RESPALDO INTEGRAL DDL (AMATI HIELO ERP)
-- ==============================================================================
`;

fs.writeFileSync(OUTPUT_FILE, SQL_CONTENT, 'utf8');
const gz = zlib.gzipSync(Buffer.from(SQL_CONTENT, 'utf8'));
fs.writeFileSync(OUTPUT_GZ, gz);

console.log('Compilación final exitosa:');
console.log(' - Archivo SQL:', OUTPUT_FILE, `(${fs.statSync(OUTPUT_FILE).size} bytes)`);
console.log(' - Archivo GZ:', OUTPUT_GZ, `(${fs.statSync(OUTPUT_GZ).size} bytes)`);
