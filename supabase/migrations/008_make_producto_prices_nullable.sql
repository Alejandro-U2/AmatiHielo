alter table if exists public.producto
  alter column costo_unitario drop not null,
  alter column precio_compra drop not null,
  alter column precio_venta drop not null;
