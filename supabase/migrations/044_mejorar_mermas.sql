-- Datos auditables para registrar y consultar mermas.
alter table if exists public.movimiento_inventario
  add column if not exists motivo_tipo text,
  add column if not exists fecha_movimiento date not null default current_date,
  add column if not exists costo_unitario_movimiento numeric(14,2),
  add column if not exists stock_antes numeric(12,2),
  add column if not exists stock_despues numeric(12,2),
  add column if not exists documento_path text;

drop function if exists public.registrar_movimiento_inventario(bigint, text, numeric, text, text, bigint, bigint);

create or replace function public.registrar_movimiento_inventario(
  p_producto_id bigint,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text default null,
  p_usuario text default null,
  p_unidad_compra_id bigint default null,
  p_proveedor_id bigint default null,
  p_motivo_tipo text default null,
  p_fecha date default current_date,
  p_documento_path text default null
)
returns public.movimiento_inventario
language plpgsql
as $$
declare
  v_producto public.producto%rowtype;
  v_movimiento public.movimiento_inventario%rowtype;
  v_delta numeric(12,2);
  v_factor numeric(12,2) := 1;
  v_cantidad_base numeric(12,2);
  v_stock_antes numeric(12,2);
begin
  if p_producto_id is null or p_tipo is null or btrim(p_tipo) = '' or p_cantidad is null or p_cantidad <= 0 then
    raise exception 'Producto, tipo y cantidad valida son obligatorios.';
  end if;
  if p_tipo = 'Entrada' and p_proveedor_id is null then
    raise exception 'El proveedor es obligatorio para una Entrada.';
  end if;
  if p_tipo = 'Merma' and nullif(btrim(p_motivo_tipo), '') is null then
    raise exception 'El motivo de la merma es obligatorio.';
  end if;
  if p_proveedor_id is not null and not exists (select 1 from public.proveedor where id = p_proveedor_id and activo) then
    raise exception 'El proveedor seleccionado no existe o esta inactivo.';
  end if;
  if p_unidad_compra_id is not null then
    select factor into v_factor from public.unidad_compra where id = p_unidad_compra_id;
    if v_factor is null then raise exception 'La unidad de compra seleccionada no existe.'; end if;
  end if;
  v_cantidad_base := p_cantidad * v_factor;
  select * into v_producto from public.producto where id = p_producto_id for update;
  if not found then raise exception 'No se encontro el producto seleccionado.'; end if;
  v_stock_antes := v_producto.stock;
  case btrim(p_tipo)
    when 'Entrada' then v_delta := v_cantidad_base;
    when 'Salida', 'Merma' then v_delta := -v_cantidad_base;
    when 'Ajuste' then v_delta := v_cantidad_base;
    else raise exception 'Tipo de movimiento invalido.';
  end case;
  if v_stock_antes + v_delta < 0 then raise exception 'El stock no puede quedar negativo.'; end if;
  update public.producto set stock = stock + v_delta, updated_at = now() where id = p_producto_id;
  insert into public.movimiento_inventario (
    producto_id, proveedor_id, tipo, cantidad, cantidad_compra, unidad_compra_id,
    motivo, usuario, motivo_tipo, fecha_movimiento, costo_unitario_movimiento,
    stock_antes, stock_despues, documento_path
  )
  values (
    p_producto_id, p_proveedor_id, btrim(p_tipo), v_cantidad_base, p_cantidad,
    p_unidad_compra_id, nullif(btrim(coalesce(p_motivo, '')), ''),
    nullif(btrim(coalesce(p_usuario, '')), ''), nullif(btrim(p_motivo_tipo), ''),
    coalesce(p_fecha, current_date), coalesce(v_producto.precio_compra, v_producto.costo_unitario, 0),
    v_stock_antes, v_stock_antes + v_delta, p_documento_path
  )
  returning * into v_movimiento;
  return v_movimiento;
end;
$$;
