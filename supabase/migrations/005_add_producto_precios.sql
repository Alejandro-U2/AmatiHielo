alter table if exists public.producto
  add column if not exists precio_compra numeric(12,2) not null default 0,
  add column if not exists precio_venta numeric(12,2) not null default 0;

update public.producto
set precio_compra = coalesce(precio_compra, costo_unitario, 0),
    precio_venta = coalesce(precio_venta, 0)
where precio_compra is null
   or precio_venta is null;
