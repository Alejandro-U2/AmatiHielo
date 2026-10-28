import fs from 'fs';

const filePath = 'scripts/compile_final_complete_schema.js';
let content = fs.readFileSync(filePath, 'utf8').split('\r\n').join('\n');

const oldRpc = `-- Registrar entrada por compra
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
$$;`;

const newRpc = `-- Registrar entrada por compra (soporta proveedor opcional y confirmacion)
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
as $$
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
$$;`;

if (content.includes(oldRpc)) {
  content = content.replace(oldRpc, newRpc);
  console.log('Replaced old registrar_entrada_inventario with modern optional proveedor version!');
} else {
  console.error('Could not find oldRpc');
}

fs.writeFileSync(filePath, content, 'utf8');
