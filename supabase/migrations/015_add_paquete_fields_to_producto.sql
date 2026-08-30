alter table if exists public.producto
  add column if not exists cantidad_compra numeric(12,2),
  add column if not exists precio_paquete numeric(12,2);

update public.producto
set
  cantidad_compra = coalesce(cantidad_compra, 1),
  precio_paquete = coalesce(precio_paquete, precio_compra, costo_unitario, 0),
  costo_unitario = coalesce(
    costo_unitario,
    case
      when coalesce(cantidad_compra, 0) > 0 then coalesce(precio_paquete, precio_compra, costo_unitario, 0) / coalesce(cantidad_compra, 1)
      else coalesce(precio_paquete, precio_compra, costo_unitario, 0)
    end
  ),
  precio_compra = coalesce(
    precio_compra,
    case
      when coalesce(cantidad_compra, 0) > 0 then coalesce(precio_paquete, costo_unitario, 0) / coalesce(cantidad_compra, 1)
      else coalesce(precio_paquete, costo_unitario, 0)
    end
  )
where cantidad_compra is null
   or precio_paquete is null
   or costo_unitario is null
   or precio_compra is null;