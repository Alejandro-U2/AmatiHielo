create or replace function public.registrar_movimiento_inventario(
  p_producto_id bigint,
  p_tipo text,
  p_cantidad numeric,
  p_motivo text default null,
  p_usuario text default null
)
returns public.movimiento_inventario
language plpgsql
as $$
declare
  v_producto public.producto%rowtype;
  v_movimiento public.movimiento_inventario%rowtype;
  v_delta numeric(12,2);
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

  select *
  into v_producto
  from public.producto
  where id = p_producto_id
  for update;

  if not found then
    raise exception 'No se encontró el producto seleccionado.';
  end if;

  case btrim(p_tipo)
    when 'Entrada' then v_delta := p_cantidad;
    when 'Salida' then v_delta := -p_cantidad;
    when 'Merma' then v_delta := -p_cantidad;
    when 'Ajuste' then v_delta := p_cantidad;
    else
      raise exception 'Tipo de movimiento inválido.';
  end case;

  if v_producto.stock + v_delta < 0 then
    raise exception 'El stock no puede quedar negativo.';
  end if;

  update public.producto
  set stock = stock + v_delta,
      updated_at = now()
  where id = p_producto_id;

  insert into public.movimiento_inventario (
    producto_id,
    tipo,
    cantidad,
    motivo,
    usuario
  )
  values (
    p_producto_id,
    btrim(p_tipo),
    p_cantidad,
    nullif(btrim(coalesce(p_motivo, '')), ''),
    nullif(btrim(coalesce(p_usuario, '')), '')
  )
  returning * into v_movimiento;

  return v_movimiento;
end;
$$;