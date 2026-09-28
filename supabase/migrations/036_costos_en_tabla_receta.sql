-- Desglose de costos guardados en la tabla receta.
-- Agrega subtotal_materia_prima y costos_produccion como columnas persistidas
-- para que la tabla muestre el desglose sin recalcular on-the-fly.
-- El costo_total ya existe pero ahora se mantiene sincronizado automaticamente.
-- Idempotente: se puede ejecutar cuantas veces se necesite.

-- ============ 1. Agregar columnas ============
alter table public.receta
  add column if not exists subtotal_materia_prima numeric(12,2) not null default 0,
  add column if not exists costos_produccion numeric(12,2) not null default 0;

-- ============ 2. Backfill: calcular valores para recetas existentes ============
do $$
declare
  v_receta record;
  v_subtotal numeric(12,2);
  v_costos_prod numeric(12,2);
begin
  for v_receta in select id from public.receta loop
    -- Calcular subtotal materia prima desde ingredientes
    select coalesce(sum(
      case
        when ir.contenido_total is not null and ir.contenido_total > 0 and ir.costo_unitario is not null and ir.costo_unitario > 0
          then ir.cantidad * (ir.costo_unitario / ir.contenido_total)
        else ir.cantidad * coalesce(ir.costo_unitario, 0)
      end
    ), 0)
    into v_subtotal
    from public.ingrediente_receta ir
    where ir.receta_id = v_receta.id;

    -- Costos de produccion
    select coalesce(r.costo_electricidad, 0) + coalesce(r.costo_mano_obra, 0)
         + coalesce(r.costo_agua, 0) + coalesce(r.costo_local, 0)
    into v_costos_prod
    from public.receta r
    where r.id = v_receta.id;

    -- Actualizar
    update public.receta
    set subtotal_materia_prima = v_subtotal,
        costos_produccion = v_costos_prod,
        costo_total = v_subtotal + v_costos_prod
    where id = v_receta.id;
  end loop;
end;
$$;

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
        when 'subtotal_materia_prima' then 'Suma del costo de todos los ingredientes (materia prima).'
        when 'costos_produccion' then 'Suma de costos generales de produccion (electricidad + mano de obra + agua + local).'
        when 'costo_total' then 'Costo total del producto: subtotal materia prima + costos de produccion.'
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

-- ============ 4. Comentarios ============
comment on column public.receta.subtotal_materia_prima is 'Suma del costo de todos los ingredientes de la receta (materia prima). Se actualiza automaticamente al modificar ingredientes.';
comment on column public.receta.costos_produccion is 'Suma de costos generales de produccion (electricidad + mano de obra + agua + local). Se actualiza automaticamente.';