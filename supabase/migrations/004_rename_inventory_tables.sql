do $$
begin
  if to_regclass('public.productos') is not null and to_regclass('public.producto') is null then
    alter table public.productos rename to producto;
  end if;

  if to_regclass('public.movimientos_inventario') is not null and to_regclass('public.movimiento_inventario') is null then
    alter table public.movimientos_inventario rename to movimiento_inventario;
  end if;

  if to_regclass('public.movimiento_inventario') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'movimiento_inventario'
        and column_name = 'product_id'
    ) then
      alter table public.movimiento_inventario rename column product_id to producto_id;
    end if;
  end if;
end $$;

alter table if exists public.movimiento_inventario
  drop constraint if exists movimientos_inventario_product_id_fkey;

alter table if exists public.movimiento_inventario
  add constraint movimiento_inventario_producto_id_fkey
  foreign key (producto_id)
  references public.producto (id)
  on delete cascade;

alter index if exists public.idx_movimientos_inventario_product_id rename to idx_movimiento_inventario_producto_id;
alter index if exists public.idx_movimientos_inventario_created_at rename to idx_movimiento_inventario_created_at;
alter index if exists public.idx_productos_categoria rename to idx_producto_categoria;
alter index if exists public.idx_productos_estado rename to idx_producto_estado;
