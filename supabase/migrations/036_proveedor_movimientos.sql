-- Vincula las entradas de inventario con el proveedor que abastecio la compra.
alter table if exists public.movimiento_inventario
  add column if not exists proveedor_id bigint references public.proveedor(id);

create index if not exists idx_movimiento_inventario_proveedor_id
  on public.movimiento_inventario(proveedor_id);

drop function if exists public.registrar_movimiento_inventario(bigint, text, numeric, text, text, bigint);

create or replace function public.registrar_movimiento_inventario(
  p_producto_id bigint,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text default null,
  p_usuario text default null,
  p_unidad_compra_id bigint default null,
  p_proveedor_id bigint default null
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
begin
  if p_producto_id is null then
    raise exception 'El producto es obligatorio.';
  end if;
  if p_tipo is null or btrim(p_tipo) = '' then
    raise exception 'El tipo de movimiento es obligatorio.';
  end if;
  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'La cantidad debe ser mayor a 0.';
  end if;
  if p_proveedor_id is not null and not exists (
    select 1 from public.proveedor where id = p_proveedor_id and activo = true
  ) then
    raise exception 'El proveedor seleccionado no existe o esta inactivo.';
  end if;
  if p_unidad_compra_id is not null then
    select factor into v_factor from public.unidad_compra where id = p_unidad_compra_id;
    if v_factor is null then
      raise exception 'La unidad de compra seleccionada no existe.';
    end if;
  end if;

  v_cantidad_base := p_cantidad * v_factor;
  select * into v_producto from public.producto where id = p_producto_id for update;
  if not found then
    raise exception 'No se encontro el producto seleccionado.';
  end if;

  case btrim(p_tipo)
    when 'Entrada' then v_delta := v_cantidad_base;
    when 'Salida' then v_delta := -v_cantidad_base;
    when 'Merma' then v_delta := -v_cantidad_base;
    when 'Ajuste' then v_delta := v_cantidad_base;
    else raise exception 'Tipo de movimiento invalido.';
  end case;

  if v_producto.stock + v_delta < 0 then
    raise exception 'El stock no puede quedar negativo.';
  end if;

  update public.producto
  set stock = stock + v_delta, updated_at = now()
  where id = p_producto_id;

  insert into public.movimiento_inventario (
    producto_id, proveedor_id, tipo, cantidad, cantidad_compra,
    unidad_compra_id, motivo, usuario
  )
  values (
    p_producto_id, p_proveedor_id, btrim(p_tipo), v_cantidad_base, p_cantidad,
    p_unidad_compra_id, nullif(btrim(coalesce(p_motivo, '')), ''),
    nullif(btrim(coalesce(p_usuario, '')), '')
  )
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;
