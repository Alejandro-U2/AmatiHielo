-- Costos de produccion en recetas y costo prorrateado de ingredientes.
-- Agrega costos generales de produccion (electricidad, mano de obra, agua, local)
-- asociados a cada receta, y un campo contenido_total para prorratear el costo
-- de los ingredientes (ej: frasco de esencia Q5.00 / 100ml, una receta usa 10ml -> Q0.50).
-- Idempotente: se puede ejecutar cuantas veces se necesite.

-- ============ 1. receta: costos de produccion ============
alter table public.receta
  add column if not exists costo_electricidad numeric(12,2) not null default 0,
  add column if not exists costo_mano_obra numeric(12,2) not null default 0,
  add column if not exists costo_agua numeric(12,2) not null default 0,
  add column if not exists costo_local numeric(12,2) not null default 0;

-- ============ 2. ingrediente_receta: contenido total para prorrateo ============
alter table public.ingrediente_receta
  add column if not exists contenido_total numeric(12,2);

-- ============ 3. Refresca el diccionario de datos de receta ============
do $$
declare
  v_tabla_id bigint;
begin
  select id into v_tabla_id
  from public.tabla_estructura
  where nombre_interno = 'receta';

  if v_tabla_id is not null then
    delete from public.campo_estructura
    where tabla_id = v_tabla_id;

    insert into public.campo_estructura (
      tabla_id,
      nombre,
      tipo_dato,
      descripcion,
      requerido,
      unico,
      orden
    )
    select
      v_tabla_id,
      c.column_name,
      c.data_type,
      case c.column_name
        when 'id' then 'Identificador unico de la receta.'
        when 'codigo' then 'Codigo unico de la receta.'
        when 'nombre' then 'Nombre del producto terminado.'
        when 'categoria' then 'Categoria a la que pertenece la receta.'
        when 'presentacion' then 'Presentacion o tamano del producto.'
        when 'costo_electricidad' then 'Costo de produccion por electricidad.'
        when 'costo_mano_obra' then 'Costo de produccion por mano de obra.'
        when 'costo_agua' then 'Costo de produccion por agua.'
        when 'costo_local' then 'Costo de produccion por uso del local.'
        when 'costo_total' then 'Costo total del producto (materia prima + costos de produccion).'
        when 'precio_sugerido' then 'Precio de venta sugerido o establecido del producto.'
        when 'created_at' then 'Fecha y hora de creacion del registro.'
        when 'updated_at' then 'Fecha y hora de ultima actualizacion del registro.'
        else null
      end,
      c.is_nullable = 'NO',
      c.column_name in ('id', 'codigo', 'nombre'),
      c.ordinal_position
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'receta'
    order by c.ordinal_position;
  end if;
end;
$$;

-- ============ 4. Refresca el diccionario de datos de ingrediente_receta ============
do $$
declare
  v_tabla_id bigint;
begin
  select id into v_tabla_id
  from public.tabla_estructura
  where nombre_interno = 'ingrediente_receta';

  if v_tabla_id is not null then
    delete from public.campo_estructura
    where tabla_id = v_tabla_id;

    insert into public.campo_estructura (
      tabla_id,
      nombre,
      tipo_dato,
      descripcion,
      requerido,
      unico,
      orden
    )
    select
      v_tabla_id,
      c.column_name,
      c.data_type,
      case c.column_name
        when 'id' then 'Identificador unico del ingrediente de la receta.'
        when 'receta_id' then 'Receta a la que pertenece el ingrediente.'
        when 'producto_id' then 'Producto de inventario vinculado al ingrediente (opcional).'
        when 'nombre' then 'Nombre del ingrediente o material.'
        when 'cantidad' then 'Cantidad utilizada en la receta.'
        when 'unidad' then 'Unidad de medida de la cantidad (g, ml, L, kg, unidad, docena).'
        when 'contenido_total' then 'Contenido total del envase (en la unidad de la receta) para prorratear el costo.'
        when 'costo_unitario' then 'Costo de adquisicion del envase o del costo por unidad base.'
        when 'created_at' then 'Fecha y hora de creacion del registro.'
        else null
      end,
      c.is_nullable = 'NO',
      c.column_name in ('id', 'receta_id'),
      c.ordinal_position
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = 'ingrediente_receta'
    order by c.ordinal_position;
  end if;
end;
$$;

-- ============ 5. Comentarios sobre las nuevas columnas ============
comment on column public.receta.costo_electricidad is 'Costo de produccion por electricidad.';
comment on column public.receta.costo_mano_obra is 'Costo de produccion por mano de obra.';
comment on column public.receta.costo_agua is 'Costo de produccion por agua.';
comment on column public.receta.costo_local is 'Costo de produccion por uso del local.';
comment on column public.ingrediente_receta.contenido_total is 'Contenido total del envase en la unidad de la receta; permite prorratear el costo por cantidad usada.';